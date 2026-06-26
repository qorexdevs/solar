/** First year (1-based) where cumulative CF turns non-negative, or null. */
export function breakEvenYear(cumCF: number[]): number | null {
  for (let i = 0; i < cumCF.length; i++) {
    if (cumCF[i] >= 0) return i + 1;
  }
  return null;
}

/**
 * Discounted payback: years until cumulative discounted cash flow turns
 * non-negative. Discounts year-t flow by (1+r)^t (equity sits at t=0), then
 * interpolates across the sign change like {@link paybackYears}. Returns null
 * if the discounted flows never recover the equity within the horizon.
 */
export function discountedPaybackYears(
  cashflows: number[],
  equity: number,
  discountPct: number
): number | null {
  const r = discountPct / 100;
  let acc = -equity;
  let prev = acc;
  for (let i = 0; i < cashflows.length; i++) {
    const disc = cashflows[i] / Math.pow(1 + r, i + 1);
    acc += disc;
    if (acc >= 0) {
      if (acc === prev) return i + 1;
      const fraction = -prev / (acc - prev);
      return i + Math.max(0, Math.min(1, fraction));
    }
    prev = acc;
  }
  return null;
}

/** Payback in years with linear interpolation across the sign change. */
export function paybackYears(cumCF: number[]): number | null {
  for (let i = 0; i < cumCF.length; i++) {
    if (cumCF[i] >= 0) {
      if (i === 0) return 1; // recouped within year 1
      const prev = cumCF[i - 1];
      const curr = cumCF[i];
      if (curr === prev) return i + 1;
      const fraction = -prev / (curr - prev);
      return i + Math.max(0, Math.min(1, fraction));
    }
  }
  return null;
}
