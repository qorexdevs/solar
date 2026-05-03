import type {
  EstimateTotals,
  MaterializedBOM,
  MaterializedLine,
  MaterializedScopeLine,
  ScenarioTemplate,
  SelectedOptions,
} from '@/types';
import {
  isLineIncluded,
  isScopeIncluded,
  scaledQuantity,
  scaledScopeAmount,
  type ScalingContext,
} from './scaling';

export type MaterializeArgs = {
  template: ScenarioTemplate;
  targetCapacityKW: number;
  selectedOptions: SelectedOptions;
};

export type MaterializeResult = {
  materialized: MaterializedBOM;
  totals: EstimateTotals;
};

/**
 * Walk a template at a given target capacity + user selections and produce
 * the materialized BOM + totals. Pure function — no I/O, no store reads.
 *
 * Lines hidden by applicability are still emitted in the materialized BOM
 * (with `applicabilityFiltered: true`) so the UI can explain why an item
 * is missing; they don't contribute to totals.
 */
export function materializeTemplate(args: MaterializeArgs): MaterializeResult {
  const { template, targetCapacityKW, selectedOptions } = args;
  const ctx: ScalingContext = {
    baseCapacityKW: template.baseCapacityKW,
    targetCapacityKW,
    syncType: template.syncType,
    projectType: template.projectType,
  };

  const includedMain = new Set(selectedOptions.mainBomLineIds);
  const includedScope = new Set(selectedOptions.otherScopeIds);

  /* ---- Main BOM ---------------------------------------------------------- */
  const mainLines: MaterializedLine[] = template.mainBom
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((line) => {
      // For optional lines the user-inclusion is membership in `includedMain`.
      // Required and conditional lines ignore this flag.
      const userIncluded = includedMain.has(line.id);

      const { included, applicabilityFiltered } = isLineIncluded(
        line,
        ctx,
        userIncluded
      );
      const userExcluded = !applicabilityFiltered && !included;

      const quantity = included ? scaledQuantity(line, ctx) : 0;
      const subtotal = round2(quantity * line.rate);
      const gst = round2((subtotal * line.gstPercent) / 100);
      const total = round2(subtotal + gst);

      return {
        id: line.id,
        sourceLineId: line.id,
        sequence: line.sequence,
        category: line.category,
        itemName: line.itemName,
        description: line.description,
        make: line.make,
        uom: line.uom,
        scalingType: line.scalingType,
        quantity,
        rate: line.rate,
        gstPercent: line.gstPercent,
        subtotal,
        gst,
        total,
        included,
        applicabilityFiltered,
        userExcluded,
        notes: line.notes,
      };
    });

  /* ---- Other Scope ------------------------------------------------------- */
  const otherLines: MaterializedScopeLine[] = template.otherScope
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((item) => {
      const userIncluded = includedScope.has(item.id);

      const { included, applicabilityFiltered } = isScopeIncluded(
        item,
        ctx,
        userIncluded
      );
      const userExcluded = !applicabilityFiltered && !included;

      const amount = included ? round2(scaledScopeAmount(item, ctx)) : 0;
      const gst = round2((amount * item.gstPercent) / 100);
      const total = round2(amount + gst);

      return {
        id: item.id,
        sourceItemId: item.id,
        sequence: item.sequence,
        scopeName: item.scopeName,
        scalingType: item.scalingType,
        amount,
        gstPercent: item.gstPercent,
        gst,
        total,
        included,
        applicabilityFiltered,
        userExcluded,
        notes: item.notes,
      };
    });

  const totals = computeTotals(mainLines, otherLines, targetCapacityKW);

  return {
    materialized: { mainLines, otherLines },
    totals,
  };
}

/**
 * Sum a materialized BOM to PRD §7 totals. Pure; safe to call from the UI
 * to recompute live without re-running the full materializer.
 */
export function computeTotals(
  mainLines: MaterializedLine[],
  otherLines: MaterializedScopeLine[],
  targetCapacityKW: number
): EstimateTotals {
  let mainBomSubtotal = 0;
  let mainBomGst = 0;
  for (const line of mainLines) {
    if (!line.included) continue;
    mainBomSubtotal += line.subtotal;
    mainBomGst += line.gst;
  }

  let otherScopeSubtotal = 0;
  let otherScopeGst = 0;
  for (const line of otherLines) {
    if (!line.included) continue;
    otherScopeSubtotal += line.amount;
    otherScopeGst += line.gst;
  }

  const grandTotal =
    round2(mainBomSubtotal) +
    round2(mainBomGst) +
    round2(otherScopeSubtotal) +
    round2(otherScopeGst);

  const perKwRate = targetCapacityKW > 0 ? grandTotal / targetCapacityKW : 0;

  return {
    mainBomSubtotal: round2(mainBomSubtotal),
    mainBomGst: round2(mainBomGst),
    otherScopeSubtotal: round2(otherScopeSubtotal),
    otherScopeGst: round2(otherScopeGst),
    grandTotal: round2(grandTotal),
    perKwRate: round2(perKwRate),
  };
}

/**
 * Build the default `SelectedOptions` for a template — every
 * `includedByDefault: true` optional / `optional` line counts as "in".
 * Required and `conditional` lines do not participate (always handled by
 * applicability and aren't user-toggleable).
 */
export function defaultSelectedOptionsFor(
  template: ScenarioTemplate
): SelectedOptions {
  const mainBomLineIds: string[] = [];
  for (const line of template.mainBom) {
    const isOptional = line.isOptional || line.scalingType === 'optional';
    if (!isOptional) continue;
    if (line.includedByDefault) mainBomLineIds.push(line.id);
  }
  const otherScopeIds: string[] = [];
  for (const item of template.otherScope) {
    const isOptional = item.isOptional || item.scalingType === 'optional';
    if (!isOptional) continue;
    if (item.includedByDefault) otherScopeIds.push(item.id);
  }
  return { mainBomLineIds, otherScopeIds };
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
