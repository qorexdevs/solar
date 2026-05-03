import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CatalogStatus, MaterialCatalogItem } from '@/types';
import { seedMaterialCatalog } from '@/lib/catalog';

export const CATALOG_PERSIST_KEY = 'solar-catalog-v1';

type CatalogState = {
  items: MaterialCatalogItem[];
  create: (item: MaterialCatalogItem) => void;
  update: (id: string, patch: Partial<MaterialCatalogItem>) => void;
  setStatus: (id: string, status: CatalogStatus) => void;
  remove: (id: string) => void;
  resetSeed: () => void;
  seedIfEmpty: () => void;
};

function touch(i: MaterialCatalogItem): MaterialCatalogItem {
  return { ...i, updatedAt: Date.now() };
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      items: seedMaterialCatalog(),

      create: (item) => {
        set((s) => ({ items: [item, ...s.items] }));
      },

      update: (id, patch) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? touch({ ...i, ...patch, id: i.id }) : i
          ),
        }));
      },

      setStatus: (id, status) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? touch({ ...i, status }) : i
          ),
        }));
      },

      remove: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      resetSeed: () => set({ items: seedMaterialCatalog() }),

      seedIfEmpty: () => {
        if (get().items.length === 0) {
          set({ items: seedMaterialCatalog() });
        }
      },
    }),
    {
      name: CATALOG_PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.items || state.items.length === 0) {
          state.items = seedMaterialCatalog();
        }
      },
    }
  )
);

export const selectCatalogItems = (s: CatalogState) => s.items;
