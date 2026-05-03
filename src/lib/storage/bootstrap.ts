/**
 * One-shot localStorage migration runner.
 *
 * Called from `src/main.tsx` before the React tree mounts. Wipes pre-refactor
 * keys (the old v3 catalog and pre-refactor scenarios) once on the first
 * boot of the new build, then leaves the new persist keys to populate
 * themselves with seed data via the store's `onRehydrateStorage`.
 */

const LEGACY_KEYS = [
  'solarcalc-settings-v1',
  'solarcalc-settings-v2.bak',
  'solarcalc-scenarios-v1',
  'solarcalc-scenarios-v2.bak',
] as const;

const WIPE_FLAG_KEY = 'solar-templates-wipe-applied-v1';

/** Pre–multi-template schema (single `templateId` per estimate). */
const MULTI_TEMPLATE_WIPE_KEYS = [
  'solar-templates-v1',
  'solar-estimates-v1',
] as const;

const MULTI_TEMPLATE_WIPE_FLAG = 'solar-multi-template-wipe-v1';

/**
 * Idempotent: only wipes the first time it runs. Safe to call from multiple
 * entry points (no-op after the first successful run).
 */
export function ensureGreenfieldWipe(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (localStorage.getItem(WIPE_FLAG_KEY)) return;
    let removed = 0;
    for (const key of LEGACY_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    }
    localStorage.setItem(WIPE_FLAG_KEY, String(Date.now()));
    if (removed > 0) {
      // eslint-disable-next-line no-console
      console.info(
        `[solar] Cleared ${removed} legacy storage key(s) for Scenario Templates refactor.`
      );
    }
  } catch {
    // localStorage may be unavailable / restricted; best-effort.
  }
}

/**
 * One-shot wipe for catalog + multi-facet estimates (v2 templates / v2 estimates).
 */
export function ensureMultiTemplateSchemaWipe(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (localStorage.getItem(MULTI_TEMPLATE_WIPE_FLAG)) return;
    let removed = 0;
    for (const key of MULTI_TEMPLATE_WIPE_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    }
    localStorage.setItem(MULTI_TEMPLATE_WIPE_FLAG, String(Date.now()));
    if (removed > 0) {
      // eslint-disable-next-line no-console
      console.info(
        `[solar] Cleared ${removed} pre-multi-template storage key(s). Fresh catalog + facet seeds will load.`
      );
    }
  } catch {
    /* best-effort */
  }
}
