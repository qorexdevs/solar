import type { BOMCategory, BOMUom } from './bomLineItem';
import type { ComposeMode } from './materialCatalog';
import type { ScalingType } from './scenarioTemplate';
import type { ScenarioLocation } from './irradiance';

/* ------------------------------------------------------------------------ */
/* Provenance                                                               */
/* ------------------------------------------------------------------------ */

/** One facet template's scaled contribution before merge. */
export type LineContributionSlice = {
  templateId: string;
  facetId: string;
  lineId: string;
  quantity?: number;
  amount?: number;
};

/* ------------------------------------------------------------------------ */
/* Materialized BOM                                                          */
/* ------------------------------------------------------------------------ */

export type MaterializedLine = {
  /** Stable key for merged BOM rows — usually `catalogItemId`. */
  id: string;
  catalogItemId: string;
  sourceLineIds: string[];
  contributedBy: LineContributionSlice[];
  composeMode: ComposeMode;
  /** Original template line id (merged from first facet order). */
  sourceLineId: string;
  sequence: number;
  category: BOMCategory;
  itemName: string;
  description: string;
  make?: string;
  uom: BOMUom;
  scalingType: ScalingType;
  quantity: number;
  rate: number;
  gstPercent: number;
  subtotal: number;
  gst: number;
  total: number;
  included: boolean;
  applicabilityFiltered: boolean;
  userExcluded: boolean;
  notes?: string;
};

export type MaterializedScopeLine = {
  id: string;
  catalogItemId: string;
  sourceItemIds: string[];
  contributedBy: LineContributionSlice[];
  composeMode: ComposeMode;
  sourceItemId: string;
  sequence: number;
  scopeName: string;
  scalingType: ScalingType;
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
/* Totals                                                                   */
/* ------------------------------------------------------------------------ */

export type EstimateTotals = {
  mainBomSubtotal: number;
  mainBomGst: number;
  otherScopeSubtotal: number;
  otherScopeGst: number;
  grandTotal: number;
  perKwRate: number;
};

/* ------------------------------------------------------------------------ */
/* Optional finance                                                         */
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

/** Optional lines keyed per facet template (`templateLine.id` for both bom + scope). */
export type SelectedOptionsPerTemplate = Record<string, { lineIds: string[] }>;

export type EstimateFacetSelections = Record<
  string,
  { templateId: string; selectedVersion: string } | null | undefined
>;

export type ComposeOverridesMap = Partial<Record<string, ComposeMode>>;

export type EstimateStatus = 'draft' | 'feasible' | 'review';

export type Estimate = {
  id: string;
  name: string;
  status: EstimateStatus;
  /** One template snapshot per facet (null = facet skipped when optional). */
  selections: EstimateFacetSelections;
  targetCapacityKW: number;
  /** Optional template lines included by user toggle, namespaced per template id. */
  selectedOptionsPerTemplate: SelectedOptionsPerTemplate;
  /** User override merge rule for duplicated catalog refs. */
  composeOverrides?: ComposeOverridesMap;
  materialized: MaterializedBOM;
  totals: EstimateTotals;
  finance?: FinanceLayer;
  location?: ScenarioLocation;
  createdAt: number;
  updatedAt: number;
};
