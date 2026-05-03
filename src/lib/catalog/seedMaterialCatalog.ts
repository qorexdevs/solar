import type { ComposeMode, MaterialCatalogItem } from '@/types';
import type { BOMCategory, BOMUom } from '@/types';

function stamp(): { createdAt: number; updatedAt: number } {
  const t = Date.now();
  return { createdAt: t, updatedAt: t };
}

function bom(
  id: string,
  name: string,
  fields: {
    category: BOMCategory;
    uom: BOMUom;
    defaultRate: number;
    gstPercent: number;
    defaultComposeMode?: ComposeMode;
    description?: string;
    make?: string;
    notes?: string;
  }
): MaterialCatalogItem {
  return {
    id,
    name,
    kind: 'bom',
    category: fields.category,
    uom: fields.uom,
    defaultRate: fields.defaultRate,
    gstPercent: fields.gstPercent,
    defaultComposeMode: fields.defaultComposeMode ?? 'max',
    description: fields.description,
    make: fields.make,
    notes: fields.notes,
    status: 'active',
    ...stamp(),
  };
}

function scope(
  id: string,
  name: string,
  fields: {
    category: BOMCategory;
    defaultAmount: number;
    gstPercent: number;
    defaultComposeMode?: ComposeMode;
    description?: string;
    notes?: string;
  }
): MaterialCatalogItem {
  return {
    id,
    name,
    kind: 'scope',
    category: fields.category,
    defaultAmount: fields.defaultAmount,
    gstPercent: fields.gstPercent,
    defaultComposeMode: fields.defaultComposeMode ?? 'sum',
    description: fields.description,
    notes: fields.notes,
    status: 'active',
    ...stamp(),
  };
}

