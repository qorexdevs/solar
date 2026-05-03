import type {
  ComposeOverridesMap,
  Estimate,
  EstimateBasics,
  EstimateFacetSelections,
  EstimateFinancing,
  EstimateOM,
  EstimateRevenue,
  EstimateStatus,
  FinanceLayer,
  MaterialCatalogItem,
  ScenarioTemplate,
  SelectedOptionsPerTemplate,
  TemplateFacet,
} from '@/types';
import {
  composeEstimate,
  defaultSelectedOptionsFromSelections,
  resolveEngineTemplate,
} from '@/lib/composer';
import { VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';
import { uid } from '../uid';

const DEFAULT_PPA_RATE = 3.5;

export type {
  ComposeOverridesMap,
  EstimateFacetSelections,
  EstimateStatus,
  FinanceLayer,
  MaterialCatalogItem,
  ScenarioTemplate,
  SelectedOptionsPerTemplate,
  TemplateFacet,
} from '@/types';

export type EstimateInit = {
  name?: string;
  status?: EstimateStatus;
  selections?: EstimateFacetSelections;
  targetCapacityKW?: number;
  selectedOptionsPerTemplate?: SelectedOptionsPerTemplate;
  composeOverrides?: ComposeOverridesMap;
  facets: TemplateFacet[];
  templates: ScenarioTemplate[];
  catalogItems: MaterialCatalogItem[];
  finance?: Partial<FinanceLayer>;
};

function defaultBasics(): EstimateBasics {
  return {
    lifespanYears: 25,
    cufPct: 22,
    degradationPct: 0.5,
    inflationPct: 6,
    discountPct: 10,
  };
}

function defaultRevenue(): EstimateRevenue {
  return { ppaRate: DEFAULT_PPA_RATE, ppaEscalationPct: 1.5 };
}

function defaultOM(): EstimateOM {
  return { percentOfCapex: 1.0, overrides: [] };
}

function defaultFinancing(): EstimateFinancing {
  return {
    financedPct: 70,
    interestPct: 9.5,
    termYears: 25,
    gracePeriodYears: 1,
  };
}

export function defaultFinanceLayer(enabled = false): FinanceLayer {
  return {
    enabled,
    basics: defaultBasics(),
    revenue: defaultRevenue(),
    om: defaultOM(),
    financing: defaultFinancing(),
  };
}

export function defaultSelectionsFromFacets(
  facets: TemplateFacet[],
  templatesById: Map<string, ScenarioTemplate>
): EstimateFacetSelections {
  const out: EstimateFacetSelections = {};
  for (const f of facets) {
    if (f.defaultTemplateId) {
      const t = templatesById.get(f.defaultTemplateId);
      if (t) {
        out[f.id] = { templateId: t.id, selectedVersion: t.version };
        continue;
      }
    }
    if (!f.required) {
      out[f.id] = null;
    }
  }
  return out;
}

function resolveTargetCapacity(
  selections: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>,
  explicit?: number
): number {
  if (explicit !== undefined && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  const eng = resolveEngineTemplate(selections, templatesById, VOLTAGE_CLASS_FACET_ID);
  return eng?.baseCapacityKW ?? 1000;
}

export function syncSelectionVersions(
  selections: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>
): EstimateFacetSelections {
  const next: EstimateFacetSelections = { ...selections };
  for (const key of Object.keys(next)) {
    const snap = next[key];
    if (!snap?.templateId) continue;
    const t = templatesById.get(snap.templateId);
    if (t) next[key] = { templateId: t.id, selectedVersion: t.version };
  }
  return next;
}

export function createEstimate(init: EstimateInit): Estimate {
  const now = Date.now();
  const templatesById = new Map(init.templates.map((t) => [t.id, t]));
  let selections =
    init.selections ?? defaultSelectionsFromFacets(init.facets, templatesById);
  selections = syncSelectionVersions(selections, templatesById);

  const targetCapacityKW = resolveTargetCapacity(
    selections,
    templatesById,
    init.targetCapacityKW
  );

  const selectedOptionsPerTemplate =
    init.selectedOptionsPerTemplate ??
    defaultSelectedOptionsFromSelections(selections, templatesById);

  const { materialized, totals } = composeEstimate({
    facets: init.facets,
    selections,
    selectedOptionsPerTemplate,
    composeOverrides: init.composeOverrides,
    targetCapacityKW,
    catalogItems: init.catalogItems,
    templates: init.templates,
  });

  const finance = init.finance
    ? ({ ...defaultFinanceLayer(false), ...init.finance } as FinanceLayer)
    : undefined;

  return {
    id: uid('est'),
    name: init.name ?? 'New estimate',
    status: init.status ?? 'draft',
    selections,
    targetCapacityKW,
    selectedOptionsPerTemplate,
    composeOverrides: init.composeOverrides,
    materialized,
    totals,
    finance,
    createdAt: now,
    updatedAt: now,
  };
}

export function recomputeMaterialization(
  estimate: Estimate,
  ctx: {
    facets: TemplateFacet[];
    templates: ScenarioTemplate[];
    catalogItems: MaterialCatalogItem[];
  }
): Estimate {
  const templatesById = new Map(ctx.templates.map((t) => [t.id, t]));
  const selections = syncSelectionVersions(estimate.selections, templatesById);

  const { materialized, totals } = composeEstimate({
    facets: ctx.facets,
    selections,
    selectedOptionsPerTemplate: estimate.selectedOptionsPerTemplate,
    composeOverrides: estimate.composeOverrides,
    targetCapacityKW: estimate.targetCapacityKW,
    catalogItems: ctx.catalogItems,
    templates: ctx.templates,
  });

  return {
    ...estimate,
    selections,
    materialized,
    totals,
    updatedAt: Date.now(),
  };
}

export function duplicateEstimate(estimate: Estimate): Estimate {
  const now = Date.now();
  return {
    ...structuredClone(estimate),
    id: uid('est'),
    name: `${estimate.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}
