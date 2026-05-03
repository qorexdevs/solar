import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ScenarioTemplate, TemplateLine, TemplateStatus } from '@/types';
import { seedTemplates } from '@/lib/templates';
import { uid } from '@/lib/uid';

/** Persist key — v2 introduces facet-scoped catalog-backed templates. */
export const TEMPLATES_PERSIST_KEY = 'solar-templates-v2';

type TemplateState = {
  templates: ScenarioTemplate[];
  activeTemplateId: string | null;

  create: (template: ScenarioTemplate) => void;
  update: (id: string, patch: Partial<ScenarioTemplate>) => void;
  duplicate: (id: string) => ScenarioTemplate | null;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;

  setStatus: (id: string, status: TemplateStatus) => void;
  bumpVersion: (id: string, nextVersion?: string) => void;

  addTemplateLine: (templateId: string, partial?: Partial<TemplateLine>) => void;
  updateTemplateLine: (
    templateId: string,
    lineId: string,
    patch: Partial<TemplateLine>
  ) => void;
  removeTemplateLine: (templateId: string, lineId: string) => void;
  reorderTemplateLines: (templateId: string, orderedIds: string[]) => void;

  seedIfEmpty: () => void;
  resetSeed: () => void;
};

function defaultTemplateLine(): TemplateLine {
  return {
    id: uid('ln'),
    catalogItemId: 'cat-pv-module-540',
    sequence: 1,
    scalingType: 'linear',
    baseQuantity: 1,
    isOptional: false,
    includedByDefault: true,
  };
}

function nextSequence(lines: { sequence: number }[]): number {
  return lines.reduce((max, x) => Math.max(max, x.sequence), 0) + 1;
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
        const lineIdMap = new Map<string, string>();
        const clonedLines = structuredClone(original.lines).map((ln) => {
          const newId = uid('ln');
          lineIdMap.set(ln.id, newId);
          return { ...ln, id: newId };
        });
        const copy: ScenarioTemplate = {
          ...original,
          lines: clonedLines,
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

      addTemplateLine: (templateId, partial) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const line: TemplateLine = {
              ...defaultTemplateLine(),
              sequence: nextSequence(t.lines),
              ...partial,
              id: partial?.id ?? uid('ln'),
            };
            return touch({ ...t, lines: [...t.lines, line] });
          }),
        }));
      },

      updateTemplateLine: (templateId, lineId, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              lines: t.lines.map((l) =>
                l.id === lineId ? { ...l, ...patch, id: l.id } : l
              ),
            });
          }),
        }));
      },

      removeTemplateLine: (templateId, lineId) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            return touch({
              ...t,
              lines: t.lines.filter((l) => l.id !== lineId),
            });
          }),
        }));
      },

      reorderTemplateLines: (templateId, orderedIds) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== templateId) return t;
            const byId = new Map(t.lines.map((l) => [l.id, l]));
            const next: TemplateLine[] = [];
            orderedIds.forEach((id, idx) => {
              const line = byId.get(id);
              if (line) next.push({ ...line, sequence: idx + 1 });
            });
            for (const l of t.lines) {
              if (!orderedIds.includes(l.id)) next.push(l);
            }
            return touch({ ...t, lines: next });
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

function autoBumpVersion(current: string): string {
  if (!current) return 'v1';
  const m = current.match(/^(.*?)(\d+)$/);
  if (!m) return `${current}.1`;
  const next = parseInt(m[2], 10) + 1;
  return `${m[1]}${next}`;
}

export const selectActiveTemplates = (state: TemplateState): ScenarioTemplate[] =>
  state.templates.filter((t) => t.status === 'active');

export const selectAllTemplates = (state: TemplateState): ScenarioTemplate[] =>
  state.templates;

export const selectTemplateById =
  (id: string | null) =>
  (state: TemplateState): ScenarioTemplate | undefined =>
    id ? state.templates.find((t) => t.id === id) : undefined;

export const selectTemplatesByFacetId =
  (facetId: string | null) =>
  (state: TemplateState): ScenarioTemplate[] =>
    facetId ? state.templates.filter((t) => t.facetId === facetId) : [];
