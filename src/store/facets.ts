import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TemplateFacet } from '@/types';
import { seedFacets } from '@/lib/facets';

export const FACETS_PERSIST_KEY = 'solar-facets-v1';

type FacetsState = {
  facets: TemplateFacet[];
  update: (id: string, patch: Partial<TemplateFacet>) => void;
  resetSeed: () => void;
  seedIfEmpty: () => void;
};

export const useFacetStore = create<FacetsState>()(
  persist(
    (set, get) => ({
      facets: seedFacets(),

      update: (id, patch) => {
        set((s) => ({
          facets: s.facets.map((f) =>
            f.id === id ? { ...f, ...patch, id: f.id } : f
          ),
        }));
      },

      resetSeed: () => set({ facets: seedFacets() }),

      seedIfEmpty: () => {
        if (!get().facets.length) set({ facets: seedFacets() });
      },
    }),
    {
      name: FACETS_PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.facets || state.facets.length === 0) {
          state.facets = seedFacets();
        }
      },
    }
  )
);

export const selectFacetsSorted = (s: FacetsState): TemplateFacet[] =>
  [...s.facets].sort((a, b) => a.sequence - b.sequence);
