import { describe, expect, it } from 'vitest';
import type { MaterialCatalogItem } from '@/types';
import { matchAgainstCatalog, parseBomSheet, type RawSheet } from './importBom';

function mat(
  id: string,
  name: string,
  patch: Partial<MaterialCatalogItem> = {}
): MaterialCatalogItem {
  return {
    id,
    name,
    kind: 'bom',
    category: 'modules',
    uom: 'count',
    defaultRate: 0,
    gstPercent: 18,
    defaultComposeMode: 'max',
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  };
}

const FIXTURE: RawSheet = [
  [null, '1000 KW - Grround Mounted - Bill of Material '],
  [
    null, 'Sl no ', null, 'Description of Supply Items', 'Make', 'UOM', 'Qty',
    'Rate', 'Amount', 'GST',
  ],
  [
    null, 1, 'Solar PV Modules ', 'Solar PV module 540Wp ', 'APS/ Premier',
    'MTR', 1852, 7290, 13501080, 1620129.6,
  ],
  [
    null, 2, 'Inverters - 250  KW ',
    'Grid Connect Solar Inverter (1 x 250 KW 800V AC, 50Hz, MPPT)', 'Solis',
    'Nos ', 4, 410000, 1640000, 196800,
  ],
  [
    null, 7, 'Panel Mounting Structure',
    'Module mounting Penetrating type - 28 MMS Gavanized Structure',
    'Galvanized', 'KGs', 25000, 100, 2500000, 450000,
  ],
  [
    null, 24, 'Hardware Misc', 'Hardware Misc', 'Reputed make', null, null,
    null, 200000, 36000,
  ],
  [
    null, null, null, null, null, null, 'TOTAL', null, 26784080, 3912669.6,
  ],
  [null, 'S.NO', 'Other Scope Of Works', null, 'Amount'],
  [null, 1, '1000 KW System Cost', null, 26784080],
  [null, 2, 'CEIG ', null, 130000],
  [null, 3, 'Module Cleaning System', null, 70000],
  [null, 'TOTAL', null, null, 27119080],
];

describe('parseBomSheet', () => {
  it('extracts title, base capacity, sync type, mounting from the title row', () => {
    const result = parseBomSheet(FIXTURE);
    expect(result.title).toMatch(/1000 KW.*Bill of Material/);
    expect(result.inferredBaseCapacityKW).toBe(1000);
    expect(result.inferredMounting).toBe('ground');
  });

  it('parses main BOM rows with description, make, qty, rate, amount, GST', () => {
    const result = parseBomSheet(FIXTURE);
    const bomRows = result.rows.filter((r) => r.kind === 'bom');
    expect(bomRows.length).toBe(4);

    const pv = bomRows[0]!;
    expect(pv.name).toMatch(/Solar PV module 540Wp/);
    expect(pv.uom).toBe('meter');
    expect(pv.quantity).toBe(1852);
    expect(pv.rate).toBe(7290);
    expect(pv.amount).toBe(13501080);
    expect(pv.gstAmount).toBeCloseTo(1620129.6, 1);
    expect(pv.gstPercent).toBeCloseTo(12, 0);
    expect(pv.category).toBe('modules');
    expect(pv.group).toMatch(/Solar PV Modules/);
    expect(pv.warnings).toEqual([]);
  });

  it('infers categories from descriptions', () => {
    const result = parseBomSheet(FIXTURE);
    const inv = result.rows.find((r) => /Grid Connect Solar Inverter/.test(r.name));
    const mount = result.rows.find((r) =>
      /Module mounting Penetrating/.test(r.name)
    );
    expect(inv?.category).toBe('inverters');
    expect(mount?.category).toBe('mounting');
  });

  it('warns on missing UOM for rows that have qty/rate', () => {
    const sheet: RawSheet = [
      ['Bill of Material'],
      ['Sl no', 'Group', 'Description', 'Make', 'UOM', 'Qty', 'Rate', 'Amount', 'GST'],
      [1, 'Cables', 'AC cable string', 'Polycab', null, 100, 50, 5000, 900],
    ];
    const result = parseBomSheet(sheet);
    expect(result.rows[0]!.warnings).toContain('Missing UOM.');
  });

  it('parses the Other Scope Of Works section after the section break', () => {
    const result = parseBomSheet(FIXTURE);
    const scopeRows = result.rows.filter((r) => r.kind === 'scope');
    const names = scopeRows.map((r) => r.name);
    expect(names).toContain('CEIG');
    expect(names).toContain('Module Cleaning System');
    expect(names).not.toContain('1000 KW System Cost');
  });

  it('matches rows against existing catalog by exact name first', () => {
    const catalog = [
      mat('cat-pv-540', 'Solar PV module 540Wp', { uom: 'count' }),
      mat('cat-inv-250', 'Solar Inverter 250 kW'),
    ];
    const result = parseBomSheet(FIXTURE, catalog);
    const pv = result.rows.find((r) => /540Wp/.test(r.name));
    expect(pv?.matchedCatalogId).toBe('cat-pv-540');
  });

  it('matches rows by fuzzy substring when exact match fails', () => {
    const catalog = [mat('cat-mount-mms', 'Module mounting MMS structure')];
    expect(
      matchAgainstCatalog('Module mounting Penetrating type MMS Galvanized', catalog)
    ).toBe('cat-mount-mms');
  });

  it('handles empty input gracefully', () => {
    expect(parseBomSheet([]).rows).toEqual([]);
  });
});
