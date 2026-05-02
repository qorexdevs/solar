import type { CatalogDefaultField } from './catalog';
import type { MaterialKey, Materials } from './materials';
import type { ProjectType } from './projectType';

export type ScenarioStatus = 'draft' | 'feasible' | 'review';

export type OMOverride = {
  year: number;
  amount: number;
};

export type ScenarioBasics = {
  sizeMW: number;
  lifespanYears: number;
  cufPct: number;
  degradationPct: number;
  inflationPct: number;
  discountPct: number;
};

export type ScenarioRevenue = {
  ppaRate: number;
  ppaEscalationPct: number;
};

export type ScenarioOM = {
  /** Annual O&M as a percent of total CAPEX. Year-1 base = capex × pct / 100. */
  percentOfCapex: number;
  overrides: OMOverride[];
};

export type ScenarioFinancing = {
  financedPct: number;
  manualLoanAmount?: number;
  interestPct: number;
  termYears: number;
  gracePeriodYears: number;
};

/** Per-row flags for material `unitCost` / `quantity` overrides. */
export type ManualMaterialOverrides = Partial<
  Record<MaterialKey, { unitCost?: boolean; quantity?: boolean }>
>;

/**
 * Tracks which scenario fields the user has manually overridden, so re-applying
 * BOM/catalog data to a scenario won't blow them away.
 *
 * - `materials` keys: per-row flags for material `unitCost` / `quantity`.
 * - `defaults`: per-field flags for catalog-derived defaults (lifespan, etc.).
 */
export type ManualOverrides = {
  materials?: ManualMaterialOverrides;
  defaults?: Partial<Record<CatalogDefaultField, boolean>>;
};

export type Scenario = {
  id: string;
  name: string;
  status: ScenarioStatus;
  projectType: ProjectType;
  createdAt: number;
  updatedAt: number;
  basics: ScenarioBasics;
  materials: Materials;
  revenue: ScenarioRevenue;
  om: ScenarioOM;
  financing: ScenarioFinancing;
  /** Catalog version this scenario's standard prices were materialized from. */
  catalogVersionId: string;
  /** Per-line manual override flags so re-derivation skips them. */
  manualOverrides: ManualOverrides;
};
