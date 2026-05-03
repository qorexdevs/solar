import type {
  BOMLineItem,
  MaterialCatalogItem,
  OtherScopeItem,
  TemplateLine,
} from '@/types';
import type { BOMUom } from '@/types';

/**
 * Build a BOM line shape compatible with scaling / inclusion helpers by
 * joining a `TemplateLine` with its catalog item.
 */
export function templateLineToBomLike(
  line: TemplateLine,
  cat: MaterialCatalogItem,
  tplName: string
): BOMLineItem {
  if (cat.kind !== 'bom') {
    throw new Error(
      `catalogItem ${cat.id} is scope kind — cannot coerce to BOM (template "${tplName}", line ${line.id})`
    );
  }
  const q = line.baseQuantity;
  if (!Number.isFinite(q ?? NaN)) {
    throw new Error(
      `Missing baseQuantity on BOM template line "${line.id}" for catalog "${cat.id}"`
    );
  }
  const uom = (line.uomOverride ?? cat.uom) as BOMUom | undefined;
  if (!uom) throw new Error(`Missing UOM for catalog item ${cat.id}`);
  const rate = line.rateOverride ?? cat.defaultRate ?? 0;

  return {
    id: line.id,
    sequence: line.sequence,
    category: cat.category,
    itemName: cat.name,
    description: cat.description ?? '',
    make: cat.make,
    uom,
    baseQuantity: q!,
    rate,
    gstPercent: line.gstPercentOverride ?? cat.gstPercent,
    scalingType: line.scalingType,
    scalingFormula: line.scalingFormula,
    unitCapacityKW: line.unitCapacityKW,
    applicability: line.applicability,
    isOptional: line.isOptional,
    includedByDefault: line.includedByDefault,
    notes: line.notes ?? cat.notes,
  };
}

export function templateLineToScopeLike(
  line: TemplateLine,
  cat: MaterialCatalogItem,
  tplName: string
): OtherScopeItem {
  if (cat.kind !== 'scope') {
    throw new Error(
      `catalogItem ${cat.id} is bom kind — cannot coerce to scope (template "${tplName}", line ${line.id})`
    );
  }
  const baseAmount = line.baseAmount ?? cat.defaultAmount ?? 0;
  if (!Number.isFinite(baseAmount)) {
    throw new Error(`Invalid baseAmount for scope line "${line.id}" (${cat.id})`);
  }

  return {
    id: line.id,
    sequence: line.sequence,
    scopeName: cat.name,
    baseAmount,
    gstPercent: line.gstPercentOverride ?? cat.gstPercent,
    scalingType: line.scalingType,
    scalingFormula: line.scalingFormula,
    unitCapacityKW: line.unitCapacityKW,
    applicability: line.applicability,
    isOptional: line.isOptional,
    includedByDefault: line.includedByDefault,
    notes: line.notes ?? cat.notes,
  };
}
