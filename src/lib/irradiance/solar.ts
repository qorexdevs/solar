/**
 * Pure solar-geometry primitives + Liu-Jordan POA transposition.
 *
 * No external deps; all functions operate on monthly-mean kWh/m²/day values
 * (the resolution we have from the precomputed dataset). For monthly POA
 * we use the standard "representative day of the month" trick: pick the
 * day-of-year whose extraterrestrial irradiance equals the monthly mean
 * (≈ Klein 1977 representative days), evaluate the daily-integrated tilt
 * factor at that day, and apply it to monthly horizontal irradiance.
 *
 * References:
 * - Cooper (1969) for declination
 * - Erbs et al. (1982) monthly-mean diffuse fraction correlation
 * - Liu & Jordan (1962) isotropic-diffuse transposition
 * - Klein (1977) monthly-average daily insolation factors
 */

import type { TiltPurpose } from '@/types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const SOLAR_CONSTANT_W_M2 = 1367; // Gsc

/** Days in each month, non-leap. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Klein-style representative day-of-year per month (1-indexed DOY). */
const REPRESENTATIVE_DOY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];

/* ------------------------------------------------------------------ *
 * Solar position
 * ------------------------------------------------------------------ */

/** Solar declination angle (deg) — Cooper formula. */
export function declinationDeg(dayOfYear: number): number {
  return 23.45 * Math.sin(((360 / 365) * (284 + dayOfYear)) * DEG);
}

/** Sunset hour angle (deg) at given latitude on given day. */
export function sunsetHourAngleDeg(latDeg: number, dayOfYear: number): number {
  const decl = declinationDeg(dayOfYear) * DEG;
  const lat = latDeg * DEG;
  const arg = -Math.tan(lat) * Math.tan(decl);
  // Polar day / polar night clamp.
  if (arg <= -1) return 180;
  if (arg >= 1) return 0;
  return Math.acos(arg) * RAD;
}

/** Solar zenith angle (deg) at solar noon. */
export function noonZenithDeg(latDeg: number, dayOfYear: number): number {
  return Math.abs(latDeg - declinationDeg(dayOfYear));
}

/* ------------------------------------------------------------------ *
 * Extraterrestrial irradiance and clearness index
 * ------------------------------------------------------------------ */

/** Daily-integrated extraterrestrial irradiance on horizontal (kWh/m²/day). */
export function extraterrestrialDailyKWhM2(
  latDeg: number,
  dayOfYear: number
): number {
  const decl = declinationDeg(dayOfYear) * DEG;
  const lat = latDeg * DEG;
  const omega_s = sunsetHourAngleDeg(latDeg, dayOfYear) * DEG;
  // 1 + 0.033 cos(360 n / 365) eccentricity correction
  const ecc = 1 + 0.033 * Math.cos(((360 * dayOfYear) / 365) * DEG);
  const ho =
    ((24 * 3600) / Math.PI) *
    SOLAR_CONSTANT_W_M2 *
    ecc *
    (Math.cos(lat) * Math.cos(decl) * Math.sin(omega_s) +
      omega_s * Math.sin(lat) * Math.sin(decl));
  return ho / 3.6e6; // J/m²/day → kWh/m²/day
}

/* ------------------------------------------------------------------ *
 * Diffuse fraction (Erbs monthly correlation)
 * ------------------------------------------------------------------ */

/**
 * Erbs et al. monthly-mean diffuse fraction Hd/H from clearness index Kt.
 * Sunset-hour-angle-dependent piecewise polynomial.
 */
export function erbsDiffuseFractionMonthly(
  kt: number,
  sunsetHourAngleDeg: number
): number {
  const ws = sunsetHourAngleDeg * DEG;
  // Erbs 1982 monthly correlation, two ranges by ws.
  if (sunsetHourAngleDeg <= 81.4) {
    return 1.391 - 3.560 * kt + 4.189 * kt * kt - 2.137 * kt * kt * kt;
  }
  return (
    1.311 - 3.022 * kt + 3.427 * kt * kt - 1.821 * kt * kt * kt + 0 * ws
  );
}

