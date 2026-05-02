/* Indian numbering — lakh (1,00,000) and crore (1,00,00,000) helpers. */

const LAKH = 100_000;
const CRORE = 10_000_000;

/**
 * Compact INR formatting using Indian conventions.
 * Examples:
 *   45_000 -> "45,000"
 *   850_000 -> "8.5 L"
 *   12_500_000 -> "1.25 Cr"
 *   -3_400_000 -> "-34 L"
 */
export function formatINR(
  value: number,
  options: { compact?: boolean; decimals?: number } = {}
): string {
  if (!Number.isFinite(value)) return '—';
  const { compact = true, decimals } = options;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (!compact || abs < LAKH) {
    return `${sign}${formatIndianGroup(Math.round(abs))}`;
  }

  if (abs < CRORE) {
    const lakhs = abs / LAKH;
    return `${sign}${trim(lakhs, decimals ?? 1)} L`;
  }

  const crores = abs / CRORE;
  return `${sign}${trim(crores, decimals ?? 2)} Cr`;
}

/**
 * Bare compact unit pair, useful when caller wants the symbol elsewhere
 * (e.g. design split where currency is rendered separately).
 */
export function compactINRParts(
  value: number,
  decimals?: number
): {
  sign: string;
  number: string;
  unit: '' | 'L' | 'Cr';
} {
  if (!Number.isFinite(value)) return { sign: '', number: '—', unit: '' };
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < LAKH) return { sign, number: formatIndianGroup(Math.round(abs)), unit: '' };
  if (abs < CRORE) return { sign, number: trim(abs / LAKH, decimals ?? 1), unit: 'L' };
  return { sign, number: trim(abs / CRORE, decimals ?? 2), unit: 'Cr' };
}

function trim(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '');
}

/** Indian digit grouping: 12,34,56,789 (last 3 then 2s). */
export function formatIndianGroup(n: number): string {
  const isNeg = n < 0;
  const s = String(Math.abs(Math.trunc(n)));
  if (s.length <= 3) return (isNeg ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (isNeg ? '-' : '') + grouped + ',' + last3;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${trim(value, decimals)}%`;
}

/** Convert a fractional rate (0.155) to a percent string ("15.5%"). */
export function formatRate(rate: number, decimals = 1): string {
  if (!Number.isFinite(rate)) return '—';
  return `${trim(rate * 100, decimals)}%`;
}

export function formatYears(years: number | null, decimals = 1): string {
  if (years === null || !Number.isFinite(years)) return '—';
  return `${trim(years, decimals)} yrs`;
}

export function formatMW(mw: number): string {
  if (mw < 1) return `${Math.round(mw * 1000)} kW`;
  return `${trim(mw, 2)} MW`;
}

export function formatTonnes(t: number): string {
  if (!Number.isFinite(t)) return '—';
  if (t >= 1000) return `${trim(t / 1000, 2)}k Tonnes`;
  return `${Math.round(t).toLocaleString('en-IN')} Tonnes`;
}

export function formatKWh(kwh: number): string {
  if (!Number.isFinite(kwh)) return '—';
  if (kwh >= 1_000_000) return `${trim(kwh / 1_000_000, 2)} GWh`;
  if (kwh >= 1_000) return `${trim(kwh / 1_000, 2)} MWh`;
  return `${Math.round(kwh)} kWh`;
}
