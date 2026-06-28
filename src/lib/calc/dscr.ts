/**
 * Debt service coverage ratio: net operating income (revenue minus O&M) per
 * rupee of debt service for a year. Lenders size and price the loan against
 * this — a DSCR below ~1 means the year's operations cannot cover that year's
 * loan payment. Years with no debt service (grace-only interest, or after the
 * loan is retired) carry no coverage constraint and are reported as null.
 */
export function dscrSeries(
  revenue: number[],
  om: number[],
  loanPayments: number[]
): Array<number | null> {
  const n = revenue.length;
  const out: Array<number | null> = new Array(n);
  for (let i = 0; i < n; i++) {
    const service = loanPayments[i] ?? 0;
    out[i] = service > 1e-6 ? (revenue[i] - om[i]) / service : null;
  }
  return out;
}

/** Lowest DSCR across years that carry debt service, or null when none do. */
export function minDSCR(series: Array<number | null>): number | null {
  let min: number | null = null;
  for (const v of series) {
    if (v === null) continue;
    if (min === null || v < min) min = v;
  }
  return min;
}

/** Mean DSCR across years that carry debt service, or null when none do. */
export function avgDSCR(series: Array<number | null>): number | null {
  let sum = 0;
  let count = 0;
  for (const v of series) {
    if (v === null) continue;
    sum += v;
    count++;
  }
  return count > 0 ? sum / count : null;
}

/**
 * Loan life coverage ratio: the present value of cash available for debt
 * service (revenue minus O&M) over the loan term, discounted at the cost of
 * debt, divided by the loan drawn at the outset. Where DSCR is one year's
 * cushion, LLCR is the whole-loan view lenders use to test whether the project
 * could clear the debt early if it had to — above 1 means the discounted
 * operating cash already covers the principal. Null for an unfinanced (cash) plant.
 */
export function llcr(
  revenue: number[],
  om: number[],
  loanAmount: number,
  interestPct: number,
  termYears: number
): number | null {
  if (loanAmount <= 1e-6) return null;
  const r = interestPct / 100;
  const n = Math.min(termYears, revenue.length);
  let pv = 0;
  for (let i = 0; i < n; i++) {
    pv += (revenue[i] - om[i]) / Math.pow(1 + r, i + 1);
  }
  return pv / loanAmount;
}
