import type { LineApplicability, ScenarioTemplate, TemplateLine } from '@/types';
import {
  BUSINESS_MODEL_FACET_ID,
  MOUNTING_FACET_ID,
  MONITORING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from '@/lib/facets/constants';

/**
 * Hand-derived from `docs/Project costing details _MW.xlsx`. Catalog item ids
 * live in `seedMaterialCatalog`; templates are facet-scoped compositions.
 */

export const SEED_TEMPLATE_ID_HT = 'tpl_seed_1mw_ht';
export const SEED_TEMPLATE_ID_LT = 'tpl_seed_700kw_lt';
export const SEED_TEMPLATE_ID_MOUNT_GROUND_HT = 'tpl_seed_mount_ground_ht';
export const SEED_TEMPLATE_ID_MOUNT_GROUND_LT = 'tpl_seed_mount_ground_lt';
export const SEED_TEMPLATE_ID_MOUNT_ROOF_HT = 'tpl_seed_mount_roof_ht';
export const SEED_TEMPLATE_ID_MOUNT_ROOF_LT = 'tpl_seed_mount_roof_lt';
export const SEED_TEMPLATE_ID_BUS_CLOSED = 'tpl_seed_bus_closed';
export const SEED_TEMPLATE_ID_BUS_OPEN = 'tpl_seed_bus_open';
export const SEED_TEMPLATE_ID_MON_NONE = 'tpl_seed_mon_none';
export const SEED_TEMPLATE_ID_MON_ADV = 'tpl_seed_mon_advanced';

const htCond: LineApplicability = { syncTypes: ['HT'] };
const ltCond: LineApplicability = { syncTypes: ['LT'] };

function line(
  templateKey: string,
  catalogItemId: string,
  sequence: number,
  rest: Omit<TemplateLine, 'id' | 'catalogItemId' | 'sequence'>
): TemplateLine {
  return {
    id: `${templateKey}_ln_${sequence}`,
    catalogItemId,
    sequence,
    ...rest,
  };
}

function shell(
  args: Omit<
    ScenarioTemplate,
    'createdAt' | 'updatedAt' | 'source' | 'lines'
  > & { lines: TemplateLine[] }
): ScenarioTemplate {
  const now = Date.now();
  return {
    ...args,
    source: 'seed',
    createdAt: now,
    updatedAt: now,
  };
}

/** 1 MW HT plant — MMS + inverter canopy live in mounting facet templates. */
function linesVoltageHt(tk: string): TemplateLine[] {
  return [
    line(tk, 'cat-pv-module-540', 1, {
      baseQuantity: 1852,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-string-250', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-dc-6mm', 3, {
      baseQuantity: 10000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-ac-150', 4, {
      baseQuantity: 500,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-ac-300', 5, {
      baseQuantity: 60,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-la-earth-16', 6, {
      baseQuantity: 60,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-la-ese', 7, {
      baseQuantity: 2,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-earth-kit', 8, {
      baseQuantity: 18,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-earth-strip-25', 9, {
      baseQuantity: 1500,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-earth-strip-50-ht', 10, {
      baseQuantity: 500,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-dcdb', 11, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-ac-ltdb-ht', 12, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-wms', 13, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-scada-ht', 14, {
      baseQuantity: 1,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-xfmr-1200', 15, {
      baseQuantity: 1,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-vcb-33kv', 16, {
      baseQuantity: 1,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-ht-switchyard', 17, {
      baseQuantity: 1,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-epc', 18, {
      baseQuantity: 1_000_000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-design', 19, {
      baseQuantity: 1_000_000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-approvals-ht', 20, {
      baseQuantity: 1_000_000,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-civil-dwc', 21, {
      baseQuantity: 1600,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-civil-stands', 22, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-logistics', 23, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-misc-hardware', 24, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-scope-ceig', 25, {
      baseAmount: 130_000,
      scalingType: 'conditional',
      applicability: htCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-scope-cleaning', 26, {
      baseAmount: 70_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
    line(tk, 'cat-scope-shed', 27, {
      baseAmount: 35_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
    line(tk, 'cat-scope-rs485', 28, {
      baseAmount: 50_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
  ];
}

/** 700 kW LT — no HT switchyard block, different metering + approvals. */
function linesVoltageLt(tk: string): TemplateLine[] {
  const ratio = 0.7;
  const lin = (n: number) => Math.round(n * ratio);
  return [
    line(tk, 'cat-pv-module-540', 1, {
      baseQuantity: lin(1852),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-string-250', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-dc-6mm', 3, {
      baseQuantity: lin(10000),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-ac-150', 4, {
      baseQuantity: lin(500),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-cable-la-earth-16', 5, {
      baseQuantity: lin(60),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-la-ese', 6, {
      baseQuantity: 2,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-earth-kit', 7, {
      baseQuantity: lin(18),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-earth-strip-25', 8, {
      baseQuantity: lin(1500),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-dcdb', 9, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-ac-ltdb-lt', 10, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-wms', 11, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-epc', 12, {
      baseQuantity: 700_000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-design', 13, {
      baseQuantity: 700_000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-svc-approvals-lt', 14, {
      baseQuantity: 700_000,
      scalingType: 'conditional',
      applicability: ltCond,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-civil-dwc', 15, {
      baseQuantity: lin(1600),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-civil-stands', 16, {
      baseQuantity: 1,
      scalingType: 'fixed',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-logistics', 17, {
      baseQuantity: 1,
      scalingType: 'fixed',
      rateOverride: 80_000,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-misc-hardware', 18, {
      baseQuantity: 1,
      scalingType: 'fixed',
      rateOverride: 150_000,
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-scope-cleaning', 19, {
      baseAmount: 50_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
    line(tk, 'cat-scope-shed', 20, {
      baseAmount: 35_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
    line(tk, 'cat-scope-rs485', 21, {
      baseAmount: 30_000,
      scalingType: 'optional',
      isOptional: true,
      includedByDefault: false,
    }),
  ];
}

function linesMountGroundHt(tk: string): TemplateLine[] {
  return [
    line(tk, 'cat-mms-ground-28', 1, {
      baseQuantity: 25000,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-canopy-mms', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
  ];
}

function linesMountGroundLt(tk: string): TemplateLine[] {
  const lin = (n: number) => Math.round(n * 0.7);
  return [
    line(tk, 'cat-mms-ground-28', 1, {
      baseQuantity: lin(25000),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-canopy-mms', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
  ];
}

function linesMountRoofHt(tk: string): TemplateLine[] {
  return [
    line(tk, 'cat-mms-rooftop', 1, {
      baseQuantity: 18500,
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-canopy-mms', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
  ];
}

function linesMountRoofLt(tk: string): TemplateLine[] {
  const lin = (n: number) => Math.round(n * 0.7);
  return [
    line(tk, 'cat-mms-rooftop', 1, {
      baseQuantity: lin(18500),
      scalingType: 'linear',
      isOptional: false,
      includedByDefault: true,
    }),
    line(tk, 'cat-inv-canopy-mms', 2, {
      baseQuantity: 1,
      scalingType: 'step',
      unitCapacityKW: 250,
      isOptional: false,
      includedByDefault: true,
    }),
  ];
}

export function seedTemplates(): ScenarioTemplate[] {
  return [
    shell({
      id: SEED_TEMPLATE_ID_HT,
      name: 'HT',
      facetId: VOLTAGE_CLASS_FACET_ID,
      syncType: 'HT',
      projectType: 'utility',
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description:
        'Canonical 1 MW utility-scale core BOM (mounting lives in the Mounting facet).',
      lines: linesVoltageHt(SEED_TEMPLATE_ID_HT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_LT,
      name: 'LT',
      facetId: VOLTAGE_CLASS_FACET_ID,
      syncType: 'LT',
      projectType: 'utility',
      baseCapacityKW: 700,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'LT-tied 700 kW core BOM (no HT yard block).',
      lines: linesVoltageLt(SEED_TEMPLATE_ID_LT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_MOUNT_GROUND_HT,
      name: 'Ground mount — HT base',
      facetId: MOUNTING_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'Galvanised ground MMS package calibrated for a 1 MW plant.',
      lines: linesMountGroundHt(SEED_TEMPLATE_ID_MOUNT_GROUND_HT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_MOUNT_GROUND_LT,
      name: 'Ground mount — LT base',
      facetId: MOUNTING_FACET_ID,
      baseCapacityKW: 700,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'Ground MMS package calibrated for a 700 kW LT plant.',
      lines: linesMountGroundLt(SEED_TEMPLATE_ID_MOUNT_GROUND_LT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_MOUNT_ROOF_HT,
      name: 'Rooftop mount — HT base',
      facetId: MOUNTING_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description:
        'Rooftop / ballasted MMS calibrated for ~1 MW. Uses max compose vs ground MMS if both ever appear.',
      lines: linesMountRoofHt(SEED_TEMPLATE_ID_MOUNT_ROOF_HT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_MOUNT_ROOF_LT,
      name: 'Rooftop mount — LT base',
      facetId: MOUNTING_FACET_ID,
      baseCapacityKW: 700,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'Rooftop MMS calibrated for 700 kW LT plants.',
      lines: linesMountRoofLt(SEED_TEMPLATE_ID_MOUNT_ROOF_LT),
    }),
    shell({
      id: SEED_TEMPLATE_ID_BUS_CLOSED,
      name: 'Closed captive',
      facetId: BUSINESS_MODEL_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'No additional open-access metering scope.',
      lines: [],
    }),
    shell({
      id: SEED_TEMPLATE_ID_BUS_OPEN,
      name: 'Open access adders',
      facetId: BUSINESS_MODEL_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'Illustrative open-access metering & billing hardware.',
      lines: [
        line(SEED_TEMPLATE_ID_BUS_OPEN, 'cat-scope-open-access-metering', 1, {
          baseAmount: 180_000,
          scalingType: 'fixed',
          isOptional: false,
          includedByDefault: true,
          composeModeOverride: 'sum',
        }),
      ],
    }),
    shell({
      id: SEED_TEMPLATE_ID_MON_NONE,
      name: 'Monitoring — baseline',
      facetId: MONITORING_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'No extra monitoring uplift.',
      lines: [],
    }),
    shell({
      id: SEED_TEMPLATE_ID_MON_ADV,
      name: 'Monitoring — advanced SCADA uplift',
      facetId: MONITORING_FACET_ID,
      baseCapacityKW: 1000,
      status: 'active',
      version: 'v1',
      effectiveFrom: Date.now(),
      description: 'Optional advanced historian & gateway (sum-composed).',
      lines: [
        line(SEED_TEMPLATE_ID_MON_ADV, 'cat-scada-advanced', 1, {
          baseQuantity: 1,
          scalingType: 'optional',
          isOptional: true,
          includedByDefault: false,
          composeModeOverride: 'sum',
        }),
      ],
    }),
  ];
}