/* ------------------------------------------------------------------ *
 * Liu-Jordan transposition (monthly-average daily)
 * ------------------------------------------------------------------ */

export type POAComponents = {
  /** kWh/m²/day on tilted surface. */
  poa: number;
  beam: number;
  diffuse: number;
  groundReflected: number;
  /** Beam tilt factor Rb at the representative day. */
  rb: number;
};

/**
 * Liu-Jordan isotropic-sky transposition for a monthly-average daily mean.
 *
 * - `ghi`: monthly-mean kWh/m²/day on horizontal
 * - `tiltDeg`: panel tilt from horizontal (0..90)
 * - `azimuthDeg`: surface azimuth, 0=N, 180=S (Northern hemisphere convention)
 * - `albedo`: ground reflectance (0..1)
 * - `month`: 0..11 (Jan..Dec)
 *
 * Approximates the geometry at the month's representative day using Klein's
 * Rb factor for tilted surfaces facing south; offsets for non-zero azimuth
 * use the projected-tilt approximation (good enough for ±45° from south).
 */
export function liuJordanMonthlyPOA(
  ghi: number,
  latDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
  albedo: number,
  month: number,
  diffuseFractionOverride?: number
): POAComponents {
  if (ghi <= 0) {
    return { poa: 0, beam: 0, diffuse: 0, groundReflected: 0, rb: 0 };
  }
  const doy = REPRESENTATIVE_DOY[month];
  const ho = extraterrestrialDailyKWhM2(latDeg, doy);
  const kt = ho > 0 ? Math.min(0.85, Math.max(0.05, ghi / ho)) : 0.5;
  const ws = sunsetHourAngleDeg(latDeg, doy);
  const hdHRatio =
    diffuseFractionOverride ?? erbsDiffuseFractionMonthly(kt, ws);
  const diffuseHorz = ghi * hdHRatio;
  const beamHorz = ghi - diffuseHorz;

  // Klein's monthly-average Rb for surfaces facing the equator. We project
  // a non-equator-facing surface to an "effective tilt" by combining the
  // tilt with the azimuth offset so Rb stays well-behaved away from south.
  const azOffsetDeg = Math.abs(180 - azimuthDeg);
  const effTilt =
    tiltDeg * Math.cos(azOffsetDeg * DEG) +
    Math.abs(Math.sin(azOffsetDeg * DEG)) * Math.min(tiltDeg, 30);
  const rb = monthlyRb(latDeg, effTilt, doy);

  // Liu-Jordan: H_T = H_b * Rb + H_d * (1 + cos β)/2 + H * ρ * (1 - cos β)/2
  const cosTilt = Math.cos(tiltDeg * DEG);
  const beamTilted = beamHorz * Math.max(0, rb);
  const diffuseTilted = diffuseHorz * (1 + cosTilt) * 0.5;
  const groundReflected = ghi * albedo * (1 - cosTilt) * 0.5;
  const poa = beamTilted + diffuseTilted + groundReflected;

  return {
    poa,
    beam: beamTilted,
    diffuse: diffuseTilted,
    groundReflected,
    rb,
  };
}

/**
 * Monthly-average Rb (beam tilt factor) per Klein (1977) for a surface
 * facing the equator. Uses the same representative day as the POA call.
 *
 * Northern hemisphere assumption: panels tilted toward south (lat > 0).
 * For southern hemisphere (lat < 0), flip the sign so the effective tilt
 * faces north.
 */
function monthlyRb(latDeg: number, tiltDeg: number, dayOfYear: number): number {
  const decl = declinationDeg(dayOfYear) * DEG;
  const phi = latDeg * DEG;
  const beta = tiltDeg * DEG * (latDeg >= 0 ? 1 : -1);
  // Sunset hour angle on horizontal
  const wsRad = sunsetHourAngleDeg(latDeg, dayOfYear) * DEG;
  // Sunset hour angle on tilted surface
  const argT = -Math.tan(phi - beta) * Math.tan(decl);
  const wsTRad = Math.min(
    wsRad,
    argT <= -1 ? Math.PI : argT >= 1 ? 0 : Math.acos(argT)
  );

  const num =
    Math.cos(phi - beta) * Math.cos(decl) * Math.sin(wsTRad) +
    wsTRad * Math.sin(phi - beta) * Math.sin(decl);
  const den =
    Math.cos(phi) * Math.cos(decl) * Math.sin(wsRad) +
    wsRad * Math.sin(phi) * Math.sin(decl);
  if (den <= 0) return 1;
  return num / den;
}

