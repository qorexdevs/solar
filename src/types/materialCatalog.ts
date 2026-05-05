import type { BOMCategory, BOMUom } from './bomLineItem';

/** How duplicated catalog refs across facet templates combine. */
export type ComposeMode = 'max' | 'sum';

/** Catalog lifecycle for admin UX. */
export type CatalogStatus = 'active' | 'archived';

export const COMPOSE_MODE_LABELS: Record<ComposeMode, string> = {
  max: 'Max qty / amount',
  sum: 'Sum qty / amount',
};

/** Discrete values per facet that materials can be tagged with. */
export const MOUNTING_VALUES = ['ground', 'rooftop'] as const;
export type MountingValue = (typeof MOUNTING_VALUES)[number];

export const VOLTAGE_CLASS_VALUES = ['HT', 'LT'] as const;
export type VoltageClassValue = (typeof VOLTAGE_CLASS_VALUES)[number];

export const BUSINESS_MODEL_VALUES = ['captive', 'openAccess'] as const;
export type BusinessModelValue = (typeof BUSINESS_MODEL_VALUES)[number];

export const MONITORING_VALUES = ['basic', 'advanced'] as const;
export type MonitoringValue = (typeof MONITORING_VALUES)[number];

/**
 * Optional explicit facet tags on a material. Used as the per-row override
 * layer in the hybrid filter (effective tags = derivedFromTemplates ∪ explicit).
 */
export type MaterialFacetTags = {
  mounting?: MountingValue[];
  voltageClass?: VoltageClassValue[];
  businessModel?: BusinessModelValue[];
  monitoring?: MonitoringValue[];
};

export const MATERIAL_FACET_LABELS = {
  mounting: 'Mounting',
  voltageClass: 'Voltage class',
  businessModel: 'Business model',
  monitoring: 'Monitoring',
} as const;

export const MATERIAL_FACET_VALUE_LABELS = {
  mounting: { ground: 'Ground', rooftop: 'Rooftop' },
  voltageClass: { HT: 'HT', LT: 'LT' },
  businessModel: { captive: 'Captive', openAccess: 'Open access' },
  monitoring: { basic: 'Baseline', advanced: 'Advanced SCADA' },
} as const satisfies Record<keyof MaterialFacetTags, Record<string, string>>;

/**
 * Global material catalog item — canonical identity + pricing defaults for
 * template lines to reference (`catalogItemId`).
 */
export type MaterialCatalogItem = {
  id: string;
  name: string;
  description?: string;
  make?: string;
  /** Optional alternate makes / suppliers shown in the editor. */
  altMakes?: string[];
  /** Main BOM qty×rate vs lump-sum scope. */
  kind: 'bom' | 'scope';
  category: BOMCategory;
  /** For `kind === 'bom'` only. */
  uom?: BOMUom;
  /** Unit rate INR (bom) — optional when templates always override rate. */
  defaultRate?: number;
  /** Lump-sum INR baseline for scope kind (at template calibration). */
  defaultAmount?: number;
  gstPercent: number;
  /** Default compose mode when templates don't override / estimate doesn't toggle. */
  defaultComposeMode: ComposeMode;
  /**
   * Explicit facet membership overrides. Hybrid filter unions these with the
   * facet values derived from templates that reference this material.
   */
  facetTags?: MaterialFacetTags;
  notes?: string;
  status: CatalogStatus;
  createdAt: number;
  updatedAt: number;
};
