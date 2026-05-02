import type {
  BOMRule,
  BOMTemplate,
  CatalogDefaults,
  ManualOverrides,
  Materials,
  PriceCatalog,
  ProjectType,
  Scenario,
} from '@/types';
import { MATERIAL_KEYS, MATERIAL_LABELS } from '@/types';
import { uid } from '@/lib/uid';
import { DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE, makeSeedCatalog } from './defaults';

/**
 * Quantity for one BOM rule given a plant size.
 * - `linear`: perMW × sizeMW. Panels (kW) round to whole kW; counts round.
 * - `fixed`:  perMW (size-independent).
 */
export function quantityFor(rule: BOMRule, sizeMW: number): number {
  const safeSize = Number.isFinite(sizeMW) && sizeMW > 0 ? sizeMW : 0;
  if (rule.scaleMode === 'fixed') {
    return rule.unit === 'kW' || rule.unit === 'count'
      ? Math.round(rule.perMW)
      : rule.perMW;
  }
  const raw = rule.perMW * safeSize;
  if (rule.unit === 'kW' || rule.unit === 'count') return Math.round(raw);
  return raw;
}

/**
 * Materialize the standard `Materials` shape from BOM + catalog + plant size.
 *
 * `previous` and `overrides` are optional. When provided, any `MaterialKey`
 * row whose `unitCost` or `quantity` has been manually overridden keeps the
 * user-authored value from `previous` rather than re-deriving it.
 *
 * `custom` line items are passed through unchanged.
 */
export function deriveMaterials(args: {
  sizeMW: number;
  bom: BOMTemplate;
  catalog: PriceCatalog;
  previous?: Materials;
  overrides?: ManualOverrides;
}): Materials {
  const { sizeMW, bom, catalog, previous, overrides = {} } = args;
  const materialFlags = overrides.materials ?? {};

  const out = {} as Materials;

  for (const key of MATERIAL_KEYS) {
    const rule = bom[key];
    const price = catalog.prices[key];
    const overrideFlags = materialFlags[key];

    const derivedQty = quantityFor(rule, sizeMW);
    const derivedUnitCost = price?.unitPrice ?? 0;

    const prev = previous?.[key];
    const quantity = overrideFlags?.quantity && prev ? prev.quantity : derivedQty;
    const unitCost = overrideFlags?.unitCost && prev ? prev.unitCost : derivedUnitCost;

    out[key] = {
      id: prev?.id ?? uid('li'),
      name: prev?.name ?? MATERIAL_LABELS[key],
      unitCost,
      quantity,
    };
  }

  out.custom = previous?.custom ? structuredClone(previous.custom) : [];
  return out;
}

/* ------------------------------------------------------------------------ */
/* Catalog defaults application                                              */
/* ------------------------------------------------------------------------ */

/** Pluck a `CatalogDefaults` block out of a catalog with safe fallbacks. */
export function getCatalogDefaults(
  catalog: PriceCatalog,
  type: ProjectType
): CatalogDefaults {
  const fromCatalog = catalog.defaults?.[type];
  if (fromCatalog) return fromCatalog;
  return DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE[type];
}

/**
 * Patch a scenario's `basics`, `revenue`, and `om` fields from the matching
 * `CatalogDefaults` block. Per-field manual override flags (in
 * `overrides.defaults`) cause the existing user-authored value to win.
 *
 * Material rows are NOT touched here — call `deriveMaterials` separately.
 */
export function applyCatalogDefaults(
  scenario: Scenario,
  catalog: PriceCatalog,
  type: ProjectType = scenario.projectType
): Scenario {
  const defaults = getCatalogDefaults(catalog, type);
  const flags = scenario.manualOverrides?.defaults ?? {};

  const pick = <K extends keyof CatalogDefaults>(
    field: K,
    fallback: CatalogDefaults[K]
  ): CatalogDefaults[K] => (flags[field] ? fallback : defaults[field]);

  return {
    ...scenario,
    basics: {
      ...scenario.basics,
      lifespanYears: pick('lifespanYears', scenario.basics.lifespanYears),
      degradationPct: pick('degradationPct', scenario.basics.degradationPct),
      inflationPct: pick('inflationPct', scenario.basics.inflationPct),
      discountPct: pick('discountPct', scenario.basics.discountPct),
      cufPct: pick('cufPct', scenario.basics.cufPct),
    },
    revenue: {
      ...scenario.revenue,
      ppaEscalationPct: pick('ppaEscalationPct', scenario.revenue.ppaEscalationPct),
    },
    om: {
      ...scenario.om,
      percentOfCapex: pick('omPercentOfCapex', scenario.om.percentOfCapex),
    },
  };
}

/** Find a catalog by id, falling back to the active or seed catalog. */
export function resolveCatalog(
  catalogs: PriceCatalog[],
  id: string | undefined,
  fallbackId: string
): PriceCatalog {
  if (id) {
    const hit = catalogs.find((c) => c.id === id);
    if (hit) return hit;
  }
  const active = catalogs.find((c) => c.id === fallbackId);
  if (active) return active;
  return catalogs[0] ?? makeSeedCatalog();
}
