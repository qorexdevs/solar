import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Materials, Scenario } from '@/types';
import { MATERIAL_KEYS } from '@/types';
import { createScenario, duplicateScenario, seedScenarios } from '@/lib/scenario';
import { buildLegacyCatalog } from '@/lib/catalog';
import { useSettingsStore } from './settings';

/** Magic id every pre-v2 scenario points to after migration. */
export const LEGACY_CATALOG_ID = 'cat_legacy_pre_v2';

/* ------------------------------------------------------------------------ */
/* Migration helpers                                                         */
/* ------------------------------------------------------------------------ */

/** Sum a stored Materials object's CAPEX without importing calc.ts. */
function computeCapexTotalFrom(materials: Materials | undefined): number {
  if (!materials) return 0;
  let total = 0;
  for (const key of MATERIAL_KEYS) {
    const row = materials[key];
    if (row) total += (row.unitCost ?? 0) * (row.quantity ?? 0);
  }
  for (const row of materials.custom ?? []) {
    total += (row.unitCost ?? 0) * (row.quantity ?? 0);
  }
  return total;
}

/**
 * Convert a pre-v3 scenario's `om.baseAnnual` into a `percentOfCapex` that
 * reproduces the same Year-1 O&M against its current capex. Falls back to
 * 1% if the stored capex is zero.
 */
function upgradeOMToPercent(s: Scenario): Scenario {
  const om = (s.om ?? {}) as Scenario['om'] & { baseAnnual?: number };
  if (typeof om.percentOfCapex === 'number') return s;
  const capexTotal = computeCapexTotalFrom(s.materials);
  const baseAnnual = typeof om.baseAnnual === 'number' ? om.baseAnnual : 0;
  const percent =
    capexTotal > 0
      ? Math.round((baseAnnual / capexTotal) * 1000) / 10 // 0.1% precision
      : 1.0;
  const overrides = Array.isArray(om.overrides) ? om.overrides : [];
  return { ...s, om: { percentOfCapex: percent, overrides } };
}

/**
 * Pre-v3 stored material override flags directly on `manualOverrides` keyed by
 * `MaterialKey`. v3 nests them under `manualOverrides.materials`.
 */
function reshapeManualOverrides(s: Scenario): Scenario {
  const mo = (s.manualOverrides ?? {}) as Record<string, unknown>;
  if (!mo || typeof mo !== 'object') {
    return { ...s, manualOverrides: {} };
  }
  // Already in the new shape — leave alone.
  if (mo.materials || mo.defaults) return s;
  const materials: Record<string, unknown> = {};
  for (const key of MATERIAL_KEYS) {
    if (mo[key]) materials[key] = mo[key];
  }
  if (Object.keys(materials).length === 0) {
    return { ...s, manualOverrides: {} };
  }
  return {
    ...s,
    manualOverrides: { materials } as Scenario['manualOverrides'],
  };
}

type ScenarioState = {
  scenarios: Scenario[];
  recentScenarioId: string | null;
  comparisonIds: string[];
  /** Actions */
  add: (init?: Parameters<typeof createScenario>[0]) => Scenario;
  duplicate: (id: string) => Scenario | null;
  remove: (id: string) => void;
  update: (id: string, updater: (s: Scenario) => Scenario) => void;
  setRecent: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  resetSeed: () => void;
};

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      scenarios: seedScenarios(),
      recentScenarioId: null,
      comparisonIds: [],

      add: (init) => {
        const scenario = createScenario(init);
        set((state) => ({
          scenarios: [scenario, ...state.scenarios],
          recentScenarioId: scenario.id,
        }));
        return scenario;
      },

      duplicate: (id) => {
        const original = get().scenarios.find((s) => s.id === id);
        if (!original) return null;
        const copy = duplicateScenario(original);
        set((state) => ({ scenarios: [copy, ...state.scenarios] }));
        return copy;
      },

      remove: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          recentScenarioId: state.recentScenarioId === id ? null : state.recentScenarioId,
          comparisonIds: state.comparisonIds.filter((cid) => cid !== id),
        }));
      },

      update: (id, updater) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...updater(s), id: s.id, updatedAt: Date.now() } : s
          ),
        }));
      },

      setRecent: (id) => set({ recentScenarioId: id }),

      toggleCompare: (id) => {
        set((state) => {
          const exists = state.comparisonIds.includes(id);
          return {
            comparisonIds: exists
              ? state.comparisonIds.filter((cid) => cid !== id)
              : [...state.comparisonIds, id].slice(-4), // cap at 4
          };
        });
      },

      clearCompare: () => set({ comparisonIds: [] }),

      resetSeed: () =>
        set({
          scenarios: seedScenarios(),
          recentScenarioId: null,
          comparisonIds: [],
        }),
    }),
    {
      name: 'solarcalc-scenarios-v1',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as Partial<{ scenarios: Scenario[] }>;
        if (fromVersion < 2 && Array.isArray(state.scenarios)) {
          // Tag legacy scenarios with the shared legacy catalog id; the
          // catalog itself is back-filled into the settings store at app
          // start (see ensureLegacyCatalogBootstrap).
          state.scenarios = state.scenarios.map(
            (s) =>
              ({
                ...s,
                catalogVersionId: s.catalogVersionId ?? LEGACY_CATALOG_ID,
                manualOverrides: s.manualOverrides ?? {},
              }) as Scenario
          );
        }
        if (fromVersion < 3 && Array.isArray(state.scenarios)) {
          // O&M flips from a fixed annual amount to a percentage of CAPEX.
          // For each scenario, derive the percent that reproduces the saved
          // baseAnnual against its own materials, so reading the upgraded
          // store yields the same Year-1 O&M number as before.
          state.scenarios = state.scenarios.map((s) => upgradeOMToPercent(s));
          // The new ManualOverrides shape moves per-row flags under a
          // `materials` key. Pre-v3 scenarios stored those flags at the
          // top level; relocate them in place.
          state.scenarios = state.scenarios.map(reshapeManualOverrides);
        }
        return state as { scenarios: Scenario[] };
      },
    }
  )
);

/**
 * One-shot bootstrap: if any scenario references `LEGACY_CATALOG_ID` but the
 * settings store doesn't have it yet, synthesize one from the first such
 * scenario's materials so the UI can label it nicely. Idempotent.
 *
 * Run from `main.tsx` after both stores have a chance to hydrate.
 */
export function ensureLegacyCatalogBootstrap(): void {
  const scenarios = useScenarioStore.getState().scenarios;
  const referencingLegacy = scenarios.find(
    (s) => s.catalogVersionId === LEGACY_CATALOG_ID
  );
  if (!referencingLegacy) return;

  const settings = useSettingsStore.getState();
  if (settings.catalogs.some((c) => c.id === LEGACY_CATALOG_ID)) return;

  const bom = settings.bomByProjectType[referencingLegacy.projectType];
  const legacy = buildLegacyCatalog(
    referencingLegacy.materials,
    bom,
    referencingLegacy.basics.sizeMW,
    LEGACY_CATALOG_ID
  );
  settings.addCatalog(legacy, false);
}
