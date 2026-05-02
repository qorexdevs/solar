import type { CatalogDefaultField, Scenario } from '@/types';

/**
 * Mark each `field` in `scenario.manualOverrides.defaults` as user-touched, so
 * subsequent `applyCatalogDefaults` calls leave that field alone. Used during
 * project-type changes and on save to lock authored values.
 */
export function markDefaultsTouched(
  scenario: Scenario,
  ...fields: CatalogDefaultField[]
): Scenario {
  const existing = scenario.manualOverrides?.defaults ?? {};
  const next = { ...existing };
  for (const f of fields) next[f] = true;
  return {
    ...scenario,
    manualOverrides: { ...scenario.manualOverrides, defaults: next },
  };
}
