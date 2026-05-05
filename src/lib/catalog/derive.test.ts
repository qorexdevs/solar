import { describe, expect, it } from 'vitest';
import type {
  MaterialCatalogItem,
  ScenarioTemplate,
  TemplateLine,
} from '@/types';
import {
  computeFacetMembership,
  computeMaterialUsage,
  inferTemplateFacetTags,
  isEmptyFacetFilter,
  matchesFacetFilter,
} from './derive';
import {
  BUSINESS_MODEL_FACET_ID,
  MONITORING_FACET_ID,
  MOUNTING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from '@/lib/facets/constants';

function mat(id: string, patch: Partial<MaterialCatalogItem> = {}): MaterialCatalogItem {
  return {
    id,
    name: id,
    kind: 'bom',
    category: 'modules',
    uom: 'count',
    defaultRate: 1000,
    gstPercent: 18,
    defaultComposeMode: 'max',
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  };
}

function ln(catalogItemId: string, seq = 1): TemplateLine {
  return {
    id: `ln_${catalogItemId}_${seq}`,
    catalogItemId,
    sequence: seq,
    baseQuantity: 1,
    scalingType: 'linear',
    isOptional: false,
    includedByDefault: true,
  };
}

function tpl(patch: Partial<ScenarioTemplate>): ScenarioTemplate {
  return {
    id: 'tpl_x',
    name: 'X',
    facetId: VOLTAGE_CLASS_FACET_ID,
    baseCapacityKW: 1000,
    status: 'active',
    version: 'v1',
    effectiveFrom: 0,
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    lines: [],
    ...patch,
  };
}

describe('computeMaterialUsage', () => {
  it('counts references and de-dupes templateIds', () => {
    const cat = [mat('cat-a'), mat('cat-b'), mat('cat-orphan')];
    const t1 = tpl({ id: 't1', lines: [ln('cat-a', 1), ln('cat-a', 2), ln('cat-b', 3)] });
    const t2 = tpl({ id: 't2', lines: [ln('cat-a', 1)] });
    const usage = computeMaterialUsage(cat, [t1, t2]);
    expect(usage.get('cat-a')).toEqual({ templateIds: ['t1', 't2'], count: 3 });
    expect(usage.get('cat-b')).toEqual({ templateIds: ['t1'], count: 1 });
    expect(usage.get('cat-orphan')).toEqual({ templateIds: [], count: 0 });
  });

  it('ignores lines pointing to unknown catalog ids', () => {
    const cat = [mat('cat-a')];
    const t1 = tpl({ id: 't1', lines: [ln('cat-missing'), ln('cat-a')] });
    const usage = computeMaterialUsage(cat, [t1]);
    expect(usage.get('cat-a')).toEqual({ templateIds: ['t1'], count: 1 });
    expect(usage.has('cat-missing')).toBe(false);
  });
});

describe('inferTemplateFacetTags', () => {
  it('maps voltageClass facet templates from syncType', () => {
    expect(inferTemplateFacetTags(tpl({ syncType: 'HT' }))).toMatchObject({
      voltageClass: ['HT'],
    });
    expect(inferTemplateFacetTags(tpl({ syncType: 'LT' }))).toMatchObject({
      voltageClass: ['LT'],
    });
  });

  it('parses mounting from name when facet is mounting', () => {
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Rooftop mount — HT base', facetId: MOUNTING_FACET_ID })
      ).mounting
    ).toEqual(['rooftop']);
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Ground mount — LT base', facetId: MOUNTING_FACET_ID })
      ).mounting
    ).toEqual(['ground']);
  });

  it('parses business model captive vs openAccess', () => {
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Closed captive', facetId: BUSINESS_MODEL_FACET_ID })
      ).businessModel
    ).toEqual(['captive']);
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Open access adders', facetId: BUSINESS_MODEL_FACET_ID })
      ).businessModel
    ).toEqual(['openAccess']);
  });

  it('parses monitoring advanced vs basic', () => {
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Monitoring — advanced SCADA uplift', facetId: MONITORING_FACET_ID })
      ).monitoring
    ).toEqual(['advanced']);
    expect(
      inferTemplateFacetTags(
        tpl({ name: 'Monitoring — baseline', facetId: MONITORING_FACET_ID })
      ).monitoring
    ).toEqual(['basic']);
  });

  it('does not infer mounting for unrelated facets (avoids false positives)', () => {
    const t = tpl({
      name: 'Some HT template that mentions roof in passing',
      facetId: VOLTAGE_CLASS_FACET_ID,
      syncType: 'HT',
    });
    const tags = inferTemplateFacetTags(t);
    expect(tags.mounting).toBeUndefined();
    expect(tags.voltageClass).toEqual(['HT']);
  });
});

describe('computeFacetMembership', () => {
  it('unions template-derived tags with explicit material facetTags', () => {
    const cat = [
      mat('cat-pv'),
      mat('cat-orphan', { facetTags: { mounting: ['rooftop'] } }),
    ];
    const t1 = tpl({
      id: 't1',
      name: 'HT',
      facetId: VOLTAGE_CLASS_FACET_ID,
      syncType: 'HT',
      lines: [ln('cat-pv')],
    });
    const t2 = tpl({
      id: 't2',
      name: 'Rooftop mount — HT base',
      facetId: MOUNTING_FACET_ID,
      lines: [ln('cat-pv')],
    });
    const eff = computeFacetMembership(cat, [t1, t2]);
    expect(eff.get('cat-pv')).toMatchObject({
      voltageClass: ['HT'],
      mounting: ['rooftop'],
    });
    expect(eff.get('cat-orphan')).toEqual({ mounting: ['rooftop'] });
  });

  it('merges values across multiple templates without duplicates', () => {
    const cat = [mat('cat-pv')];
    const tHt = tpl({ id: 't1', syncType: 'HT', lines: [ln('cat-pv')] });
    const tLt = tpl({ id: 't2', syncType: 'LT', lines: [ln('cat-pv')] });
    const eff = computeFacetMembership(cat, [tHt, tLt]);
    expect(eff.get('cat-pv')!.voltageClass!.sort()).toEqual(['HT', 'LT']);
  });
});

describe('matchesFacetFilter', () => {
  it('empty filter matches everything', () => {
    expect(isEmptyFacetFilter({})).toBe(true);
    expect(matchesFacetFilter({}, {})).toBe(true);
    expect(matchesFacetFilter({ voltageClass: ['HT'] }, {})).toBe(true);
    expect(matchesFacetFilter({}, { mounting: [] })).toBe(true);
  });

  it('AND across facets', () => {
    const eff = { voltageClass: ['HT' as const], mounting: ['rooftop' as const] };
    expect(
      matchesFacetFilter(eff, { voltageClass: ['HT'], mounting: ['rooftop'] })
    ).toBe(true);
    expect(
      matchesFacetFilter(eff, { voltageClass: ['HT'], mounting: ['ground'] })
    ).toBe(false);
  });

  it('OR within a facet', () => {
    const eff = { voltageClass: ['LT' as const] };
    expect(
      matchesFacetFilter(eff, { voltageClass: ['HT', 'LT'] })
    ).toBe(true);
  });

  it('excludes materials missing constrained facet entirely', () => {
    expect(
      matchesFacetFilter({}, { mounting: ['rooftop'] })
    ).toBe(false);
  });
});
