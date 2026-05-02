import type {
  BOMTemplate,
  CatalogDefaults,
  MaterialKey,
  MaterialUnit,
  PriceCatalog,
  ProjectType,
} from '@/types';

/* ------------------------------------------------------------------------ */
/* Default BOM templates per project type                                   */
/* ------------------------------------------------------------------------ */

/**
 * BOM ratios per project type. `perMW` is the quantity of `unit` per 1 MW of
 * plant capacity. `linear` rules scale with sizeMW; `fixed` rules don't.
 *
 * Engineering rationale (rough order of magnitude — tune to local realities):
 *
 * - Solar Panels: priced per kW; one MW = 1,000 kW (linear).
 * - Cables / Mounting / Civil / BOS: lump-sum-per-MW lots — express as 1 lot
 *   per MW so the catalog price is the "₹ per MW" cost (linear).
 * - Inverters: utility-scale uses larger central inverters (≈ 5/MW); C&I uses
 *   string inverters (≈ 8/MW); residential is dominated by string inverters
 *   (≈ 10/MW); hybrid roughly mirrors utility plus storage handled via BOS.
 * - Transformers: utility/hybrid get ~1/MW; commercial typically shares with
 *   the LV grid (≈ 0.5/MW); residential almost never has a dedicated one.
 */
export const DEFAULT_BOM_BY_PROJECT_TYPE: Record<ProjectType, BOMTemplate> = {
  utility: {
    panels: { unit: 'kW', perMW: 1000, scaleMode: 'linear' },
    cables: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    inverters: { unit: 'count', perMW: 5, scaleMode: 'linear' },
    mounting: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    transformers: { unit: 'count', perMW: 1, scaleMode: 'linear' },
    civil: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    bos: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
  },
  commercial: {
    panels: { unit: 'kW', perMW: 1000, scaleMode: 'linear' },
    cables: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    inverters: { unit: 'count', perMW: 8, scaleMode: 'linear' },
    mounting: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    transformers: { unit: 'count', perMW: 0.5, scaleMode: 'linear' },
    civil: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    bos: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
  },
  hybrid: {
    panels: { unit: 'kW', perMW: 1000, scaleMode: 'linear' },
    cables: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    inverters: { unit: 'count', perMW: 5, scaleMode: 'linear' },
    mounting: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    transformers: { unit: 'count', perMW: 1, scaleMode: 'linear' },
    civil: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    bos: { unit: 'lot', perMW: 1.5, scaleMode: 'linear' },
  },
  residential: {
    panels: { unit: 'kW', perMW: 1000, scaleMode: 'linear' },
    cables: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    inverters: { unit: 'count', perMW: 10, scaleMode: 'linear' },
    mounting: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
    transformers: { unit: 'count', perMW: 0, scaleMode: 'fixed' },
    civil: { unit: 'lot', perMW: 0.5, scaleMode: 'linear' },
    bos: { unit: 'lot', perMW: 1, scaleMode: 'linear' },
  },
};

/* ------------------------------------------------------------------------ */
/* Default seed price catalog                                               */
/* ------------------------------------------------------------------------ */

/**
 * Starter unit prices (₹) keyed by material. The unit must agree with the BOM
 * for the same key — these are the prices a fresh install ships with and are
 * intentionally illustrative; the user replaces them via Settings → Catalog.
 */
export const DEFAULT_CATALOG_PRICES: Record<
  MaterialKey,
  { unitPrice: number; unit: MaterialUnit }
> = {
  panels: { unitPrice: 22_000, unit: 'kW' }, // ₹/kW installed
  cables: { unitPrice: 15_00_000, unit: 'lot' }, // ₹15 L per MW of cabling
  inverters: { unitPrice: 50_000, unit: 'count' }, // ₹/inverter
  mounting: { unitPrice: 20_00_000, unit: 'lot' }, // ₹20 L per MW
  transformers: { unitPrice: 15_00_000, unit: 'count' }, // ₹/transformer
  civil: { unitPrice: 20_00_000, unit: 'lot' }, // ₹20 L per MW
  bos: { unitPrice: 5_00_000, unit: 'lot' }, // ₹5 L per MW
};

/* ------------------------------------------------------------------------ */
/* Industry-default scenario fields per project type                         */
/* ------------------------------------------------------------------------ */

/**
 * Industry baseline values used when a catalog hasn't been customised.
 *
 * - `lifespanYears` (25) and `degradationPct` (0.5) are typical for crystalline
 *   silicon utility / C&I plants in India.
 * - `inflationPct` (6) is the long-run RBI baseline.
 * - `discountPct` (10) is the standard developer hurdle rate.
 * - `cufPct` varies by region & rooftop vs ground-mount; values shown are
 *   pan-India averages: utility ~22%, hybrid ~20%, commercial ~17%, rooftop
 *   residential ~15%.
 * - `omPercentOfCapex` reflects published utility-scale O&M (~1% of CAPEX/yr),
 *   commercial & rooftop systems running higher (1.5–2%).
 * - `ppaEscalationPct` defaults skew low for hybrid / no escalation for
 *   residential where it's typically a flat tariff or net-metering credit.
 */
export const DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE: Record<
  ProjectType,
  CatalogDefaults
> = {
  utility: {
    lifespanYears: 25,
    degradationPct: 0.5,
    inflationPct: 6.0,
    discountPct: 10,
    cufPct: 22,
    ppaEscalationPct: 1.5,
    omPercentOfCapex: 1.0,
  },
  commercial: {
    lifespanYears: 25,
    degradationPct: 0.5,
    inflationPct: 6.0,
    discountPct: 10,
    cufPct: 17,
    ppaEscalationPct: 2.0,
    omPercentOfCapex: 1.5,
  },
  hybrid: {
    lifespanYears: 25,
    degradationPct: 0.5,
    inflationPct: 6.0,
    discountPct: 10,
    cufPct: 20,
    ppaEscalationPct: 1.0,
    omPercentOfCapex: 1.2,
  },
  residential: {
    lifespanYears: 25,
    degradationPct: 0.5,
    inflationPct: 6.0,
    discountPct: 10,
    cufPct: 15,
    ppaEscalationPct: 0.0,
    omPercentOfCapex: 2.0,
  },
};

export const DEFAULT_CATALOG_ID = 'cat_seed_v1';

export function makeSeedCatalog(): PriceCatalog {
  return {
    id: DEFAULT_CATALOG_ID,
    label: 'Starter prices (seed)',
    uploadedAt: Date.now(),
    source: 'seed',
    prices: structuredClone(DEFAULT_CATALOG_PRICES),
    defaults: structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE),
    notes: 'Default illustrative prices. Replace with your weekly/monthly upload.',
  };
}
