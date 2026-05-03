/**
 * Typed loader around the precomputed NSRDB India dataset.
 *
 * Cities live in cities.json — either the hand-seeded starter or whatever
 * scripts/fetch_nsrdb.py last produced. Consumers should always go through
 * the lookup module so synthesis of any missing daily climatology happens
 * once.
 */
import bundle from './cities.json';
import type { IrradianceBundle, IrradianceRecord } from '@/types';

const RAW = bundle as IrradianceBundle;

/** India's continental land bounding box (with a generous offshore buffer). */
export const INDIA_BBOX = {
  minLat: 6.5,
  maxLat: 37.6,
  minLng: 68.0,
  maxLng: 97.5,
} as const;

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Synthesise a smooth 365-day climatology from monthly means. We blend each
 * day with its neighbours so charts don't show step jumps; close enough for
 * a typical-year display, and overwritten the moment the real script runs.
 */
function synthesizeDailyTypicalYear(monthlyGHI: number[]): number[] {
  const out: number[] = new Array(365);
  // Place each monthly mean at the middle day of its month, then linearly
  // interpolate. December wraps back to January so the curve is continuous.
  const anchorDOY: number[] = [];
  let acc = 0;
  for (let m = 0; m < 12; m++) {
    anchorDOY.push(acc + Math.floor(MONTH_DAYS[m] / 2));
    acc += MONTH_DAYS[m];
  }
  for (let doy = 0; doy < 365; doy++) {
    let lo = 11;
    while (lo >= 0 && anchorDOY[lo] > doy) lo--;
    const hi = (lo + 1) % 12;
    const loDOY = lo < 0 ? anchorDOY[11] - 365 : anchorDOY[lo];
    const hiDOY = hi === 0 && lo === 11 ? anchorDOY[0] + 365 : anchorDOY[hi];
    const t = (doy - loDOY) / Math.max(1, hiDOY - loDOY);
    const v0 = monthlyGHI[lo < 0 ? 11 : lo];
    const v1 = monthlyGHI[hi];
    out[doy] = Math.max(0, v0 + (v1 - v0) * t);
  }
  return out;
}

let normalised: IrradianceRecord[] | null = null;

export function loadCities(): IrradianceRecord[] {
  if (normalised) return normalised;
  normalised = RAW.cities.map((c) => ({
    ...c,
    daily_typical_year:
      c.daily_typical_year ?? synthesizeDailyTypicalYear(c.monthly.ghi),
  }));
  return normalised;
}

export function bundleProvenance() {
  return RAW.source;
}
