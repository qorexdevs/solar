import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Estimate,
  FinanceLayer,
  ScenarioLocation,
  ScenarioTemplate,
  SelectedOptions,
} from '@/types';
import {
  createEstimate,
  defaultFinanceLayer,
  duplicateEstimate,
  recomputeMaterialization,
} from '@/lib/estimate';
import { useTemplateStore } from './templates';

export const ESTIMATES_PERSIST_KEY = 'solar-estimates-v1';

type EstimateState = {
  estimates: Estimate[];
  recentEstimateId: string | null;
  comparisonIds: string[];

  /* CRUD ----------------------------------------------------------------- */
  createFromTemplate: (args: {
    template: ScenarioTemplate;
    name?: string;
    targetCapacityKW?: number;
  }) => Estimate;
  duplicate: (id: string) => Estimate | null;
  remove: (id: string) => void;
  update: (id: string, updater: (e: Estimate) => Estimate) => void;
  setRecent: (id: string) => void;

  /* Estimate-specific edits — keep BOM materialization in sync ----------- */
  setTargetCapacity: (id: string, targetKW: number) => void;
  setSelectedOptions: (id: string, opts: SelectedOptions) => void;
  setName: (id: string, name: string) => void;
  setStatus: (id: string, status: Estimate['status']) => void;
  setLocation: (id: string, location: ScenarioLocation | undefined) => void;

  /* Finance toggling ----------------------------------------------------- */
  enableFinance: (id: string, finance?: Partial<FinanceLayer>) => void;
  disableFinance: (id: string) => void;
  updateFinance: (id: string, patch: Partial<FinanceLayer>) => void;

  /* Comparison list ----------------------------------------------------- */
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  resetSeed: () => void;
};

/**
 * Re-materialise an estimate after capacity / options edits. Pulls the
 * referenced template from the templates store; falls back to leaving the
 * estimate as-is if the template was deleted (the UI surfaces a warning).
 */
function rematerialise(estimate: Estimate): Estimate {
  const template = useTemplateStore
    .getState()
    .templates.find((t) => t.id === estimate.templateId);
  if (!template) return estimate;
  return recomputeMaterialization(estimate, template);
}

export const useEstimateStore = create<EstimateState>()(
  persist(
    (set, get) => ({
      estimates: [],
      recentEstimateId: null,
      comparisonIds: [],

      createFromTemplate: ({ template, name, targetCapacityKW }) => {
        const estimate = createEstimate({ template, name, targetCapacityKW });
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
            e.id === id
              ? { ...updater(e), id: e.id, updatedAt: Date.now() }
              : e
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

      setSelectedOptions: (id, opts) => {
        set((state) => ({
          estimates: state.estimates.map((e) => {
            if (e.id !== id) return e;
            return rematerialise({
              ...e,
              selectedOptions: opts,
              updatedAt: Date.now(),
            });
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
    }
  )
);
