# NSRDB India fetch

`fetch_nsrdb.py` pulls 10 years of NSRDB India PSM v3 (Meteosat IODC, 4 km, 1-hour) for each city in its `CITIES` registry and emits `src/data/irradiance/cities.json` in the shape the SolarCalc app expects.

## Setup

```bash
pip install requests
export NREL_API_KEY=...    # https://developer.nrel.gov/signup/
export NREL_EMAIL=you@example.com
```

## Run

```bash
# Single city
python scripts/fetch_nsrdb.py --cities Delhi

# Multiple
python scripts/fetch_nsrdb.py --cities Delhi,Mumbai,Bengaluru

# Everything in CITIES
python scripts/fetch_nsrdb.py --all
```

Existing entries in `cities.json` are preserved; only the cities you pass are refreshed.

## Quota

The free NREL key is rate-limited (~1000 calls/day, ~20/min). Each city × year is one call, so a full 24-city × 10-year run is 240 calls plus a 3 s courtesy delay between requests — about 12-15 min of wall time. Run overnight if you expand to 200 cities.

## Starter dataset

The repo ships a hand-seeded `cities.json` (`source.dataset = "starter-seed"` per record) with realistic monthly GHI for 12-24 cities so the app boots without a key. Re-running this script overwrites those entries with real NSRDB data.
