/**
 * `simulateYield` — the public PV yield engine.
 *
 * Inputs: a snapped IrradianceRecord plus the user-chosen ScenarioLocation
 * (tilt/azimuth/soiling/albedo). Outputs: monthly GHI/POA/AC, the falling-
 * staircase loss waterfall, an implied CUF, and source provenance.
 *
 * Loss chain (multiplicative on POA):
 *   POA → soiling → DC cabling → mismatch → temperature derate → inverter → availability
 */

import type {
  IrradianceRecord,
  LossWaterfallStep,
  ScenarioLocation,
  YieldInput,
  YieldResult,
} from '@/types';
import { SOILING_DERATE_PCT } from '@/types';
import { haversineKm, snapToNearestCity } from './lookup';
import {
  cellTemperatureC,
  liuJordanMonthlyPOA,
  SOLAR_CONSTANTS,
  temperatureDerate,
} from './solar';

const { MONTH_DAYS } = SOLAR_CONSTANTS;
const HOURS_PER_YEAR = 8760;

/** Default annualised loss assumptions for an Indian rooftop install. */
export const DEFAULT_LOSSES = {
  dcLossPct: 2.0,
  mismatchPct: 1.5,
  inverterEffPct: 97.0,
  availabilityPct: 99.0,
};

/**
 * Resolve a snapped IrradianceRecord for a location. Convenience wrapper
 * over `snapToNearestCity` so callers can pass just `(lat, lng)`.
 */
export function resolveRecordForLocation(
  location: ScenarioLocation
): { record: IrradianceRecord; distanceKm: number } | null {
  return snapToNearestCity(location.lat, location.lng);
}

