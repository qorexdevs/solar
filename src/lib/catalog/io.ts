import * as XLSX from 'xlsx';
import type {
  BOMTemplate,
  CatalogDefaults,
  MaterialKey,
  MaterialUnit,
  PriceCatalog,
  ProjectType,
} from '@/types';
import { MATERIAL_KEYS, MATERIAL_LABELS, MATERIAL_UNITS } from '@/types';
import { uid } from '@/lib/uid';
import { DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE } from './defaults';

/* ------------------------------------------------------------------------ */
/* Price catalog import / export                                            */
/* ------------------------------------------------------------------------ */

const CATALOG_HEADER = ['material_key', 'unit', 'unit_price_inr', 'notes'] as const;
const DEFAULTS_HEADER = [
  'project_type',
  'lifespan_years',
  'degradation_pct',
  'inflation_pct',
  'discount_pct',
  'cuf_pct',
  'ppa_escalation_pct',
  'om_percent_of_capex',
] as const;

const PROJECT_TYPES: readonly ProjectType[] = [
  'utility',
  'commercial',
  'hybrid',
  'residential',
];

export type CatalogParseResult = {
  catalog: PriceCatalog | null;
  errors: string[];
  warnings: string[];
};

/**
 * Build a starter Excel template a user can fill in and re-upload.
 * Uses the BOM units for the active project type so the upload aligns with
 * the engineering rules for at least one project type.
 */
