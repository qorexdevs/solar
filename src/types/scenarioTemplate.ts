import type { ProjectType } from './projectType';
import type { ComposeMode } from './materialCatalog';

/**
 * Project sync type. HT covers utility interconnects; LT covers rooftop/small-commercial.
 */
export type SyncType = 'HT' | 'LT' | 'Other';

export const SYNC_TYPES: readonly SyncType[] = ['HT', 'LT', 'Other'];

export const SYNC_TYPE_LABELS: Record<SyncType, string> = {
  HT: 'HT Sync',
  LT: 'LT Sync',
  Other: 'Other',
};

/** PRD — only Active templates surface to estimators. */
export type TemplateStatus = 'draft' | 'active' | 'archived';

export const TEMPLATE_STATUSES: readonly TemplateStatus[] = [
  'draft',
  'active',
  'archived',
];

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

/** PRD scaling kinds for template lines + catalog-derived BOM rows. */
export type ScalingType =
  | 'fixed'
  | 'linear'
  | 'step'
  | 'conditional'
  | 'optional';

export const SCALING_TYPES: readonly ScalingType[] = [
  'fixed',
  'linear',
  'step',
  'conditional',
  'optional',
];

export const SCALING_TYPE_LABELS: Record<ScalingType, string> = {
  fixed: 'Fixed',
  linear: 'Linear (per kW)',
  step: 'Step (per unit)',
  conditional: 'Conditional',
  optional: 'Optional',
};

/**
 * Filters that gate whether a line is included for a given estimate context.
 * AND across present fields. Prefer `sizeRangeKW`; older seeds may still set
 * `syncTypes` / `projectTypes` until fully migrated off template lines.
 */
export type LineApplicability = {
  syncTypes?: SyncType[];
  projectTypes?: ProjectType[];
  sizeRangeKW?: { min?: number; max?: number };
};

/**
 * One catalog-backed row inside a `ScenarioTemplate`. Quantities calibrated at
 * `template.baseCapacityKW`.
 */
export type TemplateLine = {
  id: string;
  catalogItemId: string;
  sequence: number;
  /** For catalog `kind === 'bom'`. Quantity at template base capacity. */
  baseQuantity?: number;
  /** For catalog `kind === 'scope'`. INR at template base calibration. */
  baseAmount?: number;
  rateOverride?: number;
  gstPercentOverride?: number;
  /** Only for bom lines; inherits from catalog when absent. */
  uomOverride?: import('./bomLineItem').BOMUom;
  composeModeOverride?: ComposeMode;
  scalingType: ScalingType;
  scalingFormula?: string;
  unitCapacityKW?: number;
  applicability?: LineApplicability;
  isOptional: boolean;
  includedByDefault: boolean;
  notes?: string;
};

/**
 * BOM template referencing the global catalog. Each template belongs to
 * exactly one facet; multi-template estimates pick one template per facet and
 * merge by `catalogItemId`.
 *
 * When `facetId === 'voltageClass'`, set `syncType` + `projectType` so scaling
 * / applicability resolves consistently for conditional lines across facets.
 */
export type ScenarioTemplate = {
  id: string;
  name: string;
  facetId: string;
  /** Drives applicability context for composing this template with others. Required for voltage/engine templates; optional elsewhere. */
  syncType?: SyncType;
  projectType?: ProjectType;
  baseCapacityKW: number;
  status: TemplateStatus;
  version: string;
  effectiveFrom: number;
  description?: string;
  source: 'manual' | 'upload' | 'seed';
  createdAt: number;
  updatedAt: number;
  lines: TemplateLine[];
};
