import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ComposeMode,
  ComposeOverridesMap,
  Estimate,
  EstimateFacetSelections,
  EstimateLineOverride,
  EstimateLineOverridesMap,
  FinanceLayer,
  ScenarioTemplate,
  SelectedOptionsPerTemplate,
} from '@/types';
import {
  applyLineOverrides,
  createEstimate,
  defaultFinanceLayer,
  duplicateEstimate,
  recomputeMaterialization,
  type EstimateInit,
} from '@/lib/estimate';
import { parseFiniteLatLng } from '@/lib/irradiance';
import { useTemplateStore } from './templates';
import { useCatalogStore } from './catalog';
import { selectFacetsSorted, useFacetStore } from './facets';

export const ESTIMATES_PERSIST_KEY = 'solar-estimates-v2';

function sanitizeEstimateLocation(e: Estimate): Estimate {
  if (!e.location) return e;
  const pair = parseFiniteLatLng(e.location.lat, e.location.lng);
  if (!pair) return { ...e, location: undefined };
  const [lat, lng] = pair;
  if (lat === e.location.lat && lng === e.location.lng) return e;
  return { ...e, location: { ...e.location, lat, lng } };
}

function rematerialise(estimate: Estimate): Estimate {
  // Recomputing always invalidates per-line manual overrides — the UI is
  // expected to warn the user before invoking actions that hit this path.
  const next = recomputeMaterialization(estimate, {
    facets: selectFacetsSorted(useFacetStore.getState()),
    templates: useTemplateStore.getState().templates,
    catalogItems: useCatalogStore.getState().items,
  });
  if (next.lineOverrides && Object.keys(next.lineOverrides).length > 0) {
    return { ...next, lineOverrides: undefined };
  }
  return next;
}

/**
 * Recompute totals using the existing materialized BOM + current
 * `lineOverrides`. Used when the user edits a single cell and we want
 * KPIs / per-kW rate to update without re-running the composer.
 */
function retotalWithOverrides(
  estimate: Estimate,
  overrides: EstimateLineOverridesMap | undefined
): Estimate {
  const { totals } = applyLineOverrides(
    estimate.materialized,
    overrides,
    estimate.targetCapacityKW
  );
  return {
    ...estimate,
    lineOverrides: overrides,
    totals,
    updatedAt: Date.now(),
  };
}

type EstimateState = {
  estimates: Estimate[];
  recentEstimateId: string | null;
  comparisonIds: string[];

  createFromSelections: (
    args?: Omit<EstimateInit, 'facets' | 'templates' | 'catalogItems'> & {
      catalogItems?: EstimateInit['catalogItems'];
      templates?: ScenarioTemplate[];
    }
  ) => Estimate;
  duplicate: (id: string) => Estimate | null;
  remove: (id: string) => void;
  update: (id: string, updater: (e: Estimate) => Estimate) => void;
  setRecent: (id: string) => void;

  setTargetCapacity: (id: string, targetKW: number) => void;
  setSelections: (id: string, selections: EstimateFacetSelections) => void;
  setSelectedOptionsPerTemplate: (
    id: string,
    opts: SelectedOptionsPerTemplate
  ) => void;
  setLineOptionsForTemplate: (
    id: string,
    templateId: string,
    lineIds: string[]
  ) => void;
  setComposeOverride: (
    id: string,
    catalogItemId: string,
    mode: ComposeMode | undefined
  ) => void;
  setLineOverride: (
    id: string,
    lineId: string,
    patch: EstimateLineOverride
  ) => void;
  clearLineOverride: (id: string, lineId: string) => void;
  clearAllLineOverrides: (id: string) => void;
  setName: (id: string, name: string) => void;
  setStatus: (id: string, status: Estimate['status']) => void;
  setLocation: (id: string, location: Estimate['location']) => void;

  enableFinance: (id: string, finance?: Partial<FinanceLayer>) => void;
  disableFinance: (id: string) => void;
  updateFinance: (id: string, patch: Partial<FinanceLayer>) => void;

  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  resetSeed: () => void;
};

