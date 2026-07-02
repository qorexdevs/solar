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

/**
 * Interest coverage ratio: net operating income (revenue minus O&M) per rupee
 * of interest for a year. Where DSCR measures the cushion over the whole loan
 * payment, ICR isolates the interest bill — the harder floor, since principal
 * can be rescheduled but interest cannot. Lenders often set an ICR covenant
 * alongside the DSCR one, and the gap between the two shows how much of the
 * coverage leans on the amortising principal. Years with no interest (after the
 * loan is retired) carry no constraint and are reported as null. Reuse
 * {@link minDSCR}/{@link avgDSCR} and {@link dscrBreaches} to summarise the
 * series against a covenant.
 */
export function icrSeries(
  revenue: number[],
  om: number[],
  interest: number[]
): Array<number | null> {
  const n = revenue.length;
  const out: Array<number | null> = new Array(n);
  for (let i = 0; i < n; i++) {
    const int = interest[i] ?? 0;
    out[i] = int > 1e-6 ? (revenue[i] - om[i]) / int : null;
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
 * Years where DSCR falls below a covenant — the lender's tripwire. A year at or
 * above the covenant clears it; below means that year's operations cannot cover
 * the loan payment at the agreed cushion, which is what triggers reserve sweeps
 * or default clauses. Years without debt service carry no covenant and are
 * skipped. Returns the first breaching year (1-indexed) and how many years
 * breach in total; `first` is null when nothing breaches.
 */
export function dscrBreaches(
  series: Array<number | null>,
  covenant: number
): { first: number | null; count: number } {
  let first: number | null = null;
  let count = 0;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v === null) continue;
    if (v < covenant) {
      if (first === null) first = i + 1;
      count++;
    }
  }
  return { first, count };
}

/**
 * Debt tail: the operating years left once the loan is fully repaid. Lenders
 * want a cushion of unencumbered years at the end of the plant life — if a late
 * year underperforms, the tail is the room to reschedule without running past
 * the asset itself. `lastDebtYear` is the final year that still carries debt
 * service, which moves earlier when prepayments retire the loan ahead of the
 * tenor; `tailYears` is what remains of the life after it; `fraction` states the
 * tail as a share of the years actually spent repaying. Null for an unfinanced
 * (cash) plant that never carries debt service.
 */
export function debtTail(
  loanPayments: number[],
  lifespanYears: number
): { lastDebtYear: number; tailYears: number; fraction: number } | null {
  let lastDebtYear = 0;
  for (let i = 0; i < loanPayments.length; i++) {
    if ((loanPayments[i] ?? 0) > 1e-6) lastDebtYear = i + 1;
  }
  if (lastDebtYear === 0) return null;
  const tailYears = Math.max(0, lifespanYears - lastDebtYear);
  return { lastDebtYear, tailYears, fraction: tailYears / lastDebtYear };
}

/**
 * Weighted average life of the debt: the principal-weighted mean time to
 * repayment, in years. Where {@link debtTail} looks at the cushion left after
 * the loan retires, WAL measures how long capital is actually outstanding on
 * average — each year's principal repayment weighted by the year it lands.
 * Sculpting or extra prepayments pull principal forward and shorten the WAL,
 * which lenders read as their real exposure window rather than the nominal
 * tenor. Takes the per-year principal component of debt service; grace years
 * contribute nothing since no principal moves. Null when no principal is ever
 * repaid (an unfinanced plant).
 */
export function weightedAvgLife(principal: number[]): number | null {
  let repaid = 0;
  let weighted = 0;
  for (let i = 0; i < principal.length; i++) {
    const p = principal[i] ?? 0;
    if (p <= 1e-6) continue;
    repaid += p;
    weighted += p * (i + 1);
  }
  return repaid > 1e-6 ? weighted / repaid : null;
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

/**
 * Project life coverage ratio: the LLCR view stretched over the whole project
 * life rather than just the loan term. Cash available for debt service is
 * discounted across every operating year and divided by the loan drawn. Because
 * it counts the post-loan years LLCR ignores, PLCR is always at least LLCR, and
 * lenders read the gap as the cushion left once the debt is paid off. Null for
 * an unfinanced (cash) plant.
 */
export function plcr(
  revenue: number[],
  om: number[],
  loanAmount: number,
  interestPct: number
): number | null {
  if (loanAmount <= 1e-6) return null;
  const r = interestPct / 100;
  let pv = 0;
  for (let i = 0; i < revenue.length; i++) {
    pv += (revenue[i] - om[i]) / Math.pow(1 + r, i + 1);
  }
  return pv / loanAmount;
}
