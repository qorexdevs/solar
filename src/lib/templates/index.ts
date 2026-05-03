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
export { computeTotals } from './materialize';
export { validateTemplate, type ValidationIssue } from './validate';
export {
  seedTemplates,
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_LT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
  SEED_TEMPLATE_ID_BUS_CLOSED,
  SEED_TEMPLATE_ID_BUS_OPEN,
  SEED_TEMPLATE_ID_MON_NONE,
  SEED_TEMPLATE_ID_MON_ADV,
} from './seed';
