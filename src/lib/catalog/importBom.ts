/**
 * Pure BOM-sheet parser.
 *
 * Accepts the 2D row array shape produced by SheetJS's `sheet_to_json` with
 * `header: 1`, plus a few CSV-friendly aliases. Mirrors the layout in
 * `docs/Project costing details _MW.xlsx`:
 *
 *   row 1: title (e.g. "1000 KW - Grround Mounted - Bill of Material")
 *   row 2: header row with columns: Sl no | Group | Description | Make | UOM | Qty | Rate | Amount | GST
 *   rows: main BOM data
 *   marker row: contains "Other Scope Of Works"
 *   header row: S.NO | name | … | Amount
 *   rows: scope data
 *   total row: "TOTAL" / "PER KW RATE" — ignored
 */
import {
  BOM_CATEGORIES,
  BOM_UOMS,
  type BOMCategory,
  type BOMUom,
  type MaterialCatalogItem,
  type SyncType,
} from '@/types';

export type RawSheet = unknown[][];

export type BomImportRow = {
  /** Stable temp id for UI selection. */
  rowId: string;
  /** True when this row is from the "Other Scope Of Works" section. */
  kind: 'bom' | 'scope';
  /** Sheet section heading (e.g. "Solar PV Modules", "Power Cables") — bom only. */
  group?: string;
  /** Long description / scope name. */
  name: string;
  make?: string;
  uom?: BOMUom;
  rawUom?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  gstAmount?: number;
  gstPercent?: number;
  category: BOMCategory;
  /** True when the same name already exists in the catalog (case-insensitive). */
  matchedCatalogId?: string;
  warnings: string[];
};

export type BomImportResult = {
  /** Sheet title from row 1 of the source file (best effort). */
  title?: string;
  /** Inferred sync type if title contains HT/LT keywords. */
  inferredSyncType?: SyncType;
  /** Inferred base capacity in kW if a "X KW" / "X MW" pattern is in the title. */
  inferredBaseCapacityKW?: number;
  /** Inferred mounting if title contains "ground" / "rooftop". */
  inferredMounting?: 'ground' | 'rooftop';
  rows: BomImportRow[];
};

/**
 * Category hints — first match wins. Order matters: mounting comes before
 * modules so "Module mounting structure" is classified as mounting, while
 * "Solar PV module 540Wp" still resolves to modules via the stricter PV regex.
 */
const CATEGORY_HINTS: { keywords: RegExp; category: BOMCategory }[] = [
  { keywords: /transformer|switch\s*yard|vcb|33\s*kv|66\s*kv|11\s*kv/i, category: 'switchyard' },
  { keywords: /scada|monitor|weather/i, category: 'monitoring' },
  { keywords: /metering|acdb|dcdb|ldb|mccb|\bacb\b|\bspd\b|protection/i, category: 'metering' },
  { keywords: /earth|lightning\s*arrestor|\bla\b/i, category: 'earthing' },
  { keywords: /mount|\bmms\b|canopy|structure/i, category: 'mounting' },
  { keywords: /inverter/i, category: 'inverters' },
  { keywords: /cable|wire|conductor/i, category: 'cables' },
  { keywords: /pv\s*module|solar\s*module|\bphoto\s*voltaic\b|\bwp\b/i, category: 'modules' },
  { keywords: /civil|foundation|trench|dwc|pipe/i, category: 'civil' },
  { keywords: /install|commission|engineer|approval|design|service/i, category: 'services' },
  { keywords: /transport|logistic|storage/i, category: 'logistics' },
];

const UOM_ALIASES: Record<string, BOMUom> = {
  mtr: 'meter',
  m: 'meter',
  meter: 'meter',
  meters: 'meter',
  metre: 'meter',
  metres: 'meter',
  nos: 'count',
  no: 'count',
  count: 'count',
  pcs: 'count',
  piece: 'count',
  units: 'count',
  unit: 'count',
  kg: 'kg',
  kgs: 'kg',
  lot: 'lot',
  set: 'lot',
  wp: 'Wp',
  kw: 'kW',
  mw: 'MW',
};

function trimStr(v: unknown): string {
  if (v == null) return '';
  return String(v).replace(/\u00a0/g, ' ').trim();
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const cleaned = String(v).replace(/[,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeUom(raw: string): BOMUom | undefined {
  const k = raw.toLowerCase().replace(/\./g, '').trim();
  if (!k) return undefined;
  if (UOM_ALIASES[k]) return UOM_ALIASES[k];
  const exact = (BOM_UOMS as readonly string[]).find((u) => u.toLowerCase() === k);
  return (exact as BOMUom | undefined) ?? undefined;
}

function inferCategory(blob: string): BOMCategory {
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.test(blob)) return hint.category;
  }
  return 'misc';
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'with', 'for', 'to', 'in', 'on',
  'type', 'kv', 'sq', 'mm', 'cm', 'wp', 'kw', 'mw', 'no', 'nos',
]);