/** Canonical items derived from legacy Project costing spreadsheet seeds. */
export function seedMaterialCatalog(): MaterialCatalogItem[] {
  return [
    bom('cat-pv-module-540', 'Solar PV Module 540 Wp', {
      category: 'modules',
      uom: 'count',
      defaultRate: 7290,
      gstPercent: 12,
      description:
        'Solar PV Module — Mono-PERC, 540 Wp, half-cut bifacial. Make: APS / Premier / N Icon.',
      make: 'APS / Premier / N Icon',
    }),
    bom('cat-inv-string-250', 'String Inverter 250 kW', {
      category: 'inverters',
      uom: 'count',
      defaultRate: 410_000,
      gstPercent: 12,
      description:
        'Grid-connect solar inverter, 1 × 250 kW, 800 V AC, MPPT, DC:AC ≤ 1.5.',
      make: 'Solis / APS / Polycab',
    }),
    bom('cat-cable-dc-6mm', '1C × 6 sq.mm Cu Solar DC Cable', {
      category: 'cables',
      uom: 'meter',
      defaultRate: 52,
      gstPercent: 18,
      description: 'Array → string → inverter DC cable run.',
      make: 'Polycab / Lapp',
    }),
    bom('cat-cable-ac-150', '3C × 150 sq.mm AC Armoured Cable', {
      category: 'cables',
      uom: 'meter',
      defaultRate: 680,
      gstPercent: 18,
      description: 'XLPE armoured Al PVC 1.1 kV FR cable.',
      make: 'Polycab / Universal',
    }),
    bom('cat-cable-ac-300', '3C × 300 sq.mm AC Armoured Cable', {
      category: 'cables',
      uom: 'meter',
      defaultRate: 1250,
      gstPercent: 18,
      description: 'XLPE armoured Al PVC 1.1 kV FR cable for inverter trunks.',
      make: 'Polycab / Universal',
    }),
    bom('cat-cable-la-earth-16', '1C × 16 sq.mm Cu LA Earth Cable', {
      category: 'cables',
      uom: 'meter',
      defaultRate: 300,
      gstPercent: 18,
      description: '1.1 kV FR flexible Cu cable for lightning-arrestor earthing.',
      make: 'Polycab / Universal',
    }),
    bom('cat-mms-ground-28', 'Module Mounting Structure (28 MMS)', {
      category: 'mounting',
      uom: 'kg',
      defaultRate: 100,
      gstPercent: 18,
      description:
        'Galvanised penetrating-type 28 MMS mounting structure (kg of steel).',
      make: 'Galvanized',
    }),
    bom('cat-mms-rooftop', 'Module Mounting — Rooftop ballast kit', {
      category: 'mounting',
      uom: 'kg',
      defaultRate: 115,
      gstPercent: 18,
      description: 'Ballasted rooftop MMS (kg steel / ballast composite).',
      defaultComposeMode: 'max',
    }),
    bom('cat-inv-canopy-mms', 'Inverter Mounting Structure with Canopy', {
      category: 'mounting',
      uom: 'count',
      defaultRate: 8000,
      gstPercent: 18,
      description: 'One canopy structure per inverter block.',
    }),
    bom('cat-la-ese', 'Lightning Arrestor (ESE)', {
      category: 'earthing',
      uom: 'count',
      defaultRate: 32_000,
      gstPercent: 18,
      description: 'ESE / conventional with counter (Mytrah / Torq).',
      make: 'Torq',
    }),
    bom('cat-earth-kit', 'Earthing Kit (Cu-bonded)', {
      category: 'earthing',
      uom: 'meter',
      defaultRate: 3000,
      gstPercent: 18,
      description:
        '40 mm dia × 2 m copper-bonded maintenance-free electrode kit.',
    }),
    bom('cat-earth-strip-25', 'Earthing Strip GI 25 × 3 mm', {
      category: 'earthing',
      uom: 'kg',
      defaultRate: 82,
      gstPercent: 18,
      description: 'Hot-dip GI strip (kg).',
      make: 'Hot Dip',
    }),
    bom('cat-earth-strip-50-ht', 'Earthing Strip GI 50 × 6 mm (HT grade)', {
      category: 'earthing',
      uom: 'kg',
      defaultRate: 150,
      gstPercent: 18,
      description: 'HT-grade earth-pit grid GI strip (kg).',
    }),
    bom('cat-dcdb', 'Inverter Termination Box (DCDB)', {
      category: 'metering',
      uom: 'count',
      defaultRate: 55_000,
      gstPercent: 18,
      description: 'One DCDB per inverter block.',
    }),
    bom('cat-ac-ltdb-ht', '4-IN-1-OUT AC LTDB / ACB', {
      category: 'metering',
      uom: 'count',
      defaultRate: 500_000,
      gstPercent: 18,
      description: '250A 4P MCCB & 1000A ACB with metering, SPD, breakers.',
      make: 'L&T / Schneider / Siemens',
    }),
    bom('cat-ac-ltdb-lt', 'AC LTDB / ACB Panel', {
      category: 'metering',
      uom: 'count',
      defaultRate: 350_000,
      gstPercent: 18,
      description: 'LT distribution panel with metering, breakers, SPD.',
      make: 'L&T / Schneider / Siemens',
    }),
    bom('cat-wms', 'Weather Monitoring System', {
      category: 'monitoring',
      uom: 'count',
      defaultRate: 100_000,
      gstPercent: 18,
      description: 'On-site WMS with data logger.',
    }),
    bom('cat-scada-ht', 'SCADA', {
      category: 'monitoring',
      uom: 'count',
      defaultRate: 200_000,
      gstPercent: 18,
      description: 'Plant-wide SCADA control + monitoring.',
    }),
    bom('cat-scada-advanced', 'SCADA — Advanced historian & gateway', {
      category: 'monitoring',
      uom: 'count',
      defaultRate: 350_000,
      gstPercent: 18,
      description: 'Historian + dual-site gateway bundle (optional uplift).',
      defaultComposeMode: 'sum',
    }),
    bom('cat-xfmr-1200', 'Step-Up Power Transformer 1200 kVA', {
      category: 'switchyard',
      uom: 'count',
      defaultRate: 1_600_000,
      gstPercent: 18,
      description: '0.80 / 33 kV oil-cooled step-up transformer.',
      make: 'Esennar',
    }),
    bom('cat-vcb-33kv', 'VCB Panel 33 kV', {
      category: 'switchyard',
      uom: 'count',
      defaultRate: 700_000,
      gstPercent: 18,
      description: 'VCB panel with metering & protection control.',
      make: 'CG / ABB',
    }),
    bom('cat-ht-switchyard', 'HT Switch Yard', {
      category: 'switchyard',
      uom: 'count',
      defaultRate: 500_000,
      gstPercent: 18,
      description: 'HT switchyard erection.',
    }),
    bom('cat-svc-epc', 'Installation & Commissioning + Civil', {
      category: 'services',
      uom: 'Wp',
      defaultRate: 2.75,
      gstPercent: 18,
      description: 'EPC labour + civil work, ₹/Wp.',
    }),
    bom('cat-svc-design', 'Design & Engineering', {
      category: 'services',
      uom: 'Wp',
      defaultRate: 0.2,
      gstPercent: 18,
      description: 'Detailed engineering + drawings, ₹/Wp.',
    }),
    bom('cat-svc-approvals-ht', 'Approvals (HT)', {
      category: 'services',
      uom: 'Wp',
      defaultRate: 1.0,
      gstPercent: 18,
      description: 'NREDCAP / DISCOM / SLDC + synchronisation, HT.',
    }),
    bom('cat-svc-approvals-lt', 'Approvals (LT)', {
      category: 'services',
      uom: 'Wp',
      defaultRate: 0.75,
      gstPercent: 18,
      description: 'NREDCAP / DISCOM + synchronisation, LT.',
    }),
    bom('cat-civil-dwc', 'DWC Pipe (UV-protected)', {
      category: 'civil',
      uom: 'meter',
      defaultRate: 45,
      gstPercent: 18,
      description: 'DWC piping, m.',
    }),
    bom('cat-civil-stands', 'Inverter Stands & ACDB Platform', {
      category: 'civil',
      uom: 'lot',
      defaultRate: 50_000,
      gstPercent: 18,
      description: 'Concrete stands + ACDB mounting platform.',
    }),
    bom('cat-logistics', 'Transport & Storage', {
      category: 'logistics',
      uom: 'lot',
      defaultRate: 100_000,
      gstPercent: 18,
      description: 'Inbound + onsite logistics.',
    }),
    bom('cat-misc-hardware', 'Hardware Misc', {
      category: 'misc',
      uom: 'lot',
      defaultRate: 200_000,
      gstPercent: 18,
      description: 'Fasteners, lugs, glands, etc.',
    }),
    scope('cat-scope-ceig', 'CEIG Inspection & Approval Fee', {
      category: 'services',
      defaultAmount: 130_000,
      gstPercent: 18,
      description: 'Regulatory CEIG inspection + approval (HT plants).',
    }),
    scope('cat-scope-cleaning', 'Module Cleaning System', {
      category: 'services',
      defaultAmount: 70_000,
      gstPercent: 18,
      defaultComposeMode: 'max',
    }),
    scope('cat-scope-shed', 'Shed for Inverter & ACDB', {
      category: 'civil',
      defaultAmount: 35_000,
      gstPercent: 18,
      defaultComposeMode: 'max',
    }),
    scope('cat-scope-rs485', 'RS-485 Communication Cable & Accessories', {
      category: 'cables',
      defaultAmount: 50_000,
      gstPercent: 18,
      defaultComposeMode: 'sum',
    }),
    scope('cat-scope-open-access-metering', 'Open Access — metering & billing interface', {
      category: 'metering',
      defaultAmount: 180_000,
      gstPercent: 18,
      description: 'CT/PT metering kit + interface work (illustrative).',
      defaultComposeMode: 'sum',
    }),
  ];
}
