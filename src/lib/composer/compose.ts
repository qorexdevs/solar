import type {
  ComposeMode,
  ComposeOverridesMap,
  EstimateFacetSelections,
  EstimateTotals,
  LineContributionSlice,
  MaterialCatalogItem,
  MaterializedBOM,
  MaterializedLine,
  MaterializedScopeLine,
  ScenarioTemplate,
  SelectedOptionsPerTemplate,
  TemplateFacet,
} from '@/types';
import type { ScalingContext } from '@/lib/templates/scaling';
import {
  isLineIncluded,
  isScopeIncluded,
  scaledQuantity,
  scaledScopeAmount,
} from '@/lib/templates/scaling';
import { computeTotals } from '@/lib/templates/materialize';
import { templateLineToBomLike, templateLineToScopeLike } from './resolve';
import { VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';

export type ComposeEstimateArgs = {
  facets: TemplateFacet[];
  selections: EstimateFacetSelections;
  selectedOptionsPerTemplate: SelectedOptionsPerTemplate;
  composeOverrides?: ComposeOverridesMap | undefined;
  targetCapacityKW: number;
  catalogItems: MaterialCatalogItem[];
  templates: ScenarioTemplate[];
  /** Which facet's chosen template drives `ScalingContext.syncType/projectType`. */
  engineFacetId?: string | undefined;
};

export type ComposeResult = {
  materialized: MaterializedBOM;
  totals: EstimateTotals;
};

type BomPreMerge = {
  kind: 'bom';
  catalogItemId: string;
  templateId: string;
  facetId: string;
  lineId: string;
  sequence: number;
  scalingType: MaterializedLine['scalingType'];
  quantity: number;
  rate: number;
  gstPercent: number;
  included: boolean;
  applicabilityFiltered: boolean;
  userExcluded: boolean;
  category: MaterializedLine['category'];
  itemName: string;
  description: string;
  make?: string;
  uom: MaterializedLine['uom'];
  notes?: string;
  lineCompose?: ComposeMode;
};

type ScopePreMerge = {
  kind: 'scope';
  catalogItemId: string;
  templateId: string;
  facetId: string;
  lineId: string;
  sequence: number;
  scalingType: MaterializedScopeLine['scalingType'];
  amount: number;
  gstPercent: number;
  included: boolean;
  applicabilityFiltered: boolean;
  userExcluded: boolean;
  scopeName: string;
  notes?: string;
  lineCompose?: ComposeMode;
};

type PreMerged = BomPreMerge | ScopePreMerge;

export function resolveEngineTemplate(
  selections: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>,
  engineFacetId: string = VOLTAGE_CLASS_FACET_ID
): ScenarioTemplate | undefined {
  const snap = selections[engineFacetId];
  if (!snap?.templateId) return undefined;
  return templatesById.get(snap.templateId);
}

/** Default toggles every optional template line flagged `includedByDefault`. */
export function defaultSelectedOptionsFromSelections(
  selections: EstimateFacetSelections,
  templatesById: Map<string, ScenarioTemplate>
): SelectedOptionsPerTemplate {
  const out: SelectedOptionsPerTemplate = {};
  for (const snap of Object.values(selections)) {
    if (!snap?.templateId) continue;
    const t = templatesById.get(snap.templateId);
    if (!t) continue;
    const lineIds: string[] = [];
    for (const line of t.lines) {
      const isOptional =
        line.isOptional || line.scalingType === 'optional';
      if (!isOptional) continue;
      if (line.includedByDefault) lineIds.push(line.id);
    }
    out[t.id] = { lineIds };
  }
  return out;
}

export function composeEstimate(args: ComposeEstimateArgs): ComposeResult {
  const {
    facets,
    selections,
    selectedOptionsPerTemplate,
    composeOverrides,
    targetCapacityKW,
    catalogItems,
    templates,
  } = args;
  const engineFacetId = args.engineFacetId ?? VOLTAGE_CLASS_FACET_ID;

  const catalogById = new Map<string, MaterialCatalogItem>(
    catalogItems.map((c) => [c.id, c])
  );
  const templatesById = new Map<string, ScenarioTemplate>(
    templates.map((t) => [t.id, t])
  );

  const engineTpl = resolveEngineTemplate(
    selections,
    templatesById,
    engineFacetId
  );

  const sortedFacets = [...facets].sort((a, b) => a.sequence - b.sequence);
  const pre: PreMerged[] = [];

  for (const facet of sortedFacets) {
    const snap = selections[facet.id];
    if (!snap?.templateId) continue;
    const tpl = templatesById.get(snap.templateId);
    if (!tpl) continue;

    const lineOptSet = new Set(
      selectedOptionsPerTemplate[tpl.id]?.lineIds ?? []
    );

    const ctx: ScalingContext = {
      baseCapacityKW: tpl.baseCapacityKW,
      targetCapacityKW,
      syncType: engineTpl?.syncType ?? 'HT',
      projectType: engineTpl?.projectType ?? 'utility',
    };

    const rows = tpl.lines.slice().sort((a, b) => a.sequence - b.sequence);
    for (const line of rows) {
      const cat = catalogById.get(line.catalogItemId);
      if (!cat || cat.status === 'archived') continue;

      if (cat.kind === 'bom') {
        const bomLike = templateLineToBomLike(line, cat, tpl.name);
        const userIncluded =
          bomLike.scalingType === 'optional' || bomLike.isOptional
            ? lineOptSet.has(line.id)
            : true;
        const { included, applicabilityFiltered } = isLineIncluded(
          bomLike,
          ctx,
          userIncluded
        );
        const userExcluded = !applicabilityFiltered && !included;

        let quantity = 0;
        if (included) {
          quantity = scaledQuantity(bomLike, ctx);
        }

        pre.push({
          kind: 'bom',
          catalogItemId: cat.id,
          templateId: tpl.id,
          facetId: facet.id,
          lineId: line.id,
          sequence: line.sequence,
          scalingType: line.scalingType,
          quantity,
          rate: bomLike.rate,
          gstPercent: bomLike.gstPercent,
          included,
          applicabilityFiltered,
          userExcluded,
          category: cat.category,
          itemName: cat.name,
          description: cat.description ?? '',
          make: cat.make,
          uom: bomLike.uom,
          notes: bomLike.notes,
          lineCompose: line.composeModeOverride,
        });
      } else {
        const scopeLike = templateLineToScopeLike(line, cat, tpl.name);
        const userIncluded =
          scopeLike.scalingType === 'optional' || scopeLike.isOptional
            ? lineOptSet.has(line.id)
            : true;
        const { included, applicabilityFiltered } = isScopeIncluded(
          scopeLike,
          ctx,
          userIncluded
        );
        const userExcluded = !applicabilityFiltered && !included;

        let amount = 0;
        if (included) {
          amount = scaledScopeAmount(scopeLike, ctx);
        }

        pre.push({
          kind: 'scope',
          catalogItemId: cat.id,
          templateId: tpl.id,
          facetId: facet.id,
          lineId: line.id,
          sequence: line.sequence,
          scalingType: line.scalingType,
          amount,
          gstPercent: scopeLike.gstPercent,
          included,
          applicabilityFiltered,
          userExcluded,
          scopeName: cat.name,
          notes: scopeLike.notes,
          lineCompose: line.composeModeOverride,
        });
      }
    }
  }

  const bomBuckets = new Map<string, BomPreMerge[]>();
  const scopeBuckets = new Map<string, ScopePreMerge[]>();

  for (const row of pre) {
    if (row.kind === 'bom') {
      const arr = bomBuckets.get(row.catalogItemId) ?? [];
      arr.push(row);
      bomBuckets.set(row.catalogItemId, arr);
    } else {
      const arr = scopeBuckets.get(row.catalogItemId) ?? [];
      arr.push(row);
      scopeBuckets.set(row.catalogItemId, arr);
    }
  }

  const mainLines: MaterializedLine[] = [];
  for (const [catalogItemId, bucket] of bomBuckets.entries()) {
    const cat = catalogById.get(catalogItemId)!;
    const visible = bucket.filter((b) => !b.applicabilityFiltered);
    if (visible.length === 0) continue;

    const active = visible.filter((b) => b.included);
    const composeMode = resolveComposeMode(
      catalogItemId,
      composeOverrides,
      cat.defaultComposeMode,
      bucket.map((b) => b.lineCompose)
    );

    const minSeq = Math.min(...visible.map((b) => b.sequence));

    let quantity = 0;
    let rate = visible[visible.length - 1]!.rate;
    let gstPercent = visible[visible.length - 1]!.gstPercent;
    let scalingType = visible[visible.length - 1]!.scalingType;
    const included = active.length > 0;

    if (included) {
      const qs = active.map((b) => b.quantity);
      quantity =
        composeMode === 'max' ? Math.max(...qs) : qs.reduce((a, b) => a + b, 0);
      rate = active[active.length - 1]!.rate;
      gstPercent = active[active.length - 1]!.gstPercent;
      scalingType = active[active.length - 1]!.scalingType;
    }

    const subtotal = included ? round2(quantity * rate) : 0;
    const gst = included ? round2((subtotal * gstPercent) / 100) : 0;
    const total = round2(subtotal + gst);

    const contributedBy: LineContributionSlice[] = active.map((b) => ({
      templateId: b.templateId,
      facetId: b.facetId,
      lineId: b.lineId,
      quantity: b.quantity,
    }));

    mainLines.push({
      id: catalogItemId,
      catalogItemId,
      composeMode,
      contributedBy,
      sourceLineIds: [...new Set(bucket.map((b) => b.lineId))],
      sourceLineId: bucket[0]!.lineId,
      sequence: minSeq,
      category: cat.category,
      itemName: bucket[0]!.itemName,
      description: bucket[0]!.description,
      make: bucket[0]!.make,
      uom: bucket[0]!.uom,
      scalingType,
      quantity,
      rate,
      gstPercent,
      subtotal,
      gst,
      total,
      included,
      applicabilityFiltered: false,
      userExcluded: !included && visible.some((b) => b.userExcluded),
      notes: bucket[0]!.notes,
    });
  }

  const otherLines: MaterializedScopeLine[] = [];
  for (const [catalogItemId, bucket] of scopeBuckets.entries()) {
    const cat = catalogById.get(catalogItemId)!;
    const visible = bucket.filter((b) => !b.applicabilityFiltered);
    if (visible.length === 0) continue;

    const active = visible.filter((b) => b.included);
    const composeMode = resolveComposeMode(
      catalogItemId,
      composeOverrides,
      cat.defaultComposeMode,
      bucket.map((b) => b.lineCompose)
    );

    const minSeq = Math.min(...visible.map((b) => b.sequence));

    let amount = 0;
    let gstPercent = visible[visible.length - 1]!.gstPercent;
    let scalingType = (
      active.length > 0 ? active[active.length - 1] : visible[visible.length - 1]
    )!.scalingType;
    const included = active.length > 0;

    if (included) {
      const amounts = active.map((b) => b.amount);
      amount =
        composeMode === 'max'
          ? Math.max(...amounts)
          : amounts.reduce((a, b) => a + b, 0);
      gstPercent = active[active.length - 1]!.gstPercent;
      scalingType = active[active.length - 1]!.scalingType;
    }

    const gst = included ? round2((amount * gstPercent) / 100) : 0;
    const total = round2(amount + gst);

    const contributedBy: LineContributionSlice[] = active.map((b) => ({
      templateId: b.templateId,
      facetId: b.facetId,
      lineId: b.lineId,
      amount: b.amount,
    }));

    otherLines.push({
      id: catalogItemId,
      catalogItemId,
      composeMode,
      contributedBy,
      sourceItemIds: [...new Set(bucket.map((b) => b.lineId))],
      sourceItemId: bucket[0]!.lineId,
      sequence: minSeq,
      scopeName: bucket[0]!.scopeName,
      scalingType,
      amount,
      gstPercent,
      gst,
      total,
      included,
      applicabilityFiltered: false,
      userExcluded: !included && visible.some((b) => b.userExcluded),
      notes: bucket[0]!.notes,
    });
  }

  mainLines.sort((a, b) => a.sequence - b.sequence || a.itemName.localeCompare(b.itemName));
  otherLines.sort((a, b) => a.sequence - b.sequence || a.scopeName.localeCompare(b.scopeName));

  const totals = computeTotals(mainLines, otherLines, targetCapacityKW);

  return { materialized: { mainLines, otherLines }, totals };
}

function resolveComposeMode(
  catalogItemId: string,
  overrides: ComposeOverridesMap | undefined,
  catalogDefault: ComposeMode,
  lineOverrides: (ComposeMode | undefined)[]
): ComposeMode {
  if (overrides?.[catalogItemId]) return overrides[catalogItemId]!;
  let mode = catalogDefault;
  for (const o of lineOverrides) {
    if (o) mode = o;
  }
  return mode;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
