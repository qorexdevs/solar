export { seedMaterialCatalog } from './seedMaterialCatalog';
export { validateCatalog, validateCatalogItem, type CatalogValidationIssue } from './validate';
export {
  computeMaterialUsage,
  computeFacetMembership,
  inferTemplateFacetTags,
  matchesFacetFilter,
  isEmptyFacetFilter,
  type MaterialUsage,
  type FacetFilterSelection,
} from './derive';
