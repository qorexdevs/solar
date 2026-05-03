import type { ProjectType } from './projectType';

/**
 * Project sync type at the BOM-template level. HT covers utility-grade
 * 11–33 kV interconnects (drives switchyard / transformer items); LT covers
 * < 415 V rooftop and small-commercial; `Other` is the future escape hatch.
 */
export type SyncType = 'HT' | 'LT' | 'Other';

export const SYNC_TYPES: readonly SyncType[] = ['HT', 'LT', 'Other'];

export const SYNC_TYPE_LABELS: Record<SyncType, string> = {
  HT: 'HT Sync',
  LT: 'LT Sync',
  Other: 'Other',
};

/** PRD §6 status workflow: only Active templates surface to estimators. */
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

/**
 * One of the five PRD §7 scaling kinds. `fixed` items are constant; `linear`
 * scales pro-rata with target capacity; `step` ceil-buckets capacity into
 * discrete units (`unitCapacityKW`); `conditional` is pure on/off via
 * `applicability`; `optional` is on/off driven by user inclusion.
 */
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
 * AND across present fields. Empty / missing means "applies".
 */
export type LineApplicability = {
  syncTypes?: SyncType[];
  projectTypes?: ProjectType[];
  /** Min/max target capacity (kW) inside which this line participates. */
  sizeRangeKW?: { min?: number; max?: number };
};

import type { BOMLineItem } from './bomLineItem';
import type { OtherScopeItem } from './otherScopeItem';

/**
 * The PRD §8 entity 1 — the canonical BOM template. Owns its main BOM and
 * Other Scope items end-to-end (denormalized; no shared catalog). Status +
 * version + effective date drive admin workflow.
 */
export type ScenarioTemplate = {
  id: string;
  name: string;
  projectType: ProjectType;
  syncType: SyncType;
  /** Capacity at which `baseQuantity` / `baseAmount` were calibrated. */
  baseCapacityKW: number;
  status: TemplateStatus;
  /** Free-form semver-ish version string (e.g. `v1`, `2024.10`). */
  version: string;
  /** Epoch ms; templates take effect on or after this date. */
  effectiveFrom: number;
  description?: string;
  source: 'manual' | 'upload' | 'seed';
  createdAt: number;
  updatedAt: number;
  mainBom: BOMLineItem[];
  otherScope: OtherScopeItem[];
};
