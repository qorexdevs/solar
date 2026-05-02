import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BOMRule,
  BOMTemplate,
  CatalogDefaults,
  MaterialKey,
  PriceCatalog,
  ProjectType,
} from '@/types';
import {
  DEFAULT_BOM_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_ID,
  makeSeedCatalog,
} from '@/lib/catalog';

type SettingsState = {
  bomByProjectType: Record<ProjectType, BOMTemplate>;
  catalogs: PriceCatalog[];
  activeCatalogId: string;

  /** Replace the active catalog id. */
  setActiveCatalog: (id: string) => void;
  /** Add a new catalog and (optionally) set it as active. */
  addCatalog: (catalog: PriceCatalog, makeActive?: boolean) => void;
  /** Replace an existing catalog (e.g. user edits a manual catalog inline). */
  updateCatalog: (id: string, patch: Partial<PriceCatalog>) => void;
  /** Remove a catalog. Aborts silently if it's currently active or referenced. */
  removeCatalog: (id: string) => void;
  /** Update a single BOM rule. */
  updateBOMRule: (type: ProjectType, key: MaterialKey, patch: Partial<BOMRule>) => void;
  /** Reset a project type's BOM to the engineering defaults. */
  resetBOM: (type: ProjectType) => void;
  /**
   * Patch a catalog's per-project-type defaults block. Rolls into an
   * `updateCatalog`-equivalent so persistence and snapshots see one change.
   */
  updateCatalogDefaults: (
    catalogId: string,
    type: ProjectType,
    patch: Partial<CatalogDefaults>
  ) => void;
  /** Restore the industry-baseline defaults for a project type on a catalog. */
  resetCatalogDefaults: (catalogId: string, type: ProjectType) => void;
  /** Reset everything to factory defaults (seed catalog + default BOMs). */
  resetAll: () => void;
};

function initialState() {
  const seed = makeSeedCatalog();
  return {
    bomByProjectType: structuredClone(DEFAULT_BOM_BY_PROJECT_TYPE),
    catalogs: [seed],
    activeCatalogId: seed.id,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setActiveCatalog: (id) => {
        const exists = get().catalogs.some((c) => c.id === id);
        if (!exists) return;
        set({ activeCatalogId: id });
      },

      addCatalog: (catalog, makeActive = true) => {
        set((state) => {
          const exists = state.catalogs.some((c) => c.id === catalog.id);
          const catalogs = exists
            ? state.catalogs.map((c) => (c.id === catalog.id ? catalog : c))
            : [catalog, ...state.catalogs];
          return {
            catalogs,
            activeCatalogId: makeActive ? catalog.id : state.activeCatalogId,
          };
        });
      },

      updateCatalog: (id, patch) => {
        set((state) => ({
          catalogs: state.catalogs.map((c) =>
            c.id === id ? { ...c, ...patch, id: c.id } : c
          ),
        }));
      },

      removeCatalog: (id) => {
        set((state) => {
          if (state.activeCatalogId === id) return state;
          return {
            ...state,
            catalogs: state.catalogs.filter((c) => c.id !== id),
          };
        });
      },

      updateBOMRule: (type, key, patch) => {
        set((state) => ({
          bomByProjectType: {
            ...state.bomByProjectType,
            [type]: {
              ...state.bomByProjectType[type],
              [key]: { ...state.bomByProjectType[type][key], ...patch },
            },
          },
        }));
      },

      resetBOM: (type) => {
        set((state) => ({
          bomByProjectType: {
            ...state.bomByProjectType,
            [type]: structuredClone(DEFAULT_BOM_BY_PROJECT_TYPE[type]),
          },
        }));
      },

      updateCatalogDefaults: (catalogId, type, patch) => {
        set((state) => ({
          catalogs: state.catalogs.map((c) => {
            if (c.id !== catalogId) return c;
            const existing =
              c.defaults?.[type] ?? DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE[type];
            return {
              ...c,
              defaults: {
                ...(c.defaults ??
                  structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE)),
                [type]: { ...existing, ...patch },
              },
            };
          }),
        }));
      },

      resetCatalogDefaults: (catalogId, type) => {
        set((state) => ({
          catalogs: state.catalogs.map((c) => {
            if (c.id !== catalogId) return c;
            return {
              ...c,
              defaults: {
                ...(c.defaults ??
                  structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE)),
                [type]: structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE[type]),
              },
            };
          }),
        }));
      },

      resetAll: () => set(initialState()),
    }),
    {
      name: 'solarcalc-settings-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        // v1 → v2: graft per-project-type defaults onto every catalog so the
        // simplified single-page builder has somewhere to source lifespan,
        // CUF, O&M %, etc. from.
        if (fromVersion < 2 && Array.isArray(state.catalogs)) {
          state.catalogs = state.catalogs.map((c) =>
            c && (c as PriceCatalog).defaults
              ? c
              : {
                  ...c,
                  defaults: structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE),
                }
          ) as PriceCatalog[];
        }
        return state as SettingsState;
      },
      onRehydrateStorage: () => (state) => {
        // If a corrupted/empty persisted state hydrates without a catalog,
        // restore the seed so the rest of the app can derive against something.
        if (!state) return;
        if (!state.catalogs || state.catalogs.length === 0) {
          const seed = makeSeedCatalog();
          state.catalogs = [seed];
          state.activeCatalogId = seed.id;
        } else if (!state.catalogs.some((c) => c.id === state.activeCatalogId)) {
          state.activeCatalogId = state.catalogs[0].id;
        }
        // Defensive: if any persisted catalog is missing the v2 defaults
        // (e.g. it was written before the migration ran), graft them now.
        for (const c of state.catalogs) {
          if (!c.defaults) {
            c.defaults = structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE);
          }
        }
      },
    }
  )
);

/** Selector helpers — keep components terse and stable. */
export const selectActiveCatalog = (state: SettingsState): PriceCatalog =>
  state.catalogs.find((c) => c.id === state.activeCatalogId) ??
  state.catalogs[0] ??
  makeSeedCatalog();

export { DEFAULT_CATALOG_ID };
