import { INDIA_BBOX, loadCities } from '@/data/irradiance';
import type { IrradianceRecord } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Coerce UI / persisted lat,lng (numbers or numeric strings) into a finite pair.
 * Invalid combinations return null so Leaflet never receives NaN.
 */
export function parseFiniteLatLng(
  lat: unknown,
  lng: unknown
): [number, number] | null {
  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const la = toNum(lat);
  const ln = toNum(lng);
  if (la === null || ln === null) return null;
  return [la, ln];
}

/** Great-circle distance in km using the standard haversine formula. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Coarse "is this in India?" check using the continental bounding box. The
 * box admits some bordering territory (Bangladesh, Sri Lanka, parts of
 * Pakistan/Nepal) but is fine for a POC; the lookup falls back to the
 * `maxDistanceKm` guard in `snapToNearestCity` to reject far pins.
 */
export function isInIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BBOX.minLat &&
    lat <= INDIA_BBOX.maxLat &&
    lng >= INDIA_BBOX.minLng &&
    lng <= INDIA_BBOX.maxLng
  );
}

export type SnapResult = {
  record: IrradianceRecord;
  distanceKm: number;
};

/**
 * Find the nearest precomputed cell to `(lat, lng)` and return it plus the
 * great-circle distance. Returns `null` if no cell is within `maxDistanceKm`
 * — typically when the user pinned outside India entirely.
 */
export function snapToNearestCity(
  lat: number,
  lng: number,
  maxDistanceKm = 350
): SnapResult | null {
  const cities = loadCities();
  if (cities.length === 0) return null;

  let best: IrradianceRecord = cities[0];
  let bestKm = haversineKm(lat, lng, best.lat, best.lng);
  for (let i = 1; i < cities.length; i++) {
    const c = cities[i];
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestKm) {
      best = c;
      bestKm = d;
    }
  }
  if (bestKm > maxDistanceKm) return null;
  return { record: best, distanceKm: bestKm };
}

/** Direct city-id lookup; useful for the city combobox. */
export function findCityById(id: string): IrradianceRecord | null {
  return loadCities().find((c) => c.id === id) ?? null;
}

export function listCities(): IrradianceRecord[] {
  return loadCities();
}
