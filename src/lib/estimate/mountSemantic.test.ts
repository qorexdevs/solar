import { describe, expect, it } from 'vitest';
import { MOUNTING_FACET_ID, VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';
import {
  resolveMountSnapshot,
  remapMountingAfterSelectionsUpdate,
  syntheticMountChoices,
  mountKindFromTemplateId,
} from './mountSemantic';
import {
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_LT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
  SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
  SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
} from '@/lib/templates/seed';
import type { EstimateFacetSelections, ScenarioTemplate } from '@/types';

function shell(p: Partial<ScenarioTemplate> & Pick<ScenarioTemplate, 'id'>): ScenarioTemplate {
  return {
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    lines: [],
    status: 'active',
    version: 'v1',
    effectiveFrom: 0,
    name: '',
    facetId: MOUNTING_FACET_ID,
    baseCapacityKW: 1000,
    ...p,
  };
}

describe('mountSemantic', () => {
  const ht = shell({
    id: SEED_TEMPLATE_ID_HT,
    facetId: VOLTAGE_CLASS_FACET_ID,
    syncType: 'HT',
    name: 'HT',
    baseCapacityKW: 1000,
  });
  const lt = shell({
    id: SEED_TEMPLATE_ID_LT,
    facetId: VOLTAGE_CLASS_FACET_ID,
    syncType: 'LT',
    name: 'LT',
    baseCapacityKW: 700,
  });
  const groundHt = shell({
    id: SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
    facetId: MOUNTING_FACET_ID,
    name: 'Ground HT',
    baseCapacityKW: 1000,
  });
  const groundLt = shell({
    id: SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
    facetId: MOUNTING_FACET_ID,
    name: 'Ground LT',
    baseCapacityKW: 700,
  });
  const roofHt = shell({
    id: SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
    facetId: MOUNTING_FACET_ID,
    name: 'Roof HT',
    baseCapacityKW: 1000,
  });
  const roofLt = shell({
    id: SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
    facetId: MOUNTING_FACET_ID,
    name: 'Roof LT',
    baseCapacityKW: 700,
  });

  const templatesById = new Map<string, ScenarioTemplate>(
    [ht, lt, groundHt, groundLt, roofHt, roofLt].map((t) => [t.id, t])
  );

  it('resolveMountSnapshot selects HT vs LT calibrated ids', () => {
    expect(resolveMountSnapshot('ground', ht, templatesById)).toEqual({
      templateId: groundHt.id,
      selectedVersion: groundHt.version,
    });
    expect(resolveMountSnapshot('ground', lt, templatesById)).toEqual({
      templateId: groundLt.id,
      selectedVersion: groundLt.version,
    });
    expect(resolveMountSnapshot('roof', lt, templatesById)).toEqual({
      templateId: roofLt.id,
      selectedVersion: roofLt.version,
    });
  });

  it('remap preserves ground/rooftop when voltage switches HT ↔ LT', () => {
    const prev: EstimateFacetSelections = {
      [VOLTAGE_CLASS_FACET_ID]: { templateId: ht.id, selectedVersion: ht.version },
      [MOUNTING_FACET_ID]: { templateId: groundHt.id, selectedVersion: groundHt.version },
    };
    const next: EstimateFacetSelections = {
      ...prev,
      [VOLTAGE_CLASS_FACET_ID]: { templateId: lt.id, selectedVersion: lt.version },
      [MOUNTING_FACET_ID]: { templateId: groundHt.id, selectedVersion: groundHt.version },
    };
    const out = remapMountingAfterSelectionsUpdate(prev, next, templatesById);
    expect(out[MOUNTING_FACET_ID]).toEqual({
      templateId: groundLt.id,
      selectedVersion: groundLt.version,
    });

    const unchanged = remapMountingAfterSelectionsUpdate(prev, prev, templatesById);
    expect(unchanged).toBe(prev);
  });

  it('syntheticMountChoices exposes two semantic options keyed to voltage', () => {
    const selections: EstimateFacetSelections = {
      [VOLTAGE_CLASS_FACET_ID]: { templateId: ht.id, selectedVersion: ht.version },
    };
    const opts = syntheticMountChoices(selections, templatesById);
    expect(opts).toEqual([
      { label: 'Ground mount', templateId: groundHt.id },
      { label: 'Rooftop mount', templateId: roofHt.id },
    ]);
  });

  it('mountKindFromTemplateId distinguishes ground vs roof seeds', () => {
    expect(mountKindFromTemplateId(groundLt.id)).toBe('ground');
    expect(mountKindFromTemplateId(roofHt.id)).toBe('roof');
    expect(mountKindFromTemplateId('custom')).toBeNull();
  });
});
