const HOURS_PER_YEAR = 8760;

/** Year-1 annual energy generation in kWh. */
export function annualEnergyKWh(sizeMW: number, cufPct: number): number {
  return sizeMW * 1000 * (cufPct / 100) * HOURS_PER_YEAR;
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
