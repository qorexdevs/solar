const HOURS_PER_YEAR = 8760;

/** Year-1 annual energy generation in kWh. */
export function annualEnergyKWh(sizeMW: number, cufPct: number): number {
  return sizeMW * 1000 * (cufPct / 100) * HOURS_PER_YEAR;
}

/**
 * Year-1 annual energy from a yield-simulator-derived specific yield
 * (kWh/kWp/yr). Used when a `Scenario.location` is set so financials
 * track real irradiance instead of the flat `cufPct`.
 */
export function annualEnergyKWhFromYield(
  sizeMW: number,
  specificYieldKWhPerKWpYr: number
): number {
  return sizeMW * 1000 * specificYieldKWhPerKWpYr;
}

/**
 * Specific yield (kWh/kWp/yr) for a plant: annual energy per installed kWp.
 * Inverse of `annualEnergyKWhFromYield`, handy for benchmarking a site
 * against the ~1400-1700 typical range in India. Zero size yields 0.
 */
export function specificYieldKWhPerKWpYr(sizeMW: number, annualKWh: number): number {
  if (sizeMW <= 0) return 0;
  return annualKWh / (sizeMW * 1000);
}

/**
 * Average annual electricity use of an Indian household (~100 kWh/month).
 * Used to phrase generation as "homes powered" for a relatable headline.
 */
export const AVG_HOME_ANNUAL_KWH = 1200;

/** Number of average Indian homes a year of generation could power. */
export function homesPowered(annualKWh: number): number {
  if (!Number.isFinite(annualKWh) || annualKWh <= 0) return 0;
  return Math.round(annualKWh / AVG_HOME_ANNUAL_KWH);
}

/** Yearly energy with geometric panel degradation, length = lifespanYears. */
export function yearlyEnergy(
  lifespanYears: number,
  baseKWh: number,
  degradationPct: number
): number[] {
  const decay = 1 - degradationPct / 100;
  const out: number[] = new Array(lifespanYears);
  for (let i = 0; i < lifespanYears; i++) out[i] = baseKWh * Math.pow(decay, i);
  return out;
}

export function yearlyRevenue(
  energy: number[],
  ppaRate: number,
  escalationPct: number
): number[] {
  const k = 1 + escalationPct / 100;
  return energy.map((kwh, i) => kwh * ppaRate * Math.pow(k, i));
}
