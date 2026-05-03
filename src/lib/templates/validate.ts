import {
  BOM_UOMS,
  type ScenarioTemplate,
  type ScalingType,
  type TemplateLine,
} from '@/types';
import { evalFormula, type ScalingContext } from './scaling';

export type ValidationIssue = {
  path: string;
  message: string;
};

export function validateTemplate(template: ScenarioTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!template.name?.trim()) {
    issues.push({ path: 'name', message: 'Template name is required.' });
  }
  if (!template.facetId?.trim()) {
    issues.push({ path: 'facetId', message: 'Facet id is required.' });
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
  const seenCatalogRows = new Set<string>();
  const linesSorted = [...template.lines].sort((a, b) => a.sequence - b.sequence);

  for (let i = 0; i < linesSorted.length; i++) {
    const line = linesSorted[i];
    const path = `lines[${i}]`;
    if (!line.id || seenLineIds.has(line.id)) {
      issues.push({ path, message: 'Duplicate or missing template line id.' });
    }
    seenLineIds.add(line.id);

    const dupKey = line.catalogItemId;
    if (seenCatalogRows.has(dupKey)) {
      issues.push({
        path,
        message: `Duplicate catalog reference ${line.catalogItemId} in this template.`,
      });
    }
    seenCatalogRows.add(dupKey);

    issues.push(...validateTemplateLine(line, path));
  }

  return issues;
}

function validateTemplateLine(line: TemplateLine, path: string): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!line.catalogItemId?.trim()) {
    out.push({ path: `${path}.catalogItemId`, message: 'Catalog item id is required.' });
  }
  if (line.baseQuantity !== undefined) {
    if (!Number.isFinite(line.baseQuantity) || line.baseQuantity < 0) {
      out.push({ path: `${path}.baseQuantity`, message: 'Quantity must be ≥ 0.' });
    }
  }
  if (line.baseAmount !== undefined) {
    if (!Number.isFinite(line.baseAmount) || line.baseAmount < 0) {
      out.push({ path: `${path}.baseAmount`, message: 'Amount must be ≥ 0.' });
    }
  }
  if (line.rateOverride !== undefined) {
    if (!Number.isFinite(line.rateOverride) || line.rateOverride < 0) {
      out.push({ path: `${path}.rateOverride`, message: 'Rate override must be ≥ 0.' });
    }
  }
  if (line.gstPercentOverride !== undefined) {
    if (!Number.isFinite(line.gstPercentOverride) || line.gstPercentOverride < 0) {
      out.push({
        path: `${path}.gstPercentOverride`,
        message: 'GST override must be ≥ 0.',
      });
    }
  }
  if (line.uomOverride && !BOM_UOMS.includes(line.uomOverride)) {
    out.push({ path: `${path}.uomOverride`, message: 'Invalid UOM override.' });
  }
  out.push(...validateScalingShape(line.scalingType, line.unitCapacityKW, path));
  out.push(
    ...validateFormula(
      line.scalingFormula,
      line.baseQuantity ?? line.baseAmount ?? 0,
      path
    )
  );
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
