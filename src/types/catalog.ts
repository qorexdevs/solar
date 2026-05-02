import type { MaterialKey, MaterialUnit } from './materials';
import type { ProjectType } from './projectType';

/**
 * One row of a project-type Bill of Materials.
 *
 * - `linear`: quantity = perMW × sizeMW (most line items)
 * - `fixed`:  quantity = perMW (independent of plant size; e.g. one-off kit)
 */
export type BOMRule = {
  unit: MaterialUnit;
  perMW: number;
  scaleMode: 'linear' | 'fixed';
};

/** A BOM template covers all standard `MATERIAL_KEYS` for a given project type. */
export type BOMTemplate = Record<MaterialKey, BOMRule>;

/**
 * Per-project-type defaults bundled into a catalog. These supply the values
 * that aren't exposed on the simplified single-page builder, so a scenario's
 * lifespan / degradation / inflation / discount / CUF / PPA escalation /
 * O&M-as-%-of-CAPEX all derive from the active catalog at creation time.
 */
export type CatalogDefaults = {
  lifespanYears: number;
  degradationPct: number;
  inflationPct: number;
  discountPct: number;
  cufPct: number;
  ppaEscalationPct: number;
  /** Annual O&M expressed as a percentage of total CAPEX. */
  omPercentOfCapex: number;
};

/** A weekly/monthly snapshot of unit prices keyed by material plus per-type defaults. */
export type PriceCatalog = {
  id: string;
  label: string;
  uploadedAt: number;
  source: 'upload' | 'manual' | 'seed' | 'legacy';
  /** Unit price (₹) and the unit those prices are quoted in. */
  prices: Record<MaterialKey, { unitPrice: number; unit: MaterialUnit }>;
  /** Scenario defaults split per project type. */
  defaults: Record<ProjectType, CatalogDefaults>;
  notes?: string;
};

/** Catalog-default fields the user can manually override on a scenario. */
export const CATALOG_DEFAULT_FIELDS = [
  'lifespanYears',
  'degradationPct',
  'inflationPct',
  'discountPct',
  'cufPct',
  'ppaEscalationPct',
  'omPercentOfCapex',
] as const;
export type CatalogDefaultField = (typeof CATALOG_DEFAULT_FIELDS)[number];