export function buildCatalogTemplateWorkbook(
  bom: BOMTemplate,
  defaults: Record<
    ProjectType,
    CatalogDefaults
  > = DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const priceRows: (string | number)[][] = [[...CATALOG_HEADER]];
  for (const key of MATERIAL_KEYS) {
    const rule = bom[key];
    priceRows.push([key, rule.unit, 0, MATERIAL_LABELS[key]]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(priceRows), 'Prices');

  // Defaults sheet: per-project-type scenario defaults.
  const defaultsRows: (string | number)[][] = [[...DEFAULTS_HEADER]];
  for (const type of PROJECT_TYPES) {
    const d = defaults[type];
    defaultsRows.push([
      type,
      d.lifespanYears,
      d.degradationPct,
      d.inflationPct,
      d.discountPct,
      d.cufPct,
      d.ppaEscalationPct,
      d.omPercentOfCapex,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(defaultsRows), 'Defaults');

  // README sheet so users know what each column means.
  const readme: (string | number)[][] = [
    ['SolarCalc India — Price Catalog Template'],
    [],
    ['Sheet: Prices'],
    ['Column', 'Meaning'],
    ['material_key', `One of: ${MATERIAL_KEYS.join(', ')}`],
    ['unit', `One of: ${MATERIAL_UNITS.join(', ')}`],
    ['unit_price_inr', 'Unit price in INR (numeric, ≥ 0)'],
    ['notes', 'Free-text, optional'],
    [],
    ['All seven material keys must be present in the Prices sheet.'],
    [],
    ['Sheet: Defaults'],
    ['One row per project type. Provides scenario defaults for the simplified'],
    ['single-page builder.'],
    ['project_type', `One of: ${PROJECT_TYPES.join(', ')}`],
    ['lifespan_years', 'Plant lifespan in years (e.g. 25)'],
    ['degradation_pct', 'Annual panel degradation (% per year)'],
    ['inflation_pct', 'Annual inflation rate (%)'],
    ['discount_pct', 'Discount rate for NPV (%)'],
    ['cuf_pct', 'Capacity Utilization Factor (%)'],
    ['ppa_escalation_pct', 'Annual PPA escalation (%)'],
    ['om_percent_of_capex', 'Year-1 O&M as % of total CAPEX'],
    [],
    ['Save this file and upload via Settings → Price Catalog.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), 'README');

  return wb;
}

export function downloadCatalogTemplate(
  bom: BOMTemplate,
  defaults?: Record<ProjectType, CatalogDefaults>
): void {
  const wb = buildCatalogTemplateWorkbook(bom, defaults);
  XLSX.writeFile(wb, 'solarcalc-price-catalog-template.xlsx');
}

/**
 * Parse a CSV/Excel file into a PriceCatalog. Returns errors/warnings rather
 * than throwing so the caller can surface them in the UI.
 */
export async function parseCatalogFile(file: File): Promise<CatalogParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return {
      catalog: null,
      errors: ['Could not read the selected file.'],
      warnings,
    };
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch {
    return {
      catalog: null,
      errors: ['File could not be parsed as Excel/CSV.'],
      warnings,
    };
  }

  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === 'prices') ?? wb.SheetNames[0];
  if (!sheetName) {
    return {
      catalog: null,
      errors: ['Workbook is empty — no sheets found.'],
      warnings,
    };
  }

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const prices: Partial<PriceCatalog['prices']> = {};
  const seenKeys = new Set<MaterialKey>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawKey = String(row.material_key ?? '').trim();
    if (!rawKey) continue;

    if (!(MATERIAL_KEYS as readonly string[]).includes(rawKey)) {
      errors.push(`Row ${i + 2}: unknown material_key "${rawKey}".`);
      continue;
    }
    const key = rawKey as MaterialKey;

    const rawUnit = String(row.unit ?? '').trim();
    if (!(MATERIAL_UNITS as readonly string[]).includes(rawUnit)) {
      errors.push(
        `Row ${i + 2} (${key}): unit "${rawUnit}" must be one of ${MATERIAL_UNITS.join(', ')}.`
      );
      continue;
    }
    const unit = rawUnit as MaterialUnit;

    const rawPrice = Number(row.unit_price_inr);
    if (!Number.isFinite(rawPrice) || rawPrice < 0) {
      errors.push(`Row ${i + 2} (${key}): unit_price_inr must be a non-negative number.`);
      continue;
    }

    if (seenKeys.has(key)) {
      warnings.push(
        `Duplicate row for ${key} — using the last occurrence (row ${i + 2}).`
      );
    }
    seenKeys.add(key);
    prices[key] = { unitPrice: rawPrice, unit };
  }

  for (const key of MATERIAL_KEYS) {
    if (!seenKeys.has(key)) {
      errors.push(`Missing row for "${key}".`);
    }
  }

  // Defaults sheet is optional — when missing or invalid we fall back to the
  // industry baseline so a price-only upload still succeeds.
  const defaultsSheetName = wb.SheetNames.find((n) => n.toLowerCase() === 'defaults');
  const defaults = structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE);
  if (defaultsSheetName) {
    const defaultsSheet = wb.Sheets[defaultsSheetName];
    const defaultsRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      defaultsSheet,
      { defval: '' }
    );
    const seenTypes = new Set<ProjectType>();
    for (let i = 0; i < defaultsRows.length; i++) {
      const row = defaultsRows[i];
      const rawType = String(row.project_type ?? '').trim();
      if (!rawType) continue;
      if (!(PROJECT_TYPES as readonly string[]).includes(rawType)) {
        warnings.push(
          `Defaults row ${i + 2}: unknown project_type "${rawType}" — ignoring.`
        );
        continue;
      }
      const type = rawType as ProjectType;
      const numericFields: (keyof CatalogDefaults)[] = [
        'lifespanYears',
        'degradationPct',
        'inflationPct',
        'discountPct',
        'cufPct',
        'ppaEscalationPct',
        'omPercentOfCapex',
      ];
      const sourceCols: Record<keyof CatalogDefaults, string> = {
        lifespanYears: 'lifespan_years',
        degradationPct: 'degradation_pct',
        inflationPct: 'inflation_pct',
        discountPct: 'discount_pct',
        cufPct: 'cuf_pct',
        ppaEscalationPct: 'ppa_escalation_pct',
        omPercentOfCapex: 'om_percent_of_capex',
      };
      const next = { ...defaults[type] };
      for (const field of numericFields) {
        const raw = row[sourceCols[field]];
        if (raw === '' || raw === undefined) continue;
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0) {
          warnings.push(
            `Defaults row ${i + 2} (${type}): "${sourceCols[field]}" must be a non-negative number — keeping default.`
          );
          continue;
        }
        next[field] = num;
      }
      defaults[type] = next;
      seenTypes.add(type);
    }
    const missing = PROJECT_TYPES.filter((t) => !seenTypes.has(t));
    if (missing.length > 0) {
      warnings.push(
        `Defaults sheet missing rows for: ${missing.join(', ')} — keeping industry defaults for those types.`
      );
    }
  } else {
    warnings.push(
      'No "Defaults" sheet found — using industry defaults per project type.'
    );
  }

  if (errors.length > 0) {
    return { catalog: null, errors, warnings };
  }

  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const catalog: PriceCatalog = {
    id: uid(`cat_${isoDate}`),
    label: `Uploaded ${isoDate}`,
    uploadedAt: today.getTime(),
    source: 'upload',
    prices: prices as PriceCatalog['prices'],
    defaults,
    notes: `Imported from ${file.name}.`,
  };

  return { catalog, errors, warnings };
}
