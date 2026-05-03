#!/usr/bin/env python3
"""
NSRDB India irradiance fetcher → cities.json

Calls NREL's NSRDB India PSM v3 endpoint for each city in CITIES, pulls
10 years of TMY-style data, aggregates monthly + daily climatology, and
emits the JSON shape the SolarCalc app consumes.

Usage:
    NREL_API_KEY=... NREL_EMAIL=you@example.com \
        python scripts/fetch_nsrdb.py [--cities Delhi,Mumbai] [--all]

Notes:
- The free NREL key is rate-limited (1000/day, ~20/min). The script is
  intentionally serial to stay polite; expect ~5 min per city.
- Outputs to src/data/irradiance/cities.json (overwrites). The repo
  ships a small hand-seeded starter file so the app boots without a key.
- We pull GHI, DNI, DHI, ambient temp at 60-min resolution. The full
  15-min PSM is overkill for monthly aggregates and uses 4× the quota.
- Tested against PSM v3 (Meteosat IODC). Years 2014-2023 give 10 yr
  variance bands.

This script is run out-of-band; it is NOT imported by the app.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

try:
    import requests  # type: ignore
except ImportError:
    sys.stderr.write(
        "requests is required: pip install requests\n"
    )
    raise


# ---------------------------------------------------------------------------
# City registry (extend freely; aim for top-200 populated regions of India).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class City:
    id: str
    name: str
    state: str
    lat: float
    lng: float
    elevation_m: int
    climate_zone: str  # NBC India zones


CITIES: list[City] = [
    City("delhi", "Delhi", "Delhi", 28.6139, 77.2090, 216, "composite"),
    City("mumbai", "Mumbai", "Maharashtra", 19.0760, 72.8777, 14, "warm-humid"),
    City("bengaluru", "Bengaluru", "Karnataka", 12.9716, 77.5946, 920, "temperate"),
    City("chennai", "Chennai", "Tamil Nadu", 13.0827, 80.2707, 6, "warm-humid"),
    City("hyderabad", "Hyderabad", "Telangana", 17.3850, 78.4867, 542, "composite"),
    City("kolkata", "Kolkata", "West Bengal", 22.5726, 88.3639, 9, "warm-humid"),
    City("pune", "Pune", "Maharashtra", 18.5204, 73.8567, 560, "warm-humid"),
    City("ahmedabad", "Ahmedabad", "Gujarat", 23.0225, 72.5714, 53, "hot-dry"),
    City("jaipur", "Jaipur", "Rajasthan", 26.9124, 75.7873, 431, "hot-dry"),
    City("lucknow", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462, 123, "composite"),
    City("bhopal", "Bhopal", "Madhya Pradesh", 23.2599, 77.4126, 527, "composite"),
    City("trivandrum", "Trivandrum", "Kerala", 8.5241, 76.9366, 10, "warm-humid"),
    # --- expand here for production runs ---
    City("jodhpur", "Jodhpur", "Rajasthan", 26.2389, 73.0243, 231, "hot-dry"),
    City("surat", "Surat", "Gujarat", 21.1702, 72.8311, 13, "warm-humid"),
    City("nagpur", "Nagpur", "Maharashtra", 21.1458, 79.0882, 310, "composite"),
    City("indore", "Indore", "Madhya Pradesh", 22.7196, 75.8577, 553, "composite"),
    City("patna", "Patna", "Bihar", 25.5941, 85.1376, 53, "composite"),
    City("guwahati", "Guwahati", "Assam", 26.1445, 91.7362, 55, "warm-humid"),
    City("chandigarh", "Chandigarh", "Chandigarh", 30.7333, 76.7794, 321, "composite"),
    City("kochi", "Kochi", "Kerala", 9.9312, 76.2673, 7, "warm-humid"),
    City("visakhapatnam", "Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185, 45, "warm-humid"),
    City("coimbatore", "Coimbatore", "Tamil Nadu", 11.0168, 76.9558, 411, "warm-humid"),
    City("leh", "Leh", "Ladakh", 34.1526, 77.5770, 3500, "cold"),
    City("shimla", "Shimla", "Himachal Pradesh", 31.1048, 77.1734, 2276, "cold"),
]


# ---------------------------------------------------------------------------
# NREL NSRDB India PSM v3 download URL
# ---------------------------------------------------------------------------

NSRDB_URL = (
    "https://developer.nrel.gov/api/nsrdb/v2/solar/india-data-download.csv"
)
ATTRIBUTES = "ghi,dni,dhi,air_temperature,wind_speed"
INTERVAL = "60"  # minutes
DEFAULT_YEARS = list(range(2014, 2024))  # 10 yrs


def fetch_year(api_key: str, email: str, lat: float, lng: float, year: int) -> str:
    """Pull one year of CSV for one cell. Raises on HTTP error."""
    params = {
        "api_key": api_key,
        "email": email,
        "wkt": f"POINT({lng} {lat})",
        "names": str(year),
        "attributes": ATTRIBUTES,
        "interval": INTERVAL,
        "leap_day": "false",
        "utc": "false",
    }
    r = requests.get(NSRDB_URL, params=params, timeout=120)
    r.raise_for_status()
    return r.text


def parse_csv(csv_text: str) -> list[dict[str, float]]:
    """Skip the 2-line metadata header, return list of hourly rows."""
    lines = csv_text.splitlines()
    if len(lines) < 4:
        raise ValueError("NSRDB CSV too short — likely a quota or auth error")
    body = "\n".join(lines[2:])
    reader = csv.DictReader(io.StringIO(body))
    rows: list[dict[str, float]] = []
    for raw in reader:
        try:
            rows.append({
                "year": float(raw["Year"]),
                "month": float(raw["Month"]),
                "day": float(raw["Day"]),
                "hour": float(raw["Hour"]),
                "ghi": float(raw["GHI"]),
                "dni": float(raw["DNI"]),
                "dhi": float(raw["DHI"]),
                "tamb": float(raw["Temperature"]),
            })
        except (KeyError, ValueError):
            continue
    return rows


def aggregate(rows_by_year: dict[int, list[dict[str, float]]]) -> dict:
    """Reduce hourly rows into the IrradianceRecord shape."""
    monthly_ghi_by_year: list[list[float]] = []  # [year][month] kWh/m²/day mean
    monthly_dni_by_year: list[list[float]] = []
    monthly_dhi_by_year: list[list[float]] = []
    monthly_tamb_by_year: list[list[float]] = []
    daily_typical: list[list[float]] = [[] for _ in range(365)]

    for _yr, rows in rows_by_year.items():
        # Group by month and DOY
        ghi_by_month: list[list[float]] = [[] for _ in range(12)]
        dni_by_month: list[list[float]] = [[] for _ in range(12)]
        dhi_by_month: list[list[float]] = [[] for _ in range(12)]
        tamb_by_month: list[list[float]] = [[] for _ in range(12)]
        ghi_by_doy: list[list[float]] = [[] for _ in range(365)]

        # Collapse hourly W/m² → daily kWh/m² (sum / 1000) per (month, day-of-year)
        # then average per month and per DOY.
        by_day: dict[tuple[int, int, int], dict[str, list[float]]] = {}
        for r in rows:
            key = (int(r["year"]), int(r["month"]), int(r["day"]))
            d = by_day.setdefault(key, {"ghi": [], "dni": [], "dhi": [], "tamb": []})
            d["ghi"].append(r["ghi"])
            d["dni"].append(r["dni"])
            d["dhi"].append(r["dhi"])
            d["tamb"].append(r["tamb"])

        for (yr, mo, dy), bag in by_day.items():
            day_ghi = sum(bag["ghi"]) / 1000.0  # W/m² × 1h hours / 1000 = kWh/m²
            day_dni = sum(bag["dni"]) / 1000.0
            day_dhi = sum(bag["dhi"]) / 1000.0
            day_tamb = sum(bag["tamb"]) / max(1, len(bag["tamb"]))
            ghi_by_month[mo - 1].append(day_ghi)
            dni_by_month[mo - 1].append(day_dni)
            dhi_by_month[mo - 1].append(day_dhi)
            tamb_by_month[mo - 1].append(day_tamb)
            try:
                doy = datetime(yr, mo, dy).timetuple().tm_yday - 1
                if 0 <= doy < 365:
                    ghi_by_doy[doy].append(day_ghi)
            except ValueError:
                continue

        monthly_ghi_by_year.append([
            (sum(v) / len(v)) if v else 0.0 for v in ghi_by_month
        ])
        monthly_dni_by_year.append([
            (sum(v) / len(v)) if v else 0.0 for v in dni_by_month
        ])
        monthly_dhi_by_year.append([
            (sum(v) / len(v)) if v else 0.0 for v in dhi_by_month
        ])
        monthly_tamb_by_year.append([
            (sum(v) / len(v)) if v else 0.0 for v in tamb_by_month
        ])
        for doy in range(365):
            if ghi_by_doy[doy]:
                daily_typical[doy].append(sum(ghi_by_doy[doy]) / len(ghi_by_doy[doy]))

    def mean(xs: Iterable[float]) -> float:
        xs = list(xs)
        return sum(xs) / len(xs) if xs else 0.0

    def stdev(xs: Iterable[float]) -> float:
        xs = list(xs)
        if len(xs) < 2:
            return 0.0
        m = sum(xs) / len(xs)
        return (sum((x - m) ** 2 for x in xs) / (len(xs) - 1)) ** 0.5

    monthly_ghi = [mean(monthly_ghi_by_year[y][m] for y in range(len(monthly_ghi_by_year))) for m in range(12)]
    monthly_dni = [mean(monthly_dni_by_year[y][m] for y in range(len(monthly_dni_by_year))) for m in range(12)]
    monthly_dhi = [mean(monthly_dhi_by_year[y][m] for y in range(len(monthly_dhi_by_year))) for m in range(12)]
    monthly_tamb = [mean(monthly_tamb_by_year[y][m] for y in range(len(monthly_tamb_by_year))) for m in range(12)]
    monthly_stdev = [stdev(monthly_ghi_by_year[y][m] for y in range(len(monthly_ghi_by_year))) for m in range(12)]
    daily = [mean(daily_typical[d]) for d in range(365)]

    annual_by_year = [
        sum(year_months[m] * days_in_month(m + 1) for m in range(12))
        for year_months in monthly_ghi_by_year
    ]
    annual_mean = mean(annual_by_year)
    annual_std = stdev(annual_by_year)
    sorted_annual = sorted(annual_by_year)

    def percentile(p: float) -> float:
        if not sorted_annual:
            return 0.0
        idx = max(0, min(len(sorted_annual) - 1, int(round(p * (len(sorted_annual) - 1)))))
        return sorted_annual[idx]

    return {
        "monthly": {
            "ghi": [round(v, 2) for v in monthly_ghi],
            "dni": [round(v, 2) for v in monthly_dni],
            "dhi": [round(v, 2) for v in monthly_dhi],
            "tAmbC": [round(v, 1) for v in monthly_tamb],
            "stdev": [round(v, 3) for v in monthly_stdev],
        },
        "daily_typical_year": [round(v, 3) for v in daily],
        "annual": {
            "ghi": round(annual_mean, 1),
            "stdev": round(annual_std, 2),
            "p10": round(percentile(0.10), 1),
            "p90": round(percentile(0.90), 1),
        },
    }


def days_in_month(m: int) -> int:
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]


def fetch_city(api_key: str, email: str, city: City, years: list[int]) -> dict:
    rows_by_year: dict[int, list[dict[str, float]]] = {}
    for year in years:
        sys.stderr.write(f"  {city.name} {year}…\n")
        csv_text = fetch_year(api_key, email, city.lat, city.lng, year)
        rows_by_year[year] = parse_csv(csv_text)
        time.sleep(3)  # courtesy delay
    agg = aggregate(rows_by_year)
    return {
        "id": city.id,
        "name": city.name,
        "state": city.state,
        "lat": city.lat,
        "lng": city.lng,
        "elevation_m": city.elevation_m,
        "climate_zone": city.climate_zone,
        **agg,
        "source": {
            "dataset": "NSRDB India PSM v3 (Meteosat IODC)",
            "resolution_km": 4,
            "years": [years[0], years[-1]],
            "retrieved_at": datetime.utcnow().strftime("%Y-%m-%d"),
        },
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cities", help="Comma-separated list of city names")
    p.add_argument("--all", action="store_true", help="Fetch every city in CITIES")
    p.add_argument("--out", default="src/data/irradiance/cities.json")
    p.add_argument(
        "--years",
        default=",".join(str(y) for y in DEFAULT_YEARS),
        help="Comma-separated years (default 2014-2023)",
    )
    args = p.parse_args()

    api_key = os.environ.get("NREL_API_KEY")
    email = os.environ.get("NREL_EMAIL")
    if not api_key or not email:
        sys.stderr.write("NREL_API_KEY and NREL_EMAIL env vars required.\n")
        return 1

    if args.all:
        targets = list(CITIES)
    elif args.cities:
        wanted = {c.strip().lower() for c in args.cities.split(",")}
        targets = [c for c in CITIES if c.name.lower() in wanted or c.id in wanted]
    else:
        sys.stderr.write("Pass --all or --cities.\n")
        return 1

    if not targets:
        sys.stderr.write("No cities matched.\n")
        return 1

    years = [int(y) for y in args.years.split(",")]

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    existing = {}
    if out_path.exists():
        try:
            with out_path.open() as f:
                existing = {c["id"]: c for c in json.load(f)["cities"]}
        except Exception:
            existing = {}

    for city in targets:
        sys.stderr.write(f"→ {city.name}\n")
        try:
            existing[city.id] = fetch_city(api_key, email, city, years)
        except Exception as e:
            sys.stderr.write(f"  ! {city.name}: {e}\n")
            continue

    payload = {
        "cities": list(existing.values()),
        "source": {
            "dataset": "NSRDB India PSM v3 (Meteosat IODC)",
            "resolution_km": 4,
            "years": [years[0], years[-1]],
            "retrieved_at": datetime.utcnow().strftime("%Y-%m-%d"),
        },
    }
    with out_path.open("w") as f:
        json.dump(payload, f, indent=2)
    sys.stderr.write(f"Wrote {len(existing)} cities to {out_path}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
