import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BOMLineItem,
  OtherScopeItem,
  ScenarioTemplate,
  TemplateStatus,
} from '@/types';
import { seedTemplates } from '@/lib/templates';
import { uid } from '@/lib/uid';

/** Persist key — bumping this on any breaking shape change wipes data. */
export const TEMPLATES_PERSIST_KEY = 'solar-templates-v1';

type TemplateState = {
  templates: ScenarioTemplate[];
  activeTemplateId: string | null;

  /* CRUD ----------------------------------------------------------------- */
  create: (template: ScenarioTemplate) => void;
  update: (id: string, patch: Partial<ScenarioTemplate>) => void;
  duplicate: (id: string) => ScenarioTemplate | null;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;

  /* Status / version ---------------------------------------------------- */
  setStatus: (id: string, status: TemplateStatus) => void;
  bumpVersion: (id: string, nextVersion?: string) => void;

  /* Main BOM ------------------------------------------------------------ */
  addBomLine: (templateId: string, line?: Partial<BOMLineItem>) => void;
  updateBomLine: (
    templateId: string,
    lineId: string,
    patch: Partial<BOMLineItem>
  ) => void;
  removeBomLine: (templateId: string, lineId: string) => void;
  reorderBomLines: (templateId: string, orderedIds: string[]) => void;

  /* Other Scope --------------------------------------------------------- */
  addScopeItem: (templateId: string, item?: Partial<OtherScopeItem>) => void;
  updateScopeItem: (
    templateId: string,
    itemId: string,
    patch: Partial<OtherScopeItem>
  ) => void;
  removeScopeItem: (templateId: string, itemId: string) => void;
  reorderScopeItems: (templateId: string, orderedIds: string[]) => void;

  /* Bootstrap ----------------------------------------------------------- */
  seedIfEmpty: () => void;
  resetSeed: () => void;
};

function defaultLine(): BOMLineItem {
  return {
    id: uid('ln'),
    sequence: 1,
    category: 'misc',
    itemName: 'New item',
    description: '',
    uom: 'count',
    baseQuantity: 1,
    rate: 0,
    gstPercent: 18,
    scalingType: 'fixed',
    isOptional: false,
    includedByDefault: true,
  };
}

function defaultScope(): OtherScopeItem {
  return {
    id: uid('sc'),
    sequence: 1,
    scopeName: 'New scope item',
    baseAmount: 0,
    gstPercent: 18,
    scalingType: 'fixed',
    isOptional: false,
    includedByDefault: true,
  };
}

function nextSequence(items: { sequence: number }[]): number {
  return items.reduce((max, x) => Math.max(max, x.sequence), 0) + 1;
}

function touch(t: ScenarioTemplate): ScenarioTemplate {
  return { ...t, updatedAt: Date.now() };
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: seedTemplates(),
      activeTemplateId: null,

      create: (template) => {
        set((state) => ({
          templates: [template, ...state.templates],
          activeTemplateId: template.id,
        }));
      },

      update: (id, patch) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? touch({ ...t, ...patch, id: t.id }) : t
          ),
        }));
      },

      duplicate: (id) => {
        const original = get().templates.find((t) => t.id === id);
        if (!original) return null;
        const now = Date.now();
        const copy: ScenarioTemplate = {
          ...structuredClone(original),
          id: uid('tpl'),
          name: `${original.name} (copy)`,
          status: 'draft',
          source: 'manual',
          version: 'v1',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ templates: [copy, ...state.templates] }));
        return copy;
      },

      remove: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          activeTemplateId:
            state.activeTemplateId === id ? null : state.activeTemplateId,
        }));
      },

      setActive: (id) => set({ activeTemplateId: id }),

      setStatus: (id, status) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? touch({ ...t, status }) : t
          ),
        }));
      },

      bumpVersion: (id, nextVersion) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== id) return t;
            const next = nextVersion ?? autoBumpVersion(t.version);
            return touch({ ...t, version: next, effectiveFrom: Date.now() });
          }),
        }));
      },

      addBomLine: (templateId, partial) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const line: BOMLineItem = {
              ...defaultLine(),
              sequence: nextSequence(t.mainBom),
              ...partial,
              id: partial?.id ?? uid('ln'),
            };
            return touch({ ...t, mainBom: [...t.mainBom, line] });
          }),
        }));
      },

      updateBomLine: (templateId, lineId, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              mainBom: t.mainBom.map((l) =>
                l.id === lineId ? { ...l, ...patch, id: l.id } : l
              ),
            });
          }),
        }));
      },

      removeBomLine: (templateId, lineId) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              mainBom: t.mainBom.filter((l) => l.id !== lineId),
            });
          }),
        }));
      },

      reorderBomLines: (templateId, orderedIds) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const byId = new Map(t.mainBom.map((l) => [l.id, l]));
            const next: BOMLineItem[] = [];
            orderedIds.forEach((id, idx) => {
              const line = byId.get(id);
              if (line) next.push({ ...line, sequence: idx + 1 });
            });
            // Append any lines missed (defensive).
            for (const l of t.mainBom) {
              if (!orderedIds.includes(l.id)) next.push(l);
            }
            return touch({ ...t, mainBom: next });
          }),
        }));
      },

      addScopeItem: (templateId, partial) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const item: OtherScopeItem = {
              ...defaultScope(),
              sequence: nextSequence(t.otherScope),
              ...partial,
              id: partial?.id ?? uid('sc'),
            };
            return touch({ ...t, otherScope: [...t.otherScope, item] });
          }),
        }));
      },

      updateScopeItem: (templateId, itemId, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              otherScope: t.otherScope.map((s) =>
                s.id === itemId ? { ...s, ...patch, id: s.id } : s
              ),
            });
          }),
        }));
      },

      removeScopeItem: (templateId, itemId) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              otherScope: t.otherScope.filter((s) => s.id !== itemId),
            });
          }),
        }));
      },

      reorderScopeItems: (templateId, orderedIds) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const byId = new Map(t.otherScope.map((s) => [s.id, s]));
            const next: OtherScopeItem[] = [];
            orderedIds.forEach((id, idx) => {
              const s = byId.get(id);
              if (s) next.push({ ...s, sequence: idx + 1 });
            });
            for (const s of t.otherScope) {
              if (!orderedIds.includes(s.id)) next.push(s);
            }
            return touch({ ...t, otherScope: next });
          }),
        }));
      },

      seedIfEmpty: () => {
        if (get().templates.length === 0) {
          set({ templates: seedTemplates() });
        }
      },

      resetSeed: () =>
        set({ templates: seedTemplates(), activeTemplateId: null }),
    }),
    {
      name: TEMPLATES_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.templates || state.templates.length === 0) {
          state.templates = seedTemplates();
        }
      },
    }
  )
);

/** Bump a free-form version like `v1` → `v2`, `1.2` → `1.3`. */
function autoBumpVersion(current: string): string {
  if (!current) return 'v1';
  const m = current.match(/^(.*?)(\d+)$/);
  if (!m) return `${current}.1`;
  const next = parseInt(m[2], 10) + 1;
  return `${m[1]}${next}`;
}

/* Selector helpers ------------------------------------------------------- */
export const selectActiveTemplates = (state: TemplateState): ScenarioTemplate[] =>
  state.templates.filter((t) => t.status === 'active');

export const selectAllTemplates = (state: TemplateState): ScenarioTemplate[] =>
  state.templates;

export const selectTemplateById =
  (id: string | null) =>
  (state: TemplateState): ScenarioTemplate | undefined =>
    id ? state.templates.find((t) => t.id === id) : undefined;
