import {
  BOM_CATEGORIES,
  BOM_UOMS,
  type MaterialCatalogItem,
} from '@/types';

export type CatalogValidationIssue = {
  path: string;
  message: string;
};

export function validateCatalogItem(
  item: MaterialCatalogItem,
  path?: string
): CatalogValidationIssue[] {
  const p = path ?? item.id ?? 'catalogItem';
  const issues: CatalogValidationIssue[] = [];
  if (!item.id?.trim()) {
    issues.push({ path: p, message: 'Catalog id is required.' });
  }
  if (!item.name?.trim()) {
    issues.push({ path: `${p}.name`, message: 'Name is required.' });
  }
  if (item.kind !== 'bom' && item.kind !== 'scope') {
    issues.push({ path: `${p}.kind`, message: 'Kind must be bom or scope.' });
  }
  if (!BOM_CATEGORIES.includes(item.category)) {
    issues.push({ path: `${p}.category`, message: 'Invalid category.' });
  }
  if (item.kind === 'bom') {
    if (!item.uom || !BOM_UOMS.includes(item.uom)) {
      issues.push({ path: `${p}.uom`, message: 'BOM items require a valid UOM.' });
    }
    const r = item.defaultRate ?? 0;
    if (!Number.isFinite(r) || r < 0) {
      issues.push({
        path: `${p}.defaultRate`,
        message: 'BOM catalog items need non-negative default rate.',
      });
    }
  }
  if (item.kind === 'scope') {
    const a = item.defaultAmount ?? 0;
    if (!Number.isFinite(a) || a < 0) {
      issues.push({
        path: `${p}.defaultAmount`,
        message: 'Scope catalog items need non-negative default amount.',
      });
    }
  }
  if (!Number.isFinite(item.gstPercent) || item.gstPercent < 0) {
    issues.push({ path: `${p}.gstPercent`, message: 'GST % must be ≥ 0.' });
  }
  if (item.defaultComposeMode !== 'max' && item.defaultComposeMode !== 'sum') {
    issues.push({
      path: `${p}.defaultComposeMode`,
      message: 'Invalid compose mode.',
    });
  }
  return issues;
}

export function validateCatalog(items: MaterialCatalogItem[]): CatalogValidationIssue[] {
  const seen = new Set<string>();
  const issues: CatalogValidationIssue[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const path = `catalog[${i}]`;
    if (seen.has(it.id)) {
      issues.push({ path, message: `Duplicate catalog id: ${it.id}` });
    }
    seen.add(it.id);
    issues.push(...validateCatalogItem(it, path));
  }
  return issues;
}
