export type LineItem = {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
};

export const MATERIAL_KEYS = [
  'panels',
  'cables',
  'inverters',
  'mounting',
  'transformers',
  'civil',
  'bos',
] as const;

export type MaterialKey = (typeof MATERIAL_KEYS)[number];

export const MATERIAL_LABELS: Record<MaterialKey, string> = {
  panels: 'Solar Panels',
  cables: 'Cables',
  inverters: 'Inverters',
  mounting: 'Mounting Structures',
  transformers: 'Transformers',
  civil: 'Civil Works',
  bos: 'Balance of System (BOS)',
};

export type Materials = Record<MaterialKey, LineItem> & {
  custom: LineItem[];
};

/** Unit a material is priced/measured in. */
export const MATERIAL_UNITS = ['kW', 'count', 'meter', 'MW', 'lot'] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  kW: 'kW',
  count: 'units',
  meter: 'm',
  MW: 'MW',
  lot: 'lot',
};
