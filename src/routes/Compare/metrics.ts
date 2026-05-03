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
    numeric: (r) =>
      r.finance && Number.isFinite(r.finance.irr) ? r.finance.irr : null,
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
    format: (r) =>
      r.finance ? formatPercent(r.finance.effectiveCufPct) : '—',
    numeric: (r) => (r.finance ? r.finance.effectiveCufPct : null),
    dir: 'higher',
    requiresFinance: true,
  },
];

export const SERIES_COLORS = ['#003527', '#316bf3', '#2b6954', '#ba1a1a'];