export function simulateYield(input: YieldInput): YieldResult {
  const { location, record } = input;
  const losses = { ...DEFAULT_LOSSES, ...(input.losses ?? {}) };
  const soilingPct = losses.soilingPct ?? SOILING_DERATE_PCT[location.soilingEnv];
  const gamma = input.tempCoefficientPctPerC ?? -0.35;

  const monthlyGHI = record.monthly.ghi.slice();
  const monthlyPOA = new Array<number>(12);
  const monthlyACkWhPerKWp = new Array<number>(12);

  // Multiplicative chain factors that don't vary by month.
  const fSoiling = 1 - soilingPct / 100;
  const fDC = 1 - losses.dcLossPct / 100;
  const fMismatch = 1 - losses.mismatchPct / 100;
  const fInverter = losses.inverterEffPct / 100;
  const fAvail = losses.availabilityPct / 100;
  // 1 kWp at STC produces 1 kWh per kWh/m² of POA — that's the definition
  // of specific yield. We then chain the loss factors and the temperature-
  // dependent factor (which DOES vary month-to-month).

  let annualPOA = 0;
  let annualAC = 0;

  for (let m = 0; m < 12; m++) {
    const poaComponents = liuJordanMonthlyPOA(
      monthlyGHI[m],
      record.lat,
      location.tiltDeg,
      location.azimuthDeg,
      location.albedo,
      m
    );
    const poaDay = poaComponents.poa; // kWh/m²/day
    monthlyPOA[m] = poaDay;
    annualPOA += poaDay * MONTH_DAYS[m];

    // Average POA → effective midday irradiance for cell-temperature calc.
    // Use an effective W/m² that integrates to the daily total over ~5
    // sun-hours (a reasonable POC approximation for India): G ≈ POA*1000/5.
    const effW_M2 = (poaDay * 1000) / 5;
    const cellT = cellTemperatureC(record.monthly.tAmbC[m], effW_M2);
    const fTemp = temperatureDerate(cellT, gamma);

    const acPerDay =
      poaDay * fSoiling * fDC * fMismatch * fTemp * fInverter * fAvail;
    monthlyACkWhPerKWp[m] = acPerDay * MONTH_DAYS[m];
    annualAC += monthlyACkWhPerKWp[m];
  }

  const annualGHI = record.monthly.ghi.reduce(
    (s, v, m) => s + v * MONTH_DAYS[m],
    0
  );
  const annualSpecificYield = annualAC; // kWh/kWp/yr
  const dailyTypicalYear =
    record.daily_typical_year ?? synthDaily(record.monthly.ghi);

  // Loss waterfall: each step is the cumulative kWh/kWp/yr after that loss.
  // Step 0 is the ideal "GHI on an ideal panel" baseline (no transposition,
  // no losses) so the user can see the gap between flat GHI and the AC
  // output their panel actually produces.
  const stepGHI = annualGHI; // kWh/m²/yr ≡ kWh/kWp/yr at STC
  const stepPOA = annualPOA;
  const stepSoiling = stepPOA * fSoiling;
  const stepDC = stepSoiling * fDC;
  const stepMismatch = stepDC * fMismatch;
  // Aggregate the temperature derate as the implied annual factor:
  const fTempAnnual = annualPOA > 0 ? annualAC / (stepMismatch * fInverter * fAvail) : 1;
  const stepTemp = stepMismatch * fTempAnnual;
  const stepInverter = stepTemp * fInverter;
  const stepAC = stepInverter * fAvail;

  const lossWaterfall: LossWaterfallStep[] = [
    waterfallStep('ghi', 'GHI on horizontal', stepGHI, stepGHI, stepGHI),
    waterfallStep('poa', 'POA after tilt+albedo', stepGHI, stepPOA, stepGHI),
    waterfallStep('soiling', 'After soiling', stepPOA, stepSoiling, stepGHI),
    waterfallStep('dc_loss', 'After DC cabling', stepSoiling, stepDC, stepGHI),
    waterfallStep('mismatch', 'After mismatch', stepDC, stepMismatch, stepGHI),
    waterfallStep(
      'temperature',
      'After temperature derate',
      stepMismatch,
      stepTemp,
      stepGHI
    ),
    waterfallStep(
      'inverter',
      'After inverter efficiency',
      stepTemp,
      stepInverter,
      stepGHI
    ),
    waterfallStep(
      'availability',
      'After availability',
      stepInverter,
      stepAC,
      stepGHI
    ),
    waterfallStep('ac', 'AC at meter', stepAC, stepAC, stepGHI),
  ];

  // Implied CUF: AC kWh / (1 kWp × 8760 h)
  const impliedCufPct = (annualAC / HOURS_PER_YEAR) * 100;

  // Monsoon uncertainty: use the inter-annual stdev/mean across Jun–Sep
  // as a CV proxy. Falls back to 8% if the dataset has no stdev.
  const monsoonMonths = [5, 6, 7, 8];
  let cvSum = 0;
  let cvN = 0;
  for (const m of monsoonMonths) {
    const mean = record.monthly.ghi[m];
    const sd = record.monthly.stdev[m] ?? 0;
    if (mean > 0 && sd > 0) {
      cvSum += sd / mean;
      cvN++;
    }
  }
  const cvPct = cvN > 0 ? (cvSum / cvN) * 100 : 8;

  const distanceKm = haversineKm(
    location.lat,
    location.lng,
    record.lat,
    record.lng
  );

  return {
    monthlyGHI,
    monthlyPOA,
    monthlyACkWhPerKWp,
    dailyTypicalYear,
    annualSpecificYield,
    annualPOA,
    impliedCufPct,
    lossWaterfall,
    optimalTiltDeg: location.tiltDeg,
    monsoonUncertainty: { months: monsoonMonths, cvPct },
    provenance: record.source,
    snapDistanceKm: distanceKm,
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function waterfallStep(
  id: LossWaterfallStep['id'],
  label: string,
  prev: number,
  next: number,
  baseline: number
): LossWaterfallStep {
  const delta = prev - next;
  return {
    id,
    label,
    kWhPerKWpYr: Math.max(0, next),
    deltaKWhPerKWpYr: delta,
    deltaPct: baseline > 0 ? (delta / baseline) * 100 : 0,
  };
}

function synthDaily(monthlyGHI: number[]): number[] {
  const out = new Array<number>(365);
  const anchor: number[] = [];
  let acc = 0;
  for (let m = 0; m < 12; m++) {
    anchor.push(acc + Math.floor(MONTH_DAYS[m] / 2));
    acc += MONTH_DAYS[m];
  }
  for (let d = 0; d < 365; d++) {
    let lo = 11;
    while (lo >= 0 && anchor[lo] > d) lo--;
    const hi = (lo + 1) % 12;
    const loDOY = lo < 0 ? anchor[11] - 365 : anchor[lo];
    const hiDOY = hi === 0 && lo === 11 ? anchor[0] + 365 : anchor[hi];
    const t = (d - loDOY) / Math.max(1, hiDOY - loDOY);
    const v0 = monthlyGHI[lo < 0 ? 11 : lo];
    const v1 = monthlyGHI[hi];
    out[d] = Math.max(0, v0 + (v1 - v0) * t);
  }
  return out;
}