/* ------------------------------------------------------------------ *
 * Cell temperature + temperature derate
 * ------------------------------------------------------------------ */

const NOCT_C = 45; // typical mono-Si NOCT for Indian rooftop modules

/**
 * Cell temperature (°C) from POA irradiance (W/m²) and ambient (°C),
 * using the standard NOCT model: Tc = Ta + (NOCT - 20) / 800 * G_POA.
 */
export function cellTemperatureC(
  ambientC: number,
  poaWPerM2: number,
  noctC = NOCT_C
): number {
  return ambientC + ((noctC - 20) / 800) * poaWPerM2;
}

/**
 * Power derate fraction (0..1) due to cell temperature deviation from STC.
 * `gammaPctPerC` is the panel's power coefficient (usually negative, e.g.
 * −0.35 %/°C for mono-Si).
 */
export function temperatureDerate(
  cellTempC: number,
  gammaPctPerC = -0.35
): number {
  const dT = cellTempC - 25;
  return 1 + (gammaPctPerC / 100) * dT;
}

/* ------------------------------------------------------------------ *
 * Tilt optimizer
 * ------------------------------------------------------------------ */

export type TiltScanInput = {
  monthlyGHI: number[]; // [12]
  latDeg: number;
  azimuthDeg: number;
  albedo: number;
  monthlyDiffuseFraction?: number[]; // optional override
};

/**
 * Scan tilt 0..45° in 1° steps and pick the optimum for the given purpose:
 *
 * - `'annual'`: maximize annual POA
 * - `'summer_peak'`: maximize Apr–Jun POA
 * - `'monsoon_resilient'`: maximize a mix of monsoon (Jun–Sep) POA and
 *   month-to-month consistency (we minimise stdev across the worst quarter)
 */
export function optimizeTilt(
  input: TiltScanInput,
  purpose: TiltPurpose
): { tiltDeg: number; metric: number } {
  let bestTilt = 0;
  let bestMetric = -Infinity;

  for (let t = 0; t <= 45; t++) {
    const monthly = input.monthlyGHI.map((ghi, m) =>
      liuJordanMonthlyPOA(
        ghi,
        input.latDeg,
        t,
        input.azimuthDeg,
        input.albedo,
        m,
        input.monthlyDiffuseFraction?.[m]
      ).poa
    );
    let metric = 0;
    if (purpose === 'annual') {
      for (let m = 0; m < 12; m++) metric += monthly[m] * MONTH_DAYS[m];
    } else if (purpose === 'summer_peak') {
      for (const m of [3, 4, 5]) metric += monthly[m] * MONTH_DAYS[m];
    } else {
      // monsoon_resilient: weight Jun-Sep heavily, penalise variance
      const monsoon = [5, 6, 7, 8];
      let sum = 0;
      for (const m of monsoon) sum += monthly[m] * MONTH_DAYS[m];
      const mean = sum / monsoon.reduce((s, m) => s + MONTH_DAYS[m], 0);
      let varAcc = 0;
      for (const m of monsoon) varAcc += Math.pow(monthly[m] - mean, 2);
      const stdev = Math.sqrt(varAcc / monsoon.length);
      metric = sum - stdev * 50; // penalty weight tuned empirically
    }
    if (metric > bestMetric) {
      bestMetric = metric;
      bestTilt = t;
    }
  }
  return { tiltDeg: bestTilt, metric: bestMetric };
}

export const SOLAR_CONSTANTS = {
  MONTH_DAYS,
  REPRESENTATIVE_DOY,
  NOCT_C,
};
