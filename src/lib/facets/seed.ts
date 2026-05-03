import type { TemplateFacet } from '@/types';
import {
  BUSINESS_MODEL_FACET_ID,
  MONITORING_FACET_ID,
  MOUNTING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from './constants';
import {
  SEED_TEMPLATE_ID_BUS_CLOSED,
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_MON_NONE,
  SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
} from '@/lib/templates/seed';

export const SEED_FACET_IDS = {
  voltageClass: VOLTAGE_CLASS_FACET_ID,
  mounting: MOUNTING_FACET_ID,
  businessModel: BUSINESS_MODEL_FACET_ID,
  monitoring: MONITORING_FACET_ID,
} as const;

export function seedFacets(): TemplateFacet[] {
  return [
    {
      id: VOLTAGE_CLASS_FACET_ID,
      name: 'Voltage class',
      description: 'HT vs LT plant architecture and base calibration.',
      sequence: 10,
      required: true,
      defaultTemplateId: SEED_TEMPLATE_ID_HT,
    },
    {
      id: MOUNTING_FACET_ID,
      name: 'Mounting',
      description: 'Ground vs rooftop structure packages (pick the row matching your voltage class base kW).',
      sequence: 20,
      required: true,
      defaultTemplateId: SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
    },
    {
      id: BUSINESS_MODEL_FACET_ID,
      name: 'Business model',
      description: 'Captive vs open-access scope adders.',
      sequence: 30,
      required: true,
      defaultTemplateId: SEED_TEMPLATE_ID_BUS_CLOSED,
    },
    {
      id: MONITORING_FACET_ID,
      name: 'Monitoring',
      description: 'Optional SCADA / monitoring uplift.',
      sequence: 40,
      required: false,
      defaultTemplateId: SEED_TEMPLATE_ID_MON_NONE,
    },
  ];
}
