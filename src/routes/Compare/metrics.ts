import type { ComputedResults } from '@/lib/calc';
import {
  formatINR,
  formatPercent,
  formatPlantCapacityKW,
  formatRate,
  formatTonnes,
  formatYears,
} from '@/lib/format';
import type { Estimate } from '@/types';

export type MetricDir = 'higher' | 'lower';

export type Metric = {
  id: string;
  label: string;
  icon: string;
  format: (r: ComputedResults, e: Estimate) => string;
  numeric: (r: ComputedResults, e: Estimate) => number | null;
  dir: MetricDir;
  /** When true, only meaningful when finance is enabled. */
  requiresFinance?: boolean;
};

export const METRICS: Metric[] = [
  {
    id: 'capacity',
    label: 'Target Capacity',
    icon: 'solar_power',
    format: (_r, e) => formatPlantCapacityKW(e.targetCapacityKW),
    numeric: (_r, e) => e.targetCapacityKW,
    dir: 'higher',
  },
  {
    id: 'capex',
    label: 'Grand total (incl. GST)',
    icon: 'account_balance_wallet',
    format: (r) => `₹ ${formatINR(r.capex.total)}`,
    numeric: (r) => r.capex.total,
    dir: 'lower',
  },
  {
    id: 'perKw',
    label: 'Per kW rate',
    icon: 'price_change',
    format: (_r, e) => `₹ ${formatINR(e.totals.perKwRate)}`,
    numeric: (_r, e) => e.totals.perKwRate,
    dir: 'lower',
  },
  {
    id: 'irr',
    label: 'IRR',
    icon: 'trending_up',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.irr) ? formatRate(r.finance.irr) : '—',
    numeric: (r) => (r.finance && Number.isFinite(r.finance.irr) ? r.finance.irr : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'mirr',
    label: 'MIRR',
    icon: 'trending_up',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.mirr) ? formatRate(r.finance.mirr) : '—',
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.mirr) ? r.finance.mirr : null,
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'payback',
    label: 'Payback',
    icon: 'update',
    format: (r) => (r.finance ? formatYears(r.finance.paybackYears) : '—'),
    numeric: (r) => (r.finance ? r.finance.paybackYears : null),
    dir: 'lower',
    requiresFinance: true,
  },
  {
    id: 'npv',
    label: 'NPV',
    icon: 'functions',
    format: (r) => (r.finance ? `₹ ${formatINR(r.finance.npv)}` : '—'),
    numeric: (r) => (r.finance ? r.finance.npv : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'pi',
    label: 'Profitability index',
    icon: 'percent',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.profitabilityIndex)
        ? `${r.finance.profitabilityIndex.toFixed(2)}×`
        : '—',
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.profitabilityIndex)
        ? r.finance.profitabilityIndex
        : null,
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'equityMultiple',
    label: 'Equity multiple',
    icon: 'savings',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.equityMultiple)
        ? `${r.finance.equityMultiple.toFixed(2)}×`
        : '—',
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.equityMultiple)
        ? r.finance.equityMultiple
        : null,
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'peakFundingNeed',
    label: 'Peak funding need',
    icon: 'savings',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.peakFundingNeed)
        ? `₹ ${formatINR(r.finance.peakFundingNeed)}`
        : '—',
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.peakFundingNeed)
        ? r.finance.peakFundingNeed
        : null,
    dir: 'lower',
    requiresFinance: true,
  },
  {
    id: 'minDscr',
    label: 'Min DSCR',
    icon: 'account_balance',
    format: (r) =>
      r.finance && r.finance.dscr.min !== null
        ? `${r.finance.dscr.min.toFixed(2)}×`
        : '—',
    numeric: (r) => (r.finance ? r.finance.dscr.min : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'llcr',
    label: 'LLCR',
    icon: 'account_balance',
    format: (r) =>
      r.finance && r.finance.llcr !== null ? `${r.finance.llcr.toFixed(2)}×` : '—',
    numeric: (r) => (r.finance ? r.finance.llcr : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'plcr',
    label: 'PLCR',
    icon: 'account_balance',
    format: (r) =>
      r.finance && r.finance.plcr !== null ? `${r.finance.plcr.toFixed(2)}×` : '—',
    numeric: (r) => (r.finance ? r.finance.plcr : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'lcoe',
    label: 'LCOE',
    icon: 'bolt',
    format: (r) =>
      r.finance && Number.isFinite(r.finance.lcoe)
        ? `₹ ${r.finance.lcoe.toFixed(2)}/kWh`
        : '—',
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.lcoe) ? r.finance.lcoe : null,
    dir: 'lower',
    requiresFinance: true,
  },
  {
    id: 'co2',
    label: 'Lifetime CO₂ Offset',
    icon: 'co2',
    format: (r) => (r.finance ? formatTonnes(r.finance.co2.cumulative) : '—'),
    numeric: (r) => (r.finance ? r.finance.co2.cumulative : null),
    dir: 'higher',
    requiresFinance: true,
  },
  {
    id: 'cuf',
    label: 'CUF',
    icon: 'speed',
    format: (r) => (r.finance ? formatPercent(r.finance.effectiveCufPct) : '—'),
    numeric: (r) => (r.finance ? r.finance.effectiveCufPct : null),
    dir: 'higher',
    requiresFinance: true,
  },
];

/**
 * Estimate ids holding the winning value for each metric. Ties share the win,
 * so two estimates with the same capacity or IRR both get highlighted.
 */
export function bestIdsByMetric(
  metrics: Metric[],
  computed: { estimate: Estimate; results: ComputedResults }[]
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const m of metrics) {
    let best: number | null = null;
    const ids = new Set<string>();
    for (const { estimate, results } of computed) {
      const v = m.numeric(results, estimate);
      if (v === null || !Number.isFinite(v)) continue;
      if (best === null || (m.dir === 'higher' ? v > best : v < best)) {
        best = v;
        ids.clear();
        ids.add(estimate.id);
      } else if (v === best) {
        ids.add(estimate.id);
      }
    }
    out[m.id] = ids;
  }
  return out;
}

export const SERIES_COLORS = ['#003527', '#316bf3', '#2b6954', '#ba1a1a'];
