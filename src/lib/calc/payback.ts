/** First year (1-based) where cumulative CF turns non-negative, or null. */
export function breakEvenYear(cumCF: number[]): number | null {
  for (let i = 0; i < cumCF.length; i++) {
    if (cumCF[i] >= 0) return i + 1;
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
