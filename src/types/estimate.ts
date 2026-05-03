import type { BOMCategory, BOMUom } from './bomLineItem';
import type { ScalingType } from './scenarioTemplate';
import type { ScenarioLocation } from './irradiance';

/* ------------------------------------------------------------------------ */
/* Materialized BOM                                                          */
/* ------------------------------------------------------------------------ */

/**
 * One Main BOM line after scaling to a target capacity, with GST math
 * applied. Carries enough provenance to render line-level breakdowns
 * without re-resolving the template.
 */
export type MaterializedLine = {
  /** Unique id within the materialized BOM (mirrors source line id). */
  id: string;
  /** Original template line id, for back-references during edits. */
  sourceLineId: string;
  /** Display order from the template. */
  sequence: number;
  category: BOMCategory;
  itemName: string;
  description: string;
  make?: string;
  uom: BOMUom;
  scalingType: ScalingType;
  /** Quantity after scaling (already rounded for countable UoMs). */
  quantity: number;
  rate: number;
  gstPercent: number;
  /** quantity × rate (pre-tax). */
  subtotal: number;
  /** subtotal × gstPercent / 100. */
  gst: number;
  /** subtotal + gst. */
  total: number;
  /** True when the line was included in the estimate (vs hidden by gating). */
  included: boolean;
  /** True when applicability gates excluded the line for this estimate. */
  applicabilityFiltered: boolean;
  /** True when the line was excluded by user via `selectedOptions`. */
  userExcluded: boolean;
  notes?: string;
};

/** Other-scope line after scaling (same shape minus quantity / rate). */
export type MaterializedScopeLine = {
  id: string;
  sourceItemId: string;
  sequence: number;
  scopeName: string;
  scalingType: ScalingType;
  /** Final scaled INR before GST. */
  amount: number;
  gstPercent: number;
  gst: number;
  total: number;
  included: boolean;
  applicabilityFiltered: boolean;
  userExcluded: boolean;
  notes?: string;
};

export type MaterializedBOM = {
  mainLines: MaterializedLine[];
  otherLines: MaterializedScopeLine[];
};

/* ------------------------------------------------------------------------ */
/* Totals                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * PRD §7 totals block. `perKwRate` divides Grand Total by the estimate's
 * target capacity; `0` when target is non-positive.
 */
export type EstimateTotals = {
  mainBomSubtotal: number;
  mainBomGst: number;
  otherScopeSubtotal: number;
  otherScopeGst: number;
  grandTotal: number;
  perKwRate: number;
};

/* ------------------------------------------------------------------------ */
/* Optional finance layer                                                    */
/* ------------------------------------------------------------------------ */

export type EstimateBasics = {
  lifespanYears: number;
  cufPct: number;
  degradationPct: number;
  inflationPct: number;
  discountPct: number;
};

export type EstimateRevenue = {
  ppaRate: number;
  ppaEscalationPct: number;
};

export type EstimateOM = {
  /** Annual O&M as a percent of total CAPEX. */
  percentOfCapex: number;
  overrides: { year: number; amount: number }[];
};

export type EstimateFinancing = {
  financedPct: number;
  manualLoanAmount?: number;
  interestPct: number;
  termYears: number;
  gracePeriodYears: number;
};

/**
 * Optional finance modeling layer on top of an Estimate. When `enabled` is
 * false, only BOM cost outputs (capex / GST / per-kW) are produced.
 */
export type FinanceLayer = {
  enabled: boolean;
  basics: EstimateBasics;
  revenue: EstimateRevenue;
  om: EstimateOM;
  financing: EstimateFinancing;
};

/* ------------------------------------------------------------------------ */
/* Estimate                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * What the user picks at estimate time:
 *   - `mainBomLineIds`: which optional Main BOM lines are included.
 *   - `otherScopeIds`: which optional Other Scope items are included.
 *
 * Required (`isOptional: false`) lines ignore these lists.
 */
export type SelectedOptions = {
  mainBomLineIds: string[];
  otherScopeIds: string[];
};

/** Status mirrors the older Scenario lifecycle so the list view stays useful. */
export type EstimateStatus = 'draft' | 'feasible' | 'review';

/**
 * The PRD §8 entity 4 plus carry-over fields needed for the existing finance,
 * irradiance, and PPA flows. Always carries `materialized` + `totals`; the
 * `finance` block is optional and gated by `finance.enabled` at compute time.
 */
export type Estimate = {
  id: string;
  name: string;
  status: EstimateStatus;
  templateId: string;
  /** Snapshot of the template version at estimate time. */
  selectedVersion: string;
  targetCapacityKW: number;
  selectedOptions: SelectedOptions;
  materialized: MaterializedBOM;
  totals: EstimateTotals;
  finance?: FinanceLayer;
  location?: ScenarioLocation;
  createdAt: number;
  updatedAt: number;
};
