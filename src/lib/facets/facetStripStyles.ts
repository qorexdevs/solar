import {
  BUSINESS_MODEL_FACET_ID,
  MOUNTING_FACET_ID,
  MONITORING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from './constants';

/** Visual theme per facet — horizontal picker options + summary chips share palette. */
export type FacetStripAccent = {
  /** Small label above options */
  labelTone: string;
  /** Wrapper for “Facet: value” pills (linked or static) */
  chipWrap: string;
  idle: string;
  selected: string;
  checkTone: string;
};

const FALLBACK: FacetStripAccent = {
  labelTone: 'text-on-surface-variant',
  chipWrap: 'border-outline-variant bg-surface-container-low text-primary',
  idle: 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container',
  selected:
    'border-outline text-on-surface bg-surface-container-highest shadow-sm',
  checkTone: 'text-primary',
};

/** Shared strip styling for all standard scenario facets (primary palette). */
const PRIMARY_STRIP: FacetStripAccent = {
  labelTone: 'text-primary',
  chipWrap: 'border-primary/35 bg-primary-fixed/35 text-primary',
  idle:
    'border-primary/25 bg-primary-fixed/15 text-on-surface hover:bg-primary-fixed/28',
  selected: 'border-primary bg-primary-fixed/42 text-on-surface shadow-sm',
  checkTone: 'text-primary',
};

const ACCENTS: Record<string, FacetStripAccent> = {
  [VOLTAGE_CLASS_FACET_ID]: PRIMARY_STRIP,
  [MOUNTING_FACET_ID]: PRIMARY_STRIP,
  [BUSINESS_MODEL_FACET_ID]: PRIMARY_STRIP,
  [MONITORING_FACET_ID]: PRIMARY_STRIP,
};

export function facetStripAccent(facetId: string): FacetStripAccent {
  return ACCENTS[facetId] ?? FALLBACK;
}

const OPTION_BTN_BASE =
  'group w-full max-w-[12rem] shrink-0 inline-flex min-h-touch-target items-center justify-between gap-xs rounded-full border px-md py-xs text-left text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Option pills in TemplatePicker horizontal strip */
export function facetOptionButtonClass(
  facetId: string,
  selected: boolean
): string {
  const a = facetStripAccent(facetId);
  return `${OPTION_BTN_BASE} ${selected ? a.selected : a.idle}`;
}

/** “Templates: …” chip links row */
export function facetSummaryChipClass(facetId: string): string {
  const chip = facetStripAccent(facetId).chipWrap;
  return `inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 border text-body-md cursor-pointer transition-opacity hover:opacity-90 ${chip}`;
}
