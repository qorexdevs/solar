import { computeEstimate, withPPARate, type ComputedResults } from '@/lib/calc';
import type { Estimate } from '@/types';

export type RateScenario = {
  id: string;
  ppaRate: number;
  escalationPct: number;
};

export type RateScenarioResult = {
  scenario: RateScenario;
  results: ComputedResults;
};

/**
 * Recompute the estimate at each candidate (rate, escalation) tuple. The
 * estimate itself is never mutated — `withPPARate` clones the finance layer
 * with overridden tariff fields and `computeEstimate` runs the engine.
 */
export function evaluateScenarios(
  estimate: Estimate,
  scenarios: RateScenario[]
): RateScenarioResult[] {
  return scenarios.map((s) => ({
    scenario: s,
    results: computeEstimate(withPPARate(estimate, s.ppaRate, s.escalationPct)),
  }));
}

/** Default seed rates around the estimate's current PPA: 0.85x / 1.0x / 1.15x. */
export function seedScenarios(estimate: Estimate): RateScenario[] {
  const base = estimate.finance?.revenue.ppaRate ?? 4.5;
  const escalation = estimate.finance?.revenue.ppaEscalationPct ?? 2.0;
  return [
    { id: 'low', ppaRate: round2(base * 0.85), escalationPct: escalation },
    { id: 'mid', ppaRate: round2(base), escalationPct: escalation },
    { id: 'high', ppaRate: round2(base * 1.15), escalationPct: escalation },
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