function tokenize(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function fuzzyKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Match a parsed row against existing catalog by name. Strategy:
 *  1. Exact case-insensitive name match.
 *  2. Substring match on a normalized fuzzy key (alphanumerics-only).
 *  3. Token-overlap match — pick the catalog row that shares the most
 *     non-stopword tokens (≥ 2 tokens) with the parsed name.
 */
export function matchAgainstCatalog(
  rowName: string,
  catalog: MaterialCatalogItem[]
): string | undefined {
  if (!rowName) return undefined;
  const lower = rowName.toLowerCase();
  const exact = catalog.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const key = fuzzyKey(rowName);
  if (!key) return undefined;

  let subBestId: string | undefined;
  let subBestLen = 0;
  for (const c of catalog) {
    const ck = fuzzyKey(c.name);
    if (!ck) continue;
    if (key.includes(ck) || ck.includes(key)) {
      const len = Math.min(key.length, ck.length);
      if (len > subBestLen) {
        subBestId = c.id;
        subBestLen = len;
      }
    }
  }
  if (subBestId) return subBestId;

  const rowTokens = tokenize(rowName);
  if (rowTokens.size === 0) return undefined;
  let tokBestId: string | undefined;
  let tokBestScore = 1;
  for (const c of catalog) {
    const ct = tokenize(c.name);
    let shared = 0;
    for (const t of rowTokens) if (ct.has(t)) shared++;
    if (shared > tokBestScore) {
      tokBestScore = shared;
      tokBestId = c.id;
    }
  }
  return tokBestId;
}

/** Return true when the row appears to be a section / total / blank marker. */
function isStructuralRow(cells: string[]): boolean {
  const lower = cells.map((c) => c.toLowerCase());
  if (lower.every((c) => !c)) return true;
  if (lower.some((c) => c === 'total' || c === 'per kw rate')) return true;
  return false;
}

function isMainBomHeader(cells: string[]): boolean {
  const blob = cells.map((c) => c.toLowerCase()).join('|');
  return /\bsl\s*no\b/.test(blob) && /description/.test(blob) && /qty|quantity/.test(blob);
}

function isScopeBoundary(cells: string[]): boolean {
  return cells.some((c) => /other scope of works/i.test(c));
}

function isScopeHeader(cells: string[]): boolean {
  const blob = cells.map((c) => c.toLowerCase()).join('|');
  return /\bs\.?\s*no\b/.test(blob) && /amount/.test(blob);
}

/**
 * Parse a BOM sheet into typed rows. The sheet is the row array form:
 * `[[a1,b1,...], [a2,b2,...], ...]` with optional leading empty cells.
 */
export function parseBomSheet(
  sheet: RawSheet,
  catalog: MaterialCatalogItem[] = []
): BomImportResult {
  const rows: BomImportRow[] = [];
  const result: BomImportResult = { rows };
  if (!Array.isArray(sheet) || sheet.length === 0) return result;

  const trimmed = sheet.map((r) => (Array.isArray(r) ? r.map(trimStr) : []));

  for (const cells of trimmed) {
    const blob = cells.join(' ');
    if (!result.title && /bill of material/i.test(blob)) {
      result.title = blob.replace(/\s+/g, ' ').trim();
      const m = blob.match(/(\d+(?:\.\d+)?)\s*(kw|mw)/i);
      if (m) {
        const n = Number(m[1]);
        const unit = m[2].toLowerCase();
        result.inferredBaseCapacityKW = unit === 'mw' ? n * 1000 : n;
      }
      if (/\bht\b/i.test(blob)) result.inferredSyncType = 'HT';
      else if (/\blt\b/i.test(blob)) result.inferredSyncType = 'LT';
      if (/rooftop|roof/i.test(blob)) result.inferredMounting = 'rooftop';
      else if (/g[r]+o+u+nd/i.test(blob)) result.inferredMounting = 'ground';
      break;
    }
  }

  let mode: 'pre' | 'bom' | 'scope' = 'pre';
  let bomCols: BomColumns | null = null;
  let scopeCols: ScopeColumns | null = null;
  let lastGroup = '';
  let rid = 0;

  for (const cells of trimmed) {
    if (isStructuralRow(cells)) continue;

    if (mode === 'pre' && isMainBomHeader(cells)) {
      bomCols = detectBomColumns(cells);
      mode = 'bom';
      continue;
    }

    if (mode === 'bom' && isScopeBoundary(cells)) {
      mode = 'scope';
      scopeCols = isScopeHeader(cells) ? detectScopeColumns(cells) : null;
      continue;
    }

    if (mode === 'scope' && !scopeCols && isScopeHeader(cells)) {
      scopeCols = detectScopeColumns(cells);
      continue;
    }

    if (mode === 'bom' && bomCols) {
      const desc = trimStr(cells[bomCols.description]);
      const group = trimStr(cells[bomCols.group]);
      if (group && !desc) {
        lastGroup = group;
        continue;
      }
      if (!desc) continue;
      if (group) lastGroup = group;
      const make = bomCols.make != null ? trimStr(cells[bomCols.make]) : '';
      const rawUom = bomCols.uom != null ? trimStr(cells[bomCols.uom]) : '';
      const qty = bomCols.qty != null ? toNumber(cells[bomCols.qty]) : undefined;
      const rate = bomCols.rate != null ? toNumber(cells[bomCols.rate]) : undefined;
      const amount = bomCols.amount != null ? toNumber(cells[bomCols.amount]) : undefined;
      const gst = bomCols.gst != null ? toNumber(cells[bomCols.gst]) : undefined;
      const warnings: string[] = [];
      const uom = rawUom ? normalizeUom(rawUom) : undefined;
      if (rawUom && !uom) warnings.push(`Unrecognized UOM "${rawUom}".`);
      if (!rawUom && (qty != null || rate != null)) warnings.push('Missing UOM.');
      const blob = `${lastGroup} ${desc}`;
      const category = inferCategory(blob);
      const gstPercent =
        gst != null && amount && amount > 0
          ? Math.round((gst / amount) * 1000) / 10
          : undefined;

      rows.push({
        rowId: `bom-${++rid}`,
        kind: 'bom',
        group: lastGroup || undefined,
        name: desc,
        make: make || undefined,
        uom,
        rawUom: rawUom || undefined,
        quantity: qty,
        rate,
        amount,
        gstAmount: gst,
        gstPercent,
        category,
        matchedCatalogId: matchAgainstCatalog(desc, catalog),
        warnings,
      });
    } else if (mode === 'scope' && scopeCols) {
      const name = trimStr(cells[scopeCols.name]);
      if (!name) continue;
      if (/system\s*cost/i.test(name)) continue;
      const amount =
        scopeCols.amount != null ? toNumber(cells[scopeCols.amount]) : undefined;
      const warnings: string[] = [];
      if (amount == null) warnings.push('Missing amount.');
      const category = inferCategory(name);

      rows.push({
        rowId: `scope-${++rid}`,
        kind: 'scope',
        name,
        amount,
        category,
        matchedCatalogId: matchAgainstCatalog(name, catalog),
        warnings,
      });
    }
  }

  return result;
}

type BomColumns = {
  group: number;
  description: number;
  make?: number;
  uom?: number;
  qty?: number;
  rate?: number;
  amount?: number;
  gst?: number;
};

function detectBomColumns(header: string[]): BomColumns {
  const lower = header.map((c) => c.toLowerCase());
  const find = (...needles: RegExp[]): number | undefined => {
    for (let i = 0; i < lower.length; i++) {
      const c = lower[i];
      if (!c) continue;
      if (needles.some((n) => n.test(c))) return i;
    }
    return undefined;
  };
  const slIdx = find(/\bsl\s*no\b/);
  let groupIdx = (slIdx ?? -1) + 1;
  if (groupIdx >= header.length) groupIdx = 2;
  const descIdx = find(/description/) ?? groupIdx + 1;
  return {
    group: groupIdx,
    description: descIdx,
    make: find(/^make\b/),
    uom: find(/^uom\b/),
    qty: find(/^qty\b|^quantity\b/),
    rate: find(/^rate\b/),
    amount: find(/^amount\b/),
    gst: find(/^gst\b|^gst amount\b/),
  };
}

type ScopeColumns = {
  name: number;
  amount?: number;
};

function detectScopeColumns(header: string[]): ScopeColumns {
  const lower = header.map((c) => c.toLowerCase());
  const slIdx = lower.findIndex((c) => /\bs\.?\s*no\b/.test(c));
  const nameIdx = lower.findIndex((c) => /scope|description|name/i.test(c));
  const amountIdx = lower.findIndex((c) => /amount/.test(c));
  return {
    name: nameIdx >= 0 ? nameIdx : slIdx + 1,
    amount: amountIdx >= 0 ? amountIdx : undefined,
  };
}

/** Validate that a category string is part of `BOM_CATEGORIES`. */
export function isKnownCategory(c: string): c is BOMCategory {
  return (BOM_CATEGORIES as readonly string[]).includes(c);
}
