type OverrideRow = { year: number; amount: number };

export function yearlyOM(
  lifespanYears: number,
  baseAnnual: number,
  inflationPct: number,
  overrides: OverrideRow[]
): number[] {
  const k = 1 + inflationPct / 100;
  const overrideMap = new Map(overrides.map((o) => [o.year, o.amount]));
  const out: number[] = new Array(lifespanYears);
  for (let i = 0; i < lifespanYears; i++) {
    const yearNum = i + 1;
    const override = overrideMap.get(yearNum);
    out[i] = override !== undefined ? override : baseAnnual * Math.pow(k, i);
  }
  return out;
}
