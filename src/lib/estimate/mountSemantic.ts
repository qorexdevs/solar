import type { EstimateFacetSelections, ScenarioTemplate } from '@/types';
import {
  SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
} from '@/lib/templates/seed';
import { MOUNTING_FACET_ID, VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';

/** Physical seed ids wired to semantic ground vs rooftop × HT/LT calibration. */
export const MOUNT_PHYSICAL_GROUND_IDS = [
  SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
] as const;

export const MOUNT_PHYSICAL_ROOF_IDS = [
  SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
] as const;

const GROUND_HT = SEED_TEMPLATE_ID_MOUNT_GROUND_HT;
const GROUND_LT = SEED_TEMPLATE_ID_MOUNT_GROUND_LT;
const ROOF_HT = SEED_TEMPLATE_ID_MOUNT_ROOF_HT;
const ROOF_LT = SEED_TEMPLATE_ID_MOUNT_ROOF_LT;

const GROUND_SET = new Set<string>(MOUNT_PHYSICAL_GROUND_IDS as unknown as string[]);
const ROOF_SET = new Set<string>(MOUNT_PHYSICAL_ROOF_IDS as unknown as string[]);

export type MountKind = 'ground' | 'roof';

export function isLtVoltageContext(voltageTpl: ScenarioTemplate | undefined): boolean {
  return voltageTpl?.syncType === 'LT';
}

export function mountKindFromTemplateId(templateId: string | undefined): MountKind | null {
  if (!templateId) return null;
  if (GROUND_SET.has(templateId)) return 'ground';
  if (ROOF_SET.has(templateId)) return 'roof';
  return null;
}

/** Resolve the concrete mounting template snapshot for UX “Ground” vs “Rooftop”. */
export function resolveMountSnapshot(
  kind: MountKind,
  voltageTpl: ScenarioTemplate | undefined,
  templatesById: Map<string, ScenarioTemplate>
): { templateId: string; selectedVersion: string } | null {
  const useLt = isLtVoltageContext(voltageTpl);
  const seedId =
    kind === 'ground' ? (useLt ? GROUND_LT : GROUND_HT) : useLt ? ROOF_LT : ROOF_HT;
  const t = templatesById.get(seedId);
  if (!t) return null;
  return { templateId: t.id, selectedVersion: t.version };
}

/**
 * UI options under “swap facet templates” dropdown for mounting —
 * two IDs only, resolved against the current voltage selection.
 */
export function syntheticMountChoices(
  selections: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>
): { label: string; templateId: string }[] {
  const voltSnap = selections[VOLTAGE_CLASS_FACET_ID];
  const voltageTpl =
    voltSnap?.templateId != null ? templatesById.get(voltSnap.templateId) : undefined;
  const ground = resolveMountSnapshot('ground', voltageTpl, templatesById);
  const roof = resolveMountSnapshot('roof', voltageTpl, templatesById);
  const out: { label: string; templateId: string }[] = [];
  if (ground) out.push({ label: 'Ground mount', templateId: ground.templateId });
  if (roof) out.push({ label: 'Rooftop mount', templateId: roof.templateId });
  return out;
}

/** When voltage class switches HT↔LT, keep ground/rooftop intent by swapping calibrated seed ids. */
export function remapMountingAfterSelectionsUpdate(
  prev: EstimateFacetSelections,
  next: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>
): EstimateFacetSelections {
  const prevVoltId = prev[VOLTAGE_CLASS_FACET_ID]?.templateId;
  const nextVoltId = next[VOLTAGE_CLASS_FACET_ID]?.templateId;
  const prevVt = prevVoltId ? templatesById.get(prevVoltId) : undefined;
  const nextVt = nextVoltId ? templatesById.get(nextVoltId) : undefined;

  const syncUnchanged =
    (prevVt?.syncType ?? 'HT') === (nextVt?.syncType ?? 'HT');
  if (syncUnchanged) return next;

  const mountSnap = next[MOUNTING_FACET_ID];
  const kind =
    mountSnap?.templateId != null
      ? mountKindFromTemplateId(mountSnap.templateId)
      : null;

  const resolved =
    kind != null ? resolveMountSnapshot(kind, nextVt, templatesById) : null;
  if (!resolved) return next;

  return {
    ...next,
    [MOUNTING_FACET_ID]: resolved,
  };
}
