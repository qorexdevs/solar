export {
  matchesApplicability,
  describeApplicability,
  type ApplicabilityContext,
} from './applicability';
export {
  scaledQuantity,
  scaledScopeAmount,
  isLineIncluded,
  isScopeIncluded,
  evalFormula,
  type ScalingContext,
} from './scaling';
export {
  materializeTemplate,
  computeTotals,
  defaultSelectedOptionsFor,
  type MaterializeArgs,
  type MaterializeResult,
} from './materialize';
export { validateTemplate, type ValidationIssue } from './validate';
export {
  seedTemplates,
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_LT,
} from './seed';
