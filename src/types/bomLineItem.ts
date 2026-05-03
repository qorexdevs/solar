import type { LineApplicability, ScalingType } from './scenarioTemplate';

/** Soft taxonomy used for grouping the cost breakdown panel + donut chart. */
export const BOM_CATEGORIES = [
  'modules',
  'inverters',
  'cables',
  'mounting',
  'earthing',
  'metering',
  'switchyard',
  'civil',
  'services',
  'monitoring',
  'logistics',
  'misc',
] as const;
export type BOMCategory = (typeof BOM_CATEGORIES)[number];

export const BOM_CATEGORY_LABELS: Record<BOMCategory, string> = {
  modules: 'Modules',
  inverters: 'Inverters',
  cables: 'Cables',
  mounting: 'Mounting',
  earthing: 'Earthing & LA',
  metering: 'Metering & Protection',
  switchyard: 'Switchyard',
  civil: 'Civil & Foundations',
  services: 'Services',
  monitoring: 'Monitoring & SCADA',
  logistics: 'Logistics',
  misc: 'Miscellaneous',
};

/** Allowed unit-of-measure values across both Main BOM and Other Scope. */
export const BOM_UOMS = [
  'count',
  'kW',
  'Wp',
  'meter',
  'kg',
  'lot',
  'MW',
] as const;
export type BOMUom = (typeof BOM_UOMS)[number];

export const BOM_UOM_LABELS: Record<BOMUom, string> = {
  count: 'units',
  kW: 'kW',
  Wp: 'Wp',
  meter: 'm',
  kg: 'kg',
  lot: 'lot',
  MW: 'MW',
};

/**
 * One row inside a `ScenarioTemplate.mainBom`. Mirrors PRD §8 entity 2 with
 * a minor addition: `unitCapacityKW` for `step` scaling and `scalingFormula`
 * as a safe arithmetic DSL string for ad-hoc cases.
 */
export type BOMLineItem = {
  id: string;
  /** Display order inside the template (1-based). */
  sequence: number;
  category: BOMCategory;
  itemName: string;
  description: string;
  make?: string;
  uom: BOMUom;
  /** Quantity at the template's base capacity. */
  baseQuantity: number;
  /** Per-unit rate in INR. */
  rate: number;
  /** GST percent applied to `quantity × rate`. */
  gstPercent: number;
  scalingType: ScalingType;
  /**
   * Optional safe-DSL expression. When present, overrides the default
   * `scalingType` math. Variables: `targetKW`, `baseKW`, `baseQty`, plus
   * `Math.ceil/floor/round/min/max`.
   */
  scalingFormula?: string;
  /** Required for `scalingType: 'step'` — the kW per discrete unit. */
  unitCapacityKW?: number;
  applicability?: LineApplicability;
  /** True when the line is user-toggleable in the estimate builder. */
  isOptional: boolean;
  /** Default included flag for optional lines. */
  includedByDefault: boolean;
  notes?: string;
};
