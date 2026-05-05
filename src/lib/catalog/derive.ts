/**
 * Pure derivation helpers for the Material Catalog hybrid filter.
 *
 *  - `computeMaterialUsage` — which templates each catalog item is used in.
 *  - `computeFacetMembership` — facet-value tags derived from template
 *    metadata (template.syncType + facetId-aware name heuristics) unioned
 *    with the material's own explicit `facetTags` overrides.
 *  - `matchesFacetFilter` — AND across selected facets, OR within a facet's
 *    chosen values; an empty filter selects everything.
 */
import type {
  MaterialCatalogItem,
  MaterialFacetTags,
  MountingValue,
  BusinessModelValue,
  MonitoringValue,
  VoltageClassValue,
  ScenarioTemplate,
} from '@/types';
import {
  BUSINESS_MODEL_FACET_ID,
  MONITORING_FACET_ID,
  MOUNTING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from '@/lib/facets/constants';

export type MaterialUsage = {
  /** Template ids that reference this material (de-duped, stable order). */
  templateIds: string[];
  /** Total `TemplateLine` references across all templates. */
  count: number;
};

/**
 * For each catalog item, list every template that has at least one line
 * pointing to it, plus a total reference count (lines may repeat per template).
 */
export function computeMaterialUsage(
  catalog: MaterialCatalogItem[],
  templates: ScenarioTemplate[]
): Map<string, MaterialUsage> {
  const out = new Map<string, MaterialUsage>();
  for (const item of catalog) {
    out.set(item.id, { templateIds: [], count: 0 });
  }
  for (const tpl of templates) {
    for (const line of tpl.lines) {
      const usage = out.get(line.catalogItemId);
      if (!usage) continue;
      usage.count += 1;
      if (!usage.templateIds.includes(tpl.id)) {
        usage.templateIds.push(tpl.id);
      }
    }
  }
  return out;
}

/**
 * Heuristically infer the facet-value tag set for a single template.
 *
 * - `voltageClass`: from `template.syncType` (only meaningful HT/LT vals).
 * - `mounting` / `businessModel` / `monitoring`: name-based heuristic, only
 *   when the template belongs to that facet (avoids false positives).
 */
export function inferTemplateFacetTags(
  tpl: ScenarioTemplate
): MaterialFacetTags {
  const tags: MaterialFacetTags = {};

  if (tpl.syncType === 'HT' || tpl.syncType === 'LT') {
    tags.voltageClass = [tpl.syncType];
  }

  const lname = (tpl.name ?? '').toLowerCase();
  const lid = (tpl.id ?? '').toLowerCase();
  const blob = `${lname} ${lid}`;

  if (tpl.facetId === MOUNTING_FACET_ID) {
    const m = new Set<MountingValue>();
    if (blob.includes('roof')) m.add('rooftop');
    if (blob.includes('ground')) m.add('ground');
    if (m.size > 0) tags.mounting = [...m];
  } else if (tpl.facetId === BUSINESS_MODEL_FACET_ID) {
    const b = new Set<BusinessModelValue>();
    if (blob.includes('open')) b.add('openAccess');
    if (blob.includes('captive') || blob.includes('closed')) b.add('captive');
    if (b.size > 0) tags.businessModel = [...b];
  } else if (tpl.facetId === MONITORING_FACET_ID) {
    const mon = new Set<MonitoringValue>();
    if (blob.includes('advanced') || blob.includes('scada')) mon.add('advanced');
    if (
      blob.includes('baseline') ||
      blob.includes('basic') ||
      blob.includes('none') ||
      blob.includes('no extra')
    ) {
      mon.add('basic');
    }
    if (mon.size > 0) tags.monitoring = [...mon];
  } else if (tpl.facetId === VOLTAGE_CLASS_FACET_ID) {
    if (!tags.voltageClass) {
      const v = new Set<VoltageClassValue>();
      if (/\bht\b/.test(blob)) v.add('HT');
      if (/\blt\b/.test(blob)) v.add('LT');
      if (v.size > 0) tags.voltageClass = [...v];
    }
  }

  return tags;
}

/**
 * Per-material effective facet tag set: union of all templates' inferred
 * tags (across templates that reference the material) ∪ the material's
 * explicit `facetTags`.
 *
 * Archived templates and archived catalog items are still indexed; UI is
 * responsible for its own visibility rules.
 */
export function computeFacetMembership(
  catalog: MaterialCatalogItem[],
  templates: ScenarioTemplate[]
): Map<string, MaterialFacetTags> {
  const tplTags = new Map<string, MaterialFacetTags>();
  for (const tpl of templates) {
    tplTags.set(tpl.id, inferTemplateFacetTags(tpl));
  }

  const usage = computeMaterialUsage(catalog, templates);
  const out = new Map<string, MaterialFacetTags>();
  for (const item of catalog) {
    const merged: MaterialFacetTags = {};
    const u = usage.get(item.id);
    if (u) {
      for (const tplId of u.templateIds) {
        const t = tplTags.get(tplId);
        if (t) mergeFacetTagsInto(merged, t);
      }
    }
    if (item.facetTags) mergeFacetTagsInto(merged, item.facetTags);
    out.set(item.id, merged);
  }
  return out;
}

function mergeFacetTagsInto(
  target: MaterialFacetTags,
  src: MaterialFacetTags
): void {
  for (const key of Object.keys(src) as (keyof MaterialFacetTags)[]) {
    const incoming = src[key];
    if (!incoming || incoming.length === 0) continue;
    const existing = (target[key] ?? []) as string[];
    const set = new Set<string>(existing);
    for (const v of incoming) set.add(v);
    (target as Record<keyof MaterialFacetTags, string[]>)[key] = [...set];
  }
}

/**
 * Selected filter values per facet. An entry with an empty array (or a
 * facet that's omitted) imposes no constraint on that facet.
 */
export type FacetFilterSelection = MaterialFacetTags;

/** True if the filter is empty — used by the UI to skip work entirely. */
export function isEmptyFacetFilter(filter: FacetFilterSelection): boolean {
  return (Object.keys(filter) as (keyof FacetFilterSelection)[]).every(
    (k) => !filter[k] || filter[k]!.length === 0
  );
}

/**
 * Return true when the material's effective facet tags satisfy the filter:
 * AND across facets that are constrained, OR within each facet's chosen vals.
 *
 * If a facet is constrained but the material has no values on that facet,
 * the material is excluded.
 */
export function matchesFacetFilter(
  effective: MaterialFacetTags,
  filter: FacetFilterSelection
): boolean {
  if (isEmptyFacetFilter(filter)) return true;
  for (const key of Object.keys(filter) as (keyof FacetFilterSelection)[]) {
    const wanted = filter[key];
    if (!wanted || wanted.length === 0) continue;
    const have = (effective[key] ?? []) as string[];
    if (have.length === 0) return false;
    const ok = wanted.some((w) => have.includes(w as never));
    if (!ok) return false;
  }
  return true;
}
