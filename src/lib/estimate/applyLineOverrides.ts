import {
  type EstimateLineOverridesMap,
  type EstimateTotals,
  type MaterializedBOM,
  type MaterializedLine,
  type MaterializedScopeLine,
} from '@/types';
import { computeTotals } from '@/lib/templates/materialize';

/**
 * Overlay user-edited per-line values on top of a materialized BOM and
 * derive the resulting totals. Keeps the original `materialized` object
 * untouched (overrides are transient and live on `Estimate.lineOverrides`).
 *
 * Override semantics:
 *  - `quantity` / `rate` recompute `subtotal`, `gst`, `total` for that row.
 *  - `itemName` / `uom` are display-only.
 *  - Other Scope rows accept `quantity` (× rate = amount) and `rate` patches
 *    so the same UI can edit lump-sum scope without special casing.
 */
export type DisplayBOM = {
  mainLines: MaterializedLine[];
  otherLines: MaterializedScopeLine[];
};

export type AppliedOverrides = {
  display: DisplayBOM;
  totals: EstimateTotals;
};

export function applyLineOverrides(
  materialized: MaterializedBOM,
  overrides: EstimateLineOverridesMap | undefined,
  targetCapacityKW: number
): AppliedOverrides {
  if (!overrides || Object.keys(overrides).length === 0) {
    return {
      display: {
        mainLines: materialized.mainLines,
        otherLines: materialized.otherLines,
      },
      totals: computeTotals(
        materialized.mainLines,
        materialized.otherLines,
        targetCapacityKW
      ),
    };
  }

  const mainLines = materialized.mainLines.map((line) =>
    applyMain(line, overrides[line.id])
  );
  const otherLines = materialized.otherLines.map((line) =>
    applyScope(line, overrides[line.id])
  );

  return {
    display: { mainLines, otherLines },
    totals: computeTotals(mainLines, otherLines, targetCapacityKW),
  };
}

function applyMain(
  line: MaterializedLine,
  patch: EstimateLineOverridesMap[string] | undefined
): MaterializedLine {
  if (!patch) return line;

  const quantity = numberOr(patch.quantity, line.quantity);
  const rate = numberOr(patch.rate, line.rate);
  const itemName = patch.itemName ?? line.itemName;
  const uom = patch.uom ?? line.uom;

  const subtotal = line.included ? round2(quantity * rate) : 0;
  const gst = line.included ? round2((subtotal * line.gstPercent) / 100) : 0;
  const total = round2(subtotal + gst);

  return {
    ...line,
    quantity,
    rate,
    itemName,
    uom,
    subtotal,
    gst,
    total,
  };
}

function applyScope(
  line: MaterializedScopeLine,
  patch: EstimateLineOverridesMap[string] | undefined
): MaterializedScopeLine {
  if (!patch) return line;

  // For scope rows, qty * rate maps to `amount`. We treat undefined patches
  // as no-op so the editor can choose to override only one side.
  const baseAmount = line.amount;
  const newAmount =
    patch.quantity !== undefined && patch.rate !== undefined
      ? round2(patch.quantity * patch.rate)
      : patch.rate !== undefined
      ? patch.rate
      : patch.quantity !== undefined
      ? patch.quantity
      : baseAmount;
  const itemName = patch.itemName ?? line.scopeName;
  const amount = line.included ? newAmount : 0;
  const gst = line.included ? round2((amount * line.gstPercent) / 100) : 0;
  const total = round2(amount + gst);

  return {
    ...line,
    scopeName: itemName,
    amount,
    gst,
    total,
  };
}

function numberOr(v: number | undefined, fallback: number): number {
  if (v === undefined || !Number.isFinite(v)) return fallback;
  return v;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Did the user override anything for this line id? */
export function hasLineOverride(
  overrides: EstimateLineOverridesMap | undefined,
  lineId: string
): boolean {
  if (!overrides) return false;
  const patch = overrides[lineId];
  if (!patch) return false;
  return (
    patch.itemName !== undefined ||
    patch.uom !== undefined ||
    patch.quantity !== undefined ||
    patch.rate !== undefined
  );
}

/** Boolean: any override at all on the estimate. */
export function hasAnyLineOverride(
  overrides: EstimateLineOverridesMap | undefined
): boolean {
  if (!overrides) return false;
  return Object.keys(overrides).some((k) => hasLineOverride(overrides, k));
}