export const useEstimateStore = create<EstimateState>()(
  persist(
    (set, get) => ({
      estimates: [],
      recentEstimateId: null,
      comparisonIds: [],

      createFromSelections: (args = {}) => {
        const templates =
          args.templates ?? useTemplateStore.getState().templates;
        const catalogItems =
          args.catalogItems ?? useCatalogStore.getState().items;
        const facets = selectFacetsSorted(useFacetStore.getState());
        const estimate = createEstimate({
          ...args,
          facets,
          templates,
          catalogItems,
        });
        set((state) => ({
          estimates: [estimate, ...state.estimates],
          recentEstimateId: estimate.id,
        }));
        return estimate;
      },

      duplicate: (id) => {
        const original = get().estimates.find((e) => e.id === id);
        if (!original) return null;
        const copy = duplicateEstimate(original);
        set((state) => ({ estimates: [copy, ...state.estimates] }));
        return copy;
      },

      remove: (id) => {
        set((state) => ({
          estimates: state.estimates.filter((e) => e.id !== id),
          recentEstimateId:
            state.recentEstimateId === id ? null : state.recentEstimateId,
          comparisonIds: state.comparisonIds.filter((cid) => cid !== id),
        }));
      },

      update: (id, updater) => {
        set((state) => ({
          estimates: state.estimates.map((e) =>
            e.id === id ? { ...updater(e), id: e.id, updatedAt: Date.now() } : e
          ),
        }));
      },

      setRecent: (id) => set({ recentEstimateId: id }),

      setTargetCapacity: (id, targetKW) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            return rematerialise({
              ...e,
              targetCapacityKW: Math.max(0, targetKW),
              updatedAt: Date.now(),
            });
          }),
        }));
      },

      setSelections: (id, selections) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            return rematerialise({
              ...e,
              selections,
              updatedAt: Date.now(),
            });
          }),
        }));
      },

      setSelectedOptionsPerTemplate: (id, opts) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            return rematerialise({
              ...e,
              selectedOptionsPerTemplate: opts,
              updatedAt: Date.now(),
            });
          }),
        }));
      },

      setLineOptionsForTemplate: (id, templateId, lineIds) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            const selectedOptionsPerTemplate = {
              ...e.selectedOptionsPerTemplate,
              [templateId]: { lineIds },
            };
            return rematerialise({
              ...e,
              selectedOptionsPerTemplate,
              updatedAt: Date.now(),
            });
          }),
        }));
      },

      setComposeOverride: (id, catalogItemId, mode) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            const next: ComposeOverridesMap = {
              ...(e.composeOverrides ?? {}),
            };
            if (mode === undefined) delete next[catalogItemId];
            else next[catalogItemId] = mode;
            const composeOverrides =
              Object.keys(next).length > 0 ? next : undefined;
            return rematerialise({
              ...e,
              composeOverrides,
              updatedAt: Date.now(),
            });
          }),
        }));
      },

      setLineOverride: (id, lineId, patch) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            const current = e.lineOverrides?.[lineId] ?? {};
            const merged: EstimateLineOverride = { ...current, ...patch };
            // Strip undefined values so an empty patch object collapses
            // back to "no override" and can be GC'd.
            const cleaned: EstimateLineOverride = {};
            if (merged.itemName !== undefined) cleaned.itemName = merged.itemName;
            if (merged.uom !== undefined) cleaned.uom = merged.uom;
            if (merged.quantity !== undefined && Number.isFinite(merged.quantity))
              cleaned.quantity = merged.quantity;
            if (merged.rate !== undefined && Number.isFinite(merged.rate))
              cleaned.rate = merged.rate;
            const nextMap: EstimateLineOverridesMap = {
              ...(e.lineOverrides ?? {}),
            };
            if (Object.keys(cleaned).length === 0) {
              delete nextMap[lineId];
            } else {
              nextMap[lineId] = cleaned;
            }
            const lineOverrides =
              Object.keys(nextMap).length > 0 ? nextMap : undefined;
            return retotalWithOverrides(e, lineOverrides);
          }),
        }));
      },

      clearLineOverride: (id, lineId) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id || !e.lineOverrides) return e;
            const next = { ...e.lineOverrides };
            delete next[lineId];
            const lineOverrides = Object.keys(next).length > 0 ? next : undefined;
            return retotalWithOverrides(e, lineOverrides);
          }),
        }));
      },

      clearAllLineOverrides: (id) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id || !e.lineOverrides) return e;
            return retotalWithOverrides(e, undefined);
          }),
        }));
      },

      setName: (id, name) => {
        set((state) => ({
          estimates: state.estimates.map((e) =>
            e.id === id ? { ...e, name, updatedAt: Date.now() } : e
          ),
        }));
      },

      setStatus: (id, status) => {
        set((state) => ({
          estimates: state.estimates.map((e) =>
            e.id === id ? { ...e, status, updatedAt: Date.now() } : e
          ),
        }));
      },

      setLocation: (id, location) => {
        set((state) => ({
          estimates: state.estimates.map((e) =>
            e.id === id ? { ...e, location, updatedAt: Date.now() } : e
          ),
        }));
      },

      enableFinance: (id, partial) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            const base = e.finance ?? defaultFinanceLayer(false);
            return {
              ...e,
              finance: { ...base, ...partial, enabled: true },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      disableFinance: (id) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id || !e.finance) return e;
            return {
              ...e,
              finance: { ...e.finance, enabled: false },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateFinance: (id, patch) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            const base = e.finance ?? defaultFinanceLayer(false);
            return {
              ...e,
              finance: { ...base, ...patch },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      toggleCompare: (id) => {
        set((state) => {
          const exists = state.comparisonIds.includes(id);
          return {
            comparisonIds: exists
              ? state.comparisonIds.filter((cid) => cid !== id)
              : [...state.comparisonIds, id].slice(-4),
          };
        });
      },

      clearCompare: () => set({ comparisonIds: [] }),

      resetSeed: () =>
        set({ estimates: [], recentEstimateId: null, comparisonIds: [] }),
    }),
    {
      name: ESTIMATES_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persistedState, currentState) => {
        const base =
          persistedState && typeof persistedState === 'object'
            ? { ...currentState, ...(persistedState as Partial<EstimateState>) }
            : currentState;
        return {
          ...base,
          estimates: base.estimates.map(sanitizeEstimateLocation),
        };
      },
    }
  )
);
