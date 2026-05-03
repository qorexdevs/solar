import {
  BOM_CATEGORIES,
  BOM_UOMS,
  type BOMLineItem,
  type OtherScopeItem,
  type ScalingType,
  type ScenarioTemplate,
} from '@/types';
import { evalFormula, type ScalingContext } from './scaling';

export type ValidationIssue = {
  /** Hierarchical path so editors can highlight the offending field. */
  path: string;
  message: string;
};

/**
 * Lightweight schema validation for templates. Returns a flat list of issues
 * — empty when the template is well-formed. Used by the editor for inline
 * errors and by the importer to gate "save".
 */
export function validateTemplate(template: ScenarioTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!template.name?.trim()) {
    issues.push({ path: 'name', message: 'Template name is required.' });
  }
  if (!Number.isFinite(template.baseCapacityKW) || template.baseCapacityKW <= 0) {
    issues.push({
      path: 'baseCapacityKW',
      message: 'Base capacity must be a positive number (kW).',
    });
  }
  if (!template.version?.trim()) {
    issues.push({ path: 'version', message: 'Version is required.' });
  }

  const seenLineIds = new Set<string>();
  for (let i = 0; i < template.mainBom.length; i++) {
    const line = template.mainBom[i];
    const path = `mainBom[${i}]`;
    if (!line.id || seenLineIds.has(line.id)) {
      issues.push({ path, message: 'Duplicate or missing BOM line id.' });
    }
    seenLineIds.add(line.id);
    issues.push(...validateLine(line, path));
  }

  const seenScopeIds = new Set<string>();
  for (let i = 0; i < template.otherScope.length; i++) {
    const item = template.otherScope[i];
    const path = `otherScope[${i}]`;
    if (!item.id || seenScopeIds.has(item.id)) {
      issues.push({ path, message: 'Duplicate or missing scope item id.' });
    }
    seenScopeIds.add(item.id);
    issues.push(...validateScope(item, path));
  }

  return issues;
}

function validateLine(line: BOMLineItem, path: string): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!line.itemName?.trim()) {
    out.push({ path: `${path}.itemName`, message: 'Item name is required.' });
  }
  if (!BOM_CATEGORIES.includes(line.category)) {
    out.push({ path: `${path}.category`, message: 'Invalid category.' });
  }
  if (!BOM_UOMS.includes(line.uom)) {
    out.push({ path: `${path}.uom`, message: 'Invalid unit of measure.' });
  }
  if (!Number.isFinite(line.baseQuantity) || line.baseQuantity < 0) {
    out.push({ path: `${path}.baseQuantity`, message: 'Quantity must be ≥ 0.' });
  }
  if (!Number.isFinite(line.rate) || line.rate < 0) {
    out.push({ path: `${path}.rate`, message: 'Rate must be ≥ 0.' });
  }
  if (!Number.isFinite(line.gstPercent) || line.gstPercent < 0) {
    out.push({ path: `${path}.gstPercent`, message: 'GST % must be ≥ 0.' });
  }
  out.push(...validateScalingShape(line.scalingType, line.unitCapacityKW, path));
  out.push(...validateFormula(line.scalingFormula, line.baseQuantity, path));
  return out;
}

function validateScope(item: OtherScopeItem, path: string): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!item.scopeName?.trim()) {
    out.push({ path: `${path}.scopeName`, message: 'Scope name is required.' });
  }
  if (!Number.isFinite(item.baseAmount) || item.baseAmount < 0) {
    out.push({ path: `${path}.baseAmount`, message: 'Amount must be ≥ 0.' });
  }
  if (!Number.isFinite(item.gstPercent) || item.gstPercent < 0) {
    out.push({ path: `${path}.gstPercent`, message: 'GST % must be ≥ 0.' });
  }
  out.push(...validateScalingShape(item.scalingType, item.unitCapacityKW, path));
  out.push(...validateFormula(item.scalingFormula, item.baseAmount, path));
  return out;
}

function validateScalingShape(
  scalingType: ScalingType,
  unitCapacityKW: number | undefined,
  path: string
): ValidationIssue[] {
  if (scalingType === 'step') {
    if (!unitCapacityKW || unitCapacityKW <= 0) {
      return [
        {
          path: `${path}.unitCapacityKW`,
          message: 'Step scaling requires a positive unit capacity (kW).',
        },
      ];
    }
  }
  return [];
}

function validateFormula(
  formula: string | undefined,
  baseAmount: number,
  path: string
): ValidationIssue[] {
  if (!formula?.trim()) return [];
  const ctx: ScalingContext = {
    baseCapacityKW: 1000,
    targetCapacityKW: 1000,
    syncType: 'HT',
    projectType: 'utility',
  };
  try {
    evalFormula(formula, ctx, baseAmount);
    return [];
  } catch (err) {
    return [
      {
        path: `${path}.scalingFormula`,
        message: `Invalid formula: ${(err as Error).message}`,
      },
    ];
  }
}
