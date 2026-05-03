import type {
  Estimate,
  EstimateBasics,
  EstimateFinancing,
  EstimateOM,
  EstimateRevenue,
  FinanceLayer,
  ScenarioTemplate,
  SelectedOptions,
} from '@/types';
import {
  defaultSelectedOptionsFor,
  materializeTemplate,
} from '@/lib/templates';
import { uid } from '../uid';

const DEFAULT_PPA_RATE = 3.5;

/** Industry-baseline finance defaults; project-type tuning lives elsewhere. */
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

/** A `disabled`-by-default finance layer with sane defaults pre-populated. */
export function defaultFinanceLayer(enabled = false): FinanceLayer {
  return {
    enabled,
    basics: defaultBasics(),
    revenue: defaultRevenue(),
    om: defaultOM(),
    financing: defaultFinancing(),
  };
}

export type EstimateInit = {
  name?: string;
  template: ScenarioTemplate;
  targetCapacityKW?: number;
  selectedOptions?: SelectedOptions;
  /** When provided, overrides the default disabled finance layer. */
  finance?: Partial<FinanceLayer> | undefined;
  status?: Estimate['status'];
};

/**
 * Create a fresh `Estimate` from a `ScenarioTemplate` at a target capacity.
 * Materializes the BOM at creation so totals are immediately available; the
 * caller can re-materialize on edits via `recomputeMaterialization`.
 */
export function createEstimate(init: EstimateInit): Estimate {
  const now = Date.now();
  const targetCapacityKW = init.targetCapacityKW ?? init.template.baseCapacityKW;
  const selectedOptions =
    init.selectedOptions ?? defaultSelectedOptionsFor(init.template);
  const { materialized, totals } = materializeTemplate({
    template: init.template,
    targetCapacityKW,
    selectedOptions,
  });

  const finance = init.finance
    ? { ...defaultFinanceLayer(false), ...init.finance } as FinanceLayer
    : undefined;

  return {
    id: uid('est'),
    name: init.name ?? `${init.template.name} estimate`,
    status: init.status ?? 'draft',
    templateId: init.template.id,
    selectedVersion: init.template.version,
    targetCapacityKW,
    selectedOptions,
    materialized,
    totals,
    finance,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Re-materialize an estimate against its template after the user changes
 * target capacity or option selections. Pure: returns a new Estimate.
 */
export function recomputeMaterialization(
  estimate: Estimate,
  template: ScenarioTemplate
): Estimate {
  const { materialized, totals } = materializeTemplate({
    template,
    targetCapacityKW: estimate.targetCapacityKW,
    selectedOptions: estimate.selectedOptions,
  });
  return {
    ...estimate,
    selectedVersion: template.version,
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
