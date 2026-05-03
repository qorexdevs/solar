import { useMemo } from 'react';
import { type Indexation, solvePPARate } from '@/lib/calc';
import type { Estimate } from '@/types';

type Props = {
  estimate: Estimate;
  indexation: Indexation;
  targetIRR: number;
};

const TERMS = [10, 15, 20, 25];
const ESCALATIONS = [0, 1, 2, 3, 4];

/**
 * Cross-hatch the year-1 base rate as we vary contract term and escalation.
 * Each cell is its own bisection — for 4 × 5 = 20 cells the solver runs
 * tens of thousands of NPV evaluations, but the calc engine is pure JS and
 * memoised by useMemo, so this stays under ~150ms on a mid-range laptop.
 */
export function SensitivityGrid({ estimate, indexation, targetIRR }: Props) {
  const grid = useMemo(() => {
    return TERMS.map((termYears) =>
      ESCALATIONS.map((escalationPct) => {
        const result = solvePPARate({
          estimate,
          termYears,
          escalationPct,
          indexation,
          targetIRR,
        });
        return result.baseRate;
      })
    );
  }, [estimate, indexation, targetIRR]);

  const flat = grid.flat().filter((v) => Number.isFinite(v));
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/30">
      <table className="w-full text-center font-body-md">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="px-md py-sm font-label-sm text-label-sm font-semibold text-left">
              Term ↓ / Escalation →
            </th>
            {ESCALATIONS.map((e) => (
              <th
                key={e}
                className="px-md py-sm font-label-sm text-label-sm font-semibold"
              >
                {e}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TERMS.map((t, ti) => (
            <tr key={t} className="border-t border-outline-variant/30">
              <td className="px-md py-sm text-left font-label-sm font-semibold text-on-surface">
                {t} yrs
              </td>
              {ESCALATIONS.map((_, ei) => {
                const v = grid[ti][ei];
                const norm =
                  Number.isFinite(v) && max > min ? (v - min) / (max - min) : 0;
                const bg = `rgba(0, 53, 39, ${0.05 + norm * 0.25})`;
                return (
                  <td
                    key={ei}
                    style={{ backgroundColor: bg }}
                    className="px-md py-sm font-data-display"
                  >
                    {Number.isFinite(v) ? `₹${v.toFixed(2)}` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
