import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CatalogStatus, MaterialCatalogItem } from '@/types';
import { seedMaterialCatalog } from '@/lib/catalog';
import { uid } from '@/lib/uid';

export const CATALOG_PERSIST_KEY = 'solar-catalog-v1';

/** Outcome of a `safeRemove` attempt. */
export type SafeRemoveResult =
  | { ok: true }
  | { ok: false; reason: 'in_use'; refCount: number }
  | { ok: false; reason: 'not_found' };

type CatalogState = {
  items: MaterialCatalogItem[];
  create: (item: MaterialCatalogItem) => void;
  update: (id: string, patch: Partial<MaterialCatalogItem>) => void;
  setStatus: (id: string, status: CatalogStatus) => void;
  bulkSetStatus: (ids: string[], status: CatalogStatus) => void;
  /** Hard-delete (no safety check); kept for tests + admin reset paths. */
  remove: (id: string) => void;
  /** Hard-delete only when caller-supplied refCount is 0. */
  safeRemove: (id: string, refCount: number) => SafeRemoveResult;
  duplicate: (id: string) => MaterialCatalogItem | null;
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

      bulkSetStatus: (ids, status) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        set((s) => ({
          items: s.items.map((i) =>
            idSet.has(i.id) ? touch({ ...i, status }) : i
          ),
        }));
      },

      remove: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      safeRemove: (id, refCount) => {
        const exists = get().items.some((i) => i.id === id);
        if (!exists) return { ok: false, reason: 'not_found' };
        if (refCount > 0) return { ok: false, reason: 'in_use', refCount };
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return { ok: true };
      },

      duplicate: (id) => {
        const original = get().items.find((i) => i.id === id);
        if (!original) return null;
        const now = Date.now();
        const copy: MaterialCatalogItem = {
          ...original,
          id: uid('cat'),
          name: `${original.name} (copy)`,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          facetTags: original.facetTags
            ? cloneFacetTags(original.facetTags)
            : undefined,
          altMakes: original.altMakes ? [...original.altMakes] : undefined,
        };
        set((s) => ({ items: [copy, ...s.items] }));
        return copy;
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<CatalogState>;
        const items = Array.isArray(state.items) ? state.items : [];
        if (version < 2) {
          return {
            ...state,
            items: items.map((i) => ({
              ...i,
              facetTags: i.facetTags ?? undefined,
              altMakes: i.altMakes ?? undefined,
            })),
          };
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.items || state.items.length === 0) {
          state.items = seedMaterialCatalog();
        }
      },
    }
  )
);

function cloneFacetTags(
  tags: NonNullable<MaterialCatalogItem['facetTags']>
): NonNullable<MaterialCatalogItem['facetTags']> {
  const out: NonNullable<MaterialCatalogItem['facetTags']> = {};
  if (tags.mounting) out.mounting = [...tags.mounting];
  if (tags.voltageClass) out.voltageClass = [...tags.voltageClass];
  if (tags.businessModel) out.businessModel = [...tags.businessModel];
  if (tags.monitoring) out.monitoring = [...tags.monitoring];
  return out;
}

export const selectCatalogItems = (s: CatalogState) => s.items;
