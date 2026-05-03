import {
  BUSINESS_MODEL_FACET_ID,
  MONITORING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from '@/lib/facets/constants';
import {
  SEED_TEMPLATE_ID_BUS_CLOSED,
  SEED_TEMPLATE_ID_BUS_OPEN,
  SEED_TEMPLATE_ID_MON_ADV,
  SEED_TEMPLATE_ID_MON_NONE,
} from '@/lib/templates/seed';
import type { ScenarioTemplate } from '@/types';

/** Primary label shown in facet picker cards and condensed swap-dropdown options. */
export function facetPickerPrimaryLabel(facetId: string, tpl: ScenarioTemplate): string {
  switch (facetId) {
    case VOLTAGE_CLASS_FACET_ID:
      return tpl.syncType === 'LT' ? 'LT' : 'HT';
    case BUSINESS_MODEL_FACET_ID:
      if (tpl.id === SEED_TEMPLATE_ID_BUS_CLOSED) return 'Closed captive';
      if (tpl.id === SEED_TEMPLATE_ID_BUS_OPEN) return 'Open access';
      break;
    case MONITORING_FACET_ID:
      if (tpl.id === SEED_TEMPLATE_ID_MON_NONE) return 'Baseline';
      if (tpl.id === SEED_TEMPLATE_ID_MON_ADV) return 'Advanced SCADA';
      break;
    default:
      break;
  }
  return tpl.name;
}
