/**
 * Price catalog + Bill of Materials domain.
 *
 * - `defaults`: shipped engineering defaults (BOM ratios, seed prices, per-type defaults).
 * - `derive`: turn (BOM × catalog × plant size) into materialized `Materials` and
 *   project-type defaults onto a scenario, honoring per-field manual overrides.
 * - `legacy`: synthesize a `PriceCatalog` from an already-saved Materials map
 *   (used during the v1 → v2 migration).
 * - `io`: catalog Excel/CSV import & template export.
 */
export {
  DEFAULT_BOM_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_ID,
  DEFAULT_CATALOG_PRICES,
  makeSeedCatalog,
} from './defaults';
export {
  applyCatalogDefaults,
  deriveMaterials,
  getCatalogDefaults,
  quantityFor,
  resolveCatalog,
} from './derive';
export { buildLegacyCatalog } from './legacy';
export {
  buildCatalogTemplateWorkbook,
  downloadCatalogTemplate,
  parseCatalogFile,
  type CatalogParseResult,
} from './io';
