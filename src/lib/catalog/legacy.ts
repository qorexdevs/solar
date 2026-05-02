import type { BOMTemplate, Materials, PriceCatalog } from '@/types';
import { MATERIAL_KEYS } from '@/types';
import { DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE } from './defaults';

/** Materialize a synthetic legacy catalog from an already-saved Materials map. */
export function buildLegacyCatalog(
  materials: Materials,
  bom: BOMTemplate,
  sizeMW: number,
  id = 'cat_legacy_pre_v2'
): PriceCatalog {
  const prices = {} as PriceCatalog['prices'];
  for (const key of MATERIAL_KEYS) {
    const rule = bom[key];
    prices[key] = {
      unitPrice: materials[key]?.unitCost ?? 0,
      unit: rule.unit,
    };
  }
  return {
    id,
    label: 'Pre-v2 legacy snapshot',
    uploadedAt: Date.now(),
    source: 'legacy',
    prices,
    defaults: structuredClone(DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE),
    notes: `Synthesized from saved scenario at sizeMW=${sizeMW}.`,
  };
}
