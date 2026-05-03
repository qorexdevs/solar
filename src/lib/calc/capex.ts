import {
  BOM_CATEGORY_LABELS,
  type BOMCategory,
  type BOMUom,
  type MaterializedBOM,
  type MaterializedLine,
  type MaterializedScopeLine,
} from '@/types';

/**
 * Per-line summary of a Main BOM row in the materialized BOM. Mirrors the
 * old shape so the existing CostBreakdownPanel/donut/exporters can keep
 * referencing the same fields.
 */
export type CapexLineSummary = {
  id: string;
  itemId?: string;
  name: string;
  category: BOMCategory;
  uom: BOMUom;
  quantity: number;
  unitPrice: number;
  taxPct: number;
  /** quantity × unitPrice (pre-tax). 0 when excluded. */
  subtotal: number;
  /** subtotal × taxPct / 100. 0 when excluded. */
  tax: number;
  /** subtotal + tax. 0 when excluded. */
  total: number;
  excluded: boolean;
};

export type CapexCategoryGroup = {
  category: BOMCategory;
  label: string;
  lines: CapexLineSummary[];
  subtotal: number;
  tax: number;
  total: number;
};

/**
 * Other Scope rows surfaced as a synthetic "scope" group so the donut and
 * cost-breakdown panel can render them alongside Main BOM categories.
 */
export const OTHER_SCOPE_GROUP_LABEL = 'Other Scope of Works';

export type CapexBreakdown = {
  /** Per-line, ordered by category then sequence. */
  lines: CapexLineSummary[];
  /** Grouped by category for charts and exports. */
  byCategory: Record<string, CapexCategoryGroup>;
  /** Pre-tax sum across non-excluded Main BOM lines. */
  mainSubtotal: number;
  /** Sum of Main BOM GST. */
  mainTax: number;
  /** Pre-tax sum across non-excluded Other Scope lines. */
  otherSubtotal: number;
  /** Sum of Other Scope GST. */
  otherTax: number;
  /** Combined pre-tax sum (Main + Other). */
  subtotal: number;
  /** Combined GST sum (Main + Other). */
  tax: number;
  /**
   * subtotal + tax — the canonical CAPEX number consumed by finance modules
   * (loan sizing, equity, O&M base). Includes Other Scope per PRD §7.
   */
  total: number;
};

function summarizeMain(line: MaterializedLine): CapexLineSummary {
  return {
    id: line.id,
    itemId: line.sourceLineId,
    name: line.itemName || line.description || 'Item',
    category: line.category,
    uom: line.uom,
    quantity: line.quantity,
    unitPrice: line.rate,
    taxPct: line.gstPercent,
    subtotal: line.included ? line.subtotal : 0,
    tax: line.included ? line.gst : 0,
    total: line.included ? line.total : 0,
    excluded: !line.included,
  };
}

function summarizeScope(line: MaterializedScopeLine): CapexLineSummary {
  return {
    id: `scope_${line.id}`,
    itemId: line.sourceItemId,
    name: line.scopeName || 'Other Scope',
    // Scope items don't have a real category; "misc" keeps them visible in
    // the donut without inventing a new color.
    category: 'misc',
    uom: 'lot',
    quantity: line.included ? 1 : 0,
    unitPrice: line.amount,
    taxPct: line.gstPercent,
    subtotal: line.included ? line.amount : 0,
    tax: line.included ? line.gst : 0,
    total: line.included ? line.total : 0,
    excluded: !line.included,
  };
}

/**
 * Build a `CapexBreakdown` from a materialized BOM. Other Scope lines roll
 * into both the per-category group ("Other Scope of Works") and the global
 * `total` so finance and reporting see one combined CAPEX number.
 */
export function capexBreakdown(materialized: MaterializedBOM): CapexBreakdown {
  const lineSummaries: CapexLineSummary[] = [];

  for (const line of materialized.mainLines) {
    lineSummaries.push(summarizeMain(line));
  }

  const scopeSummaries: CapexLineSummary[] = materialized.otherLines.map(summarizeScope);

  const byCategory: Record<string, CapexCategoryGroup> = {};
  let mainSubtotal = 0;
  let mainTax = 0;

  for (const line of lineSummaries) {
    let group = byCategory[line.category];
    if (!group) {
      group = {
        category: line.category,
        label: BOM_CATEGORY_LABELS[line.category] ?? line.category,
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      };
      byCategory[line.category] = group;
    }
    group.lines.push(line);
    if (!line.excluded) {
      group.subtotal += line.subtotal;
      group.tax += line.tax;
      group.total += line.total;
      mainSubtotal += line.subtotal;
      mainTax += line.tax;
    }
  }

  let otherSubtotal = 0;
  let otherTax = 0;

  if (scopeSummaries.length > 0) {
    const scopeGroup: CapexCategoryGroup = {
      category: 'misc',
      label: OTHER_SCOPE_GROUP_LABEL,
      lines: scopeSummaries,
      subtotal: 0,
      tax: 0,
      total: 0,
    };
    for (const line of scopeSummaries) {
      if (!line.excluded) {
        scopeGroup.subtotal += line.subtotal;
        scopeGroup.tax += line.tax;
        scopeGroup.total += line.total;
        otherSubtotal += line.subtotal;
        otherTax += line.tax;
      }
    }
    byCategory['__other_scope__'] = scopeGroup;
    lineSummaries.push(...scopeSummaries);
  }

  const subtotal = mainSubtotal + otherSubtotal;
  const tax = mainTax + otherTax;

  return {
    lines: lineSummaries,
    byCategory,
    mainSubtotal,
    mainTax,
    otherSubtotal,
    otherTax,
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
