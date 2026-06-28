import { describe, expect, it } from 'vitest';
import type { ComputedResults } from '@/lib/calc';
import type { Estimate } from '@/types';
import { bestIdsByMetric, type Metric } from './metrics';

const cap: Metric = {
  id: 'cap',
  label: 'cap',
  icon: '',
  dir: 'higher',
  format: () => '',
  numeric: (_r, e) => e.targetCapacityKW,
};

const cost: Metric = {
  id: 'cost',
  label: 'cost',
  icon: '',
  dir: 'lower',
  format: () => '',
  numeric: (r) => r.capex.total,
};

function row(id: string, capacity: number, total: number) {
  return {
    estimate: { id, targetCapacityKW: capacity } as Estimate,
    results: { capex: { total } } as ComputedResults,
  };
}

describe('bestIdsByMetric', () => {
  it('picks the single higher/lower winner', () => {
    const out = bestIdsByMetric([cap, cost], [row('a', 5, 100), row('b', 10, 80)]);
    expect([...out.cap]).toEqual(['b']);
    expect([...out.cost]).toEqual(['b']);
  });

  it('shares the win on a tie', () => {
    const out = bestIdsByMetric(
      [cap],
      [row('a', 10, 0), row('b', 10, 0), row('c', 7, 0)]
    );
    expect([...out.cap].sort()).toEqual(['a', 'b']);
  });

  it('skips null and non-finite values', () => {
    const irr: Metric = {
      id: 'irr',
      label: '',
      icon: '',
      dir: 'higher',
      format: () => '',
      numeric: (r) => (r.finance ? r.finance.irr : null),
    };
    const computed = [
      {
        estimate: { id: 'a' } as Estimate,
        results: { finance: null } as ComputedResults,
      },
      {
        estimate: { id: 'b' } as Estimate,
        results: { finance: { irr: 0.12 } } as ComputedResults,
      },
    ];
    expect([...bestIdsByMetric([irr], computed).irr]).toEqual(['b']);
  });

  it('returns an empty set when nothing is comparable', () => {
    const out = bestIdsByMetric([cap], []);
    expect(out.cap.size).toBe(0);
  });
});
