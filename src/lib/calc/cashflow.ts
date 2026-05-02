export function yearlyCashFlows(
  revenue: number[],
  om: number[],
  loanPayments: number[]
): number[] {
  const n = revenue.length;
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = revenue[i] - om[i] - (loanPayments[i] ?? 0);
  }
  return out;
}

export function cumulativeCF(cashflows: number[], equity: number): number[] {
  const out: number[] = new Array(cashflows.length);
  let acc = -equity;
  for (let i = 0; i < cashflows.length; i++) {
    acc += cashflows[i];
    out[i] = acc;
  }
  return out;
}

/**
 * NPV with year-end cash flows. Year 0 is the equity outflow.
 * NPV = -equity + Σ CF_t / (1+r)^t  for t = 1..n
 */
export function npv(cashflows: number[], discountPct: number, equity: number): number {
  const r = discountPct / 100;
  let total = -equity;
  for (let i = 0; i < cashflows.length; i++) {
    total += cashflows[i] / Math.pow(1 + r, i + 1);
  }
  return total;
}

/** NPV given a vector that already includes the year-0 cash flow (negative equity). */
function npvFromVector(allFlows: number[], r: number): number {
  let total = 0;
  for (let i = 0; i < allFlows.length; i++) {
    total += allFlows[i] / Math.pow(1 + r, i);
  }
  return total;
}

/**
 * IRR via Newton-Raphson seeded at 10% with bisection fallback.
 * Returns NaN when no sign change exists (project never recovers equity).
 */
export function irr(cashflows: number[], equity: number): number {
  const flows = [-equity, ...cashflows];

  // Need at least one positive and one negative flow
  let hasPos = false;
  let hasNeg = false;
  for (const v of flows) {
    if (v > 0) hasPos = true;
    if (v < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return NaN;

  // Newton-Raphson
  let r = 0.1;
  for (let iter = 0; iter < 60; iter++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < flows.length; t++) {
      const denom = Math.pow(1 + r, t);
      f += flows[t] / denom;
      if (t > 0) df += (-t * flows[t]) / Math.pow(1 + r, t + 1);
    }
    if (!Number.isFinite(f) || !Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = r - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-7) return next;
    if (next <= -0.999) {
      r = -0.99;
    } else {
      r = next;
    }
    if (Math.abs(f) < 1e-6) return r;
  }

  // Bisection fallback over [-0.99, 10]
  let lo = -0.99;
  let hi = 10;
  let fLo = npvFromVector(flows, lo);
  let fHi = npvFromVector(flows, hi);

  // Expand hi if needed
  let attempts = 0;
  while (fLo * fHi > 0 && attempts < 8) {
    hi *= 2;
    fHi = npvFromVector(flows, hi);
    attempts++;
  }
  if (fLo * fHi > 0) return NaN;

  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = npvFromVector(flows, mid);
    if (Math.abs(fMid) < 1e-6 || hi - lo < 1e-8) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
