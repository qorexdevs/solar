import type { ComputedResults } from '@/lib/calc';
import {
  formatINR,
  formatMW,
  formatPercent,
  formatRate,
  formatTonnes,
  formatYears,
} from '@/lib/format';
import type { Scenario } from '@/types';

export type MetricDir = 'higher' | 'lower';

export type Metric = {
  id: string;
  label: string;
  icon: string;
  format: (r: ComputedResults, s: Scenario) => string;
  numeric: (r: ComputedResults, s: Scenario) => number | null;
  dir: MetricDir;
};

export const METRICS: Metric[] = [
  {
    id: 'capex',
    label: 'Initial Cost (CAPEX)',
    icon: 'account_balance_wallet',
    format: (r) => formatINR(r.capex.total),
    numeric: (r) => r.capex.total,
    dir: 'lower',
  },
  {
    id: 'irr',
    label: 'Internal Rate of Return (IRR)',
    icon: 'trending_up',
    format: (r) => (Number.isFinite(r.irr) ? formatRate(r.irr) : '—'),
    numeric: (r) => (Number.isFinite(r.irr) ? r.irr : null),
    dir: 'higher',
  },
  {
    id: 'payback',
    label: 'Payback Period',
    icon: 'update',
    format: (r) => formatYears(r.paybackYears),
    numeric: (r) => r.paybackYears,
    dir: 'lower',
  },
  {
    id: 'npv',
    label: 'Net Present Value (NPV)',
    icon: 'functions',
    format: (r) => formatINR(r.npv),
    numeric: (r) => r.npv,
    dir: 'higher',
  },
  {
    id: 'lcoe',
    label: 'Levelized Cost (per kWh)',
    icon: 'electric_bolt',
    format: (r) => {
      const totalEnergy = r.energy.reduce((a, b) => a + b, 0);
      if (totalEnergy === 0) return '—';
      const totalCost =
        r.capex.total +
        r.om.reduce((a, b) => a + b, 0) +
        r.loan.reduce((a, l) => a + l.interest, 0);
      return (totalCost / totalEnergy).toFixed(2);
    },
    numeric: (r) => {
      const totalEnergy = r.energy.reduce((a, b) => a + b, 0);
      if (totalEnergy === 0) return null;
      const totalCost =
        r.capex.total +
        r.om.reduce((a, b) => a + b, 0) +
        r.loan.reduce((a, l) => a + l.interest, 0);
      return totalCost / totalEnergy;
    },
    dir: 'lower',
  },
  {
    id: 'co2',
    label: 'Lifetime CO₂ Offset',
    icon: 'co2',
    format: (r) => formatTonnes(r.co2.cumulative),
    numeric: (r) => r.co2.cumulative,
    dir: 'higher',
  },
  {
    id: 'size',
    label: 'Plant Size',
    icon: 'solar_power',
    format: (_r, s) => formatMW(s.basics.sizeMW),
    numeric: (_r, s) => s.basics.sizeMW,
    dir: 'higher',
  },
  {
    id: 'cuf',
    label: 'CUF',
    icon: 'speed',
    format: (_r, s) => formatPercent(s.basics.cufPct),
    numeric: (_r, s) => s.basics.cufPct,
    dir: 'higher',
  },
];

export const SERIES_COLORS = ['#003527', '#316bf3', '#2b6954', '#ba1a1a'];
