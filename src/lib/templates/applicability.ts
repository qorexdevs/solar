import type {
  LineApplicability,
  ProjectType,
  SyncType,
} from '@/types';
import { formatIndianGroup, formatPlantCapacityKW } from '@/lib/format';

/**
 * Context passed to applicability checks. Mirrors the estimate's gating
 * inputs: target capacity (kW), sync type, project type. Missing values are
 * treated as "no filter on that axis".
 */
export type ApplicabilityContext = {
  targetCapacityKW: number;
  syncType: SyncType;
  projectType: ProjectType;
};

/**
 * Returns true when the line passes every present filter (AND across axes).
 * An undefined `applicability` means "applies to everything".
 */
export function matchesApplicability(
  rule: LineApplicability | undefined,
  ctx: ApplicabilityContext
): boolean {
  if (!rule) return true;

  if (rule.syncTypes && rule.syncTypes.length > 0) {
    if (!rule.syncTypes.includes(ctx.syncType)) return false;
  }
  if (rule.projectTypes && rule.projectTypes.length > 0) {
    if (!rule.projectTypes.includes(ctx.projectType)) return false;
  }
  if (rule.sizeRangeKW) {
    const { min, max } = rule.sizeRangeKW;
    if (typeof min === 'number' && ctx.targetCapacityKW < min) return false;
    if (typeof max === 'number' && ctx.targetCapacityKW > max) return false;
  }
  return true;
}

/**
 * Compact human-readable summary of an applicability rule. Returns `''`
 * when the rule is empty / undefined (i.e. "always applies").
 */
export function describeApplicability(rule: LineApplicability | undefined): string {
  if (!rule) return '';
  const bits: string[] = [];
  if (rule.syncTypes && rule.syncTypes.length > 0) {
    bits.push(rule.syncTypes.join(' / '));
  }
  if (rule.projectTypes && rule.projectTypes.length > 0) {
    bits.push(rule.projectTypes.join(' / '));
  }
  if (rule.sizeRangeKW) {
    const { min, max } = rule.sizeRangeKW;
    if (typeof min === 'number' && typeof max === 'number') {
      const rMin = Math.round(min);
      const rMax = Math.round(max);
      if (rMin < 1000 && rMax < 1000) {
        bits.push(
          `${formatIndianGroup(rMin)}–${formatIndianGroup(rMax)} kW`
        );
      } else {
        bits.push(`${formatPlantCapacityKW(min)}–${formatPlantCapacityKW(max)}`);
      }
    } else if (typeof min === 'number') {
      bits.push(`≥ ${formatPlantCapacityKW(min)}`);
    } else if (typeof max === 'number') {
      bits.push(`≤ ${formatPlantCapacityKW(max)}`);
    }
  }
  return bits.join(' · ');
}
