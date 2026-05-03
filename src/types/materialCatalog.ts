import type { BOMCategory, BOMUom } from './bomLineItem';

/** How duplicated catalog refs across facet templates combine. */
export type ComposeMode = 'max' | 'sum';

/** Catalog lifecycle for admin UX. */
export type CatalogStatus = 'active' | 'archived';

export const COMPOSE_MODE_LABELS: Record<ComposeMode, string> = {
  max: 'Max qty / amount',
  sum: 'Sum qty / amount',
};

/**
 * Global material catalog item — canonical identity + pricing defaults for
 * template lines to reference (`catalogItemId`).
 */
export type MaterialCatalogItem = {
  id: string;
  name: string;
  description?: string;
  make?: string;
  /** Main BOM qty×rate vs lump-sum scope. */
  kind: 'bom' | 'scope';
  category: BOMCategory;
  /** For `kind === 'bom'` only. */
  uom?: BOMUom;
  /** Unit rate INR (bom) — optional when templates always override rate. */
  defaultRate?: number;
  /** Lump-sum INR baseline for scope kind (at template calibration). */
  defaultAmount?: number;
  gstPercent: number;
  /** Default compose mode when templates don't override / estimate doesn't toggle. */
  defaultComposeMode: ComposeMode;
  notes?: string;
  status: CatalogStatus;
  createdAt: number;
  updatedAt: number;
};
