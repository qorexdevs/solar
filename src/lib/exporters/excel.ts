import * as XLSX from 'xlsx';
import {
  BOM_CATEGORY_LABELS,
  BOM_UOM_LABELS,
  type Estimate,
} from '@/types';
import {
  computeEstimate,
  type ComputedResults,
  type FinanceResults,
  OTHER_SCOPE_GROUP_LABEL,
} from '@/lib/calc';
import { safeFileName } from '@/lib/filename';
import { formatPlantCapacityKW } from '@/lib/format';

export type ExcelOptions = {
  includeInputs: boolean;
  includePnL: boolean;
  includeMethodology: boolean;
};

export function downloadExcel(estimate: Estimate, options: ExcelOptions): void {
  const wb = buildExcelWorkbook(estimate, options);
  XLSX.writeFile(wb, `${safeFileName(estimate.name)}.xlsx`);
}

export function buildExcelWorkbook(
  estimate: Estimate,
  options: ExcelOptions
): XLSX.WorkBook {
  const results = computeEstimate(estimate);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, summarySheet(estimate, results), 'Summary');

  if (options.includeInputs) {
    XLSX.utils.book_append_sheet(wb, inputsSheet(estimate), 'Inputs');
    XLSX.utils.book_append_sheet(wb, capexSummarySheet(results), 'CAPEX Summary');
    XLSX.utils.book_append_sheet(wb, detailedBOMSheet(estimate), 'Detailed BOM');
    XLSX.utils.book_append_sheet(wb, otherScopeSheet(estimate), 'Other Scope');
    if (results.finance?.yield && estimate.location) {
      XLSX.utils.book_append_sheet(
        wb,
        irradianceSheet(estimate, results.finance),
        'Irradiance & Yield'
      );
    }
  }

  if (options.includePnL && results.finance) {
    XLSX.utils.book_append_sheet(wb, pnlSheet(results.finance), 'P&L by Year');
    XLSX.utils.book_append_sheet(wb, loanSheet(results.finance), 'Loan Schedule');
  }

  if (options.includeMethodology) {
    XLSX.utils.book_append_sheet(wb, methodologySheet(), 'Methodology');
  }

  return wb;
}

function summarySheet(estimate: Estimate, r: ComputedResults): XLSX.WorkSheet {
  const t = estimate.totals;
  const rows: (string | number)[][] = [
    ['Solar Plant Estimate'],
    ['Estimate', estimate.name],
    ['Status', estimate.status],
    ['Target capacity', formatPlantCapacityKW(estimate.targetCapacityKW)],
    ['Generated', new Date().toISOString()],
    [],
    ['BOM totals'],
    ['Main BOM subtotal (₹)', round(t.mainBomSubtotal)],
    ['Main BOM GST (₹)', round(t.mainBomGst)],
    ['Other Scope subtotal (₹)', round(t.otherScopeSubtotal)],
    ['Other Scope GST (₹)', round(t.otherScopeGst)],
    ['Grand total (₹)', round(t.grandTotal)],
    ['Per kW rate (₹)', round(t.perKwRate)],
    [],
    ['Finance modeling', estimate.finance?.enabled ? 'enabled' : 'disabled'],
  ];
  if (r.finance) {
    const f = r.finance;
    rows.push(
      ['Equity (₹)', round(f.equity)],
      ['Loan amount (₹)', round(f.loanAmount)],
      ['NPV (₹)', round(f.npv)],
      ['IRR', Number.isFinite(f.irr) ? `${(f.irr * 100).toFixed(2)}%` : '—'],
      [
        'Payback (years)',
        f.paybackYears === null ? '—' : Number(f.paybackYears.toFixed(2)),
      ],
      ['Break-even year', f.breakEvenYear ?? '—'],
      ['Annual CO₂ offset (tonnes, Y1)', round(f.co2.annualYear1)],
      ['Lifetime CO₂ offset (tonnes)', round(f.co2.cumulative)]
    );
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function inputsSheet(estimate: Estimate): XLSX.WorkSheet {
  const optionalLinePicks = Object.values(
    estimate.selectedOptionsPerTemplate
  ).reduce((acc, o) => acc + o.lineIds.length, 0);
  const rows: (string | number)[][] = [
    ['Input', 'Value'],
    ['Estimate name', estimate.name],
    ['Status', estimate.status],
    ['Target capacity', formatPlantCapacityKW(estimate.targetCapacityKW)],
    ['Facet selections (JSON)', JSON.stringify(estimate.selections)],
    ['Optional template line picks (count)', optionalLinePicks],
    [
      'Compose overrides (JSON)',
      JSON.stringify(estimate.composeOverrides ?? {}),
    ],
  ];
  if (estimate.location) {
    rows.push(
      [],
      ['Location'],
      ['Label', estimate.location.label ?? ''],
      ['Latitude', estimate.location.lat],
      ['Longitude', estimate.location.lng],
      ['Tilt (°)', estimate.location.tiltDeg],
      ['Azimuth (°)', estimate.location.azimuthDeg]
    );
  }
  if (estimate.finance?.enabled) {
    const { basics, revenue, om, financing } = estimate.finance;
    rows.push(
      [],
      ['Finance — Basics'],
      ['Lifespan (years)', basics.lifespanYears],
      ['Capacity Utilization Factor (%)', basics.cufPct],
      ['Panel degradation (%/yr)', basics.degradationPct],
      ['Inflation (%/yr)', basics.inflationPct],
      ['Discount rate (%)', basics.discountPct],
      [],
      ['Finance — Revenue'],
      ['PPA rate (₹/kWh)', revenue.ppaRate],
      ['PPA escalation (%/yr)', revenue.ppaEscalationPct],
      [],
      ['Finance — O&M'],
      ['O&M as % of CAPEX', om.percentOfCapex],
      ['Number of overrides', om.overrides.length],
      [],
      ['Finance — Financing'],
      ['% financed', financing.financedPct],
      ['Manual loan amount (₹)', financing.manualLoanAmount ?? ''],
      ['Interest (%)', financing.interestPct],
      ['Term (years)', financing.termYears],
      ['Grace period (years)', financing.gracePeriodYears]
    );
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function capexSummarySheet(r: ComputedResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Category', 'Subtotal (₹)', 'GST (₹)', 'Total (₹)', 'Lines'],
  ];
  for (const group of Object.values(r.capex.byCategory)) {
    rows.push([
      group.label,
      round(group.subtotal),
      round(group.tax),
      round(group.total),
      group.lines.filter((l) => !l.excluded).length,
    ]);
  }
  rows.push([
    'Total',
    round(r.capex.subtotal),
    round(r.capex.tax),
    round(r.capex.total),
    r.capex.lines.filter((l) => !l.excluded).length,
  ]);
  return XLSX.utils.aoa_to_sheet(rows);
}

function detailedBOMSheet(estimate: Estimate): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    [
      'Sequence',
      'Category',
      'Item',
      'Description',
      'Make',
      'UoM',
      'Quantity',
      'Rate (₹)',
      'GST %',
      'Subtotal (₹)',
      'GST (₹)',
      'Total (₹)',
      'Scaling',
      'Status',
      'Notes',
    ],
  ];
  for (const line of estimate.materialized.mainLines) {
    let status = 'included';
    if (line.applicabilityFiltered) status = 'sync gated';
    else if (line.userExcluded) status = 'user excluded';
    rows.push([
      line.sequence,
      BOM_CATEGORY_LABELS[line.category] ?? line.category,
      line.itemName,
      line.description,
      line.make ?? '',
      BOM_UOM_LABELS[line.uom] ?? line.uom,
      Number(line.quantity.toFixed(2)),
      round(line.rate),
      line.gstPercent,
      round(line.subtotal),
      round(line.gst),
      round(line.total),
      line.scalingType,
      status,
      line.notes ?? '',
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function otherScopeSheet(estimate: Estimate): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    [
      'Sequence',
      'Scope item',
      'Amount (₹)',
      'GST %',
      'GST (₹)',
      'Total (₹)',
      'Scaling',
      'Status',
      'Notes',
    ],
  ];
  for (const item of estimate.materialized.otherLines) {
    let status = 'included';
    if (item.applicabilityFiltered) status = 'sync gated';
    else if (item.userExcluded) status = 'user excluded';
    rows.push([
      item.sequence,
      item.scopeName,
      round(item.amount),
      item.gstPercent,
      round(item.gst),
      round(item.total),
      item.scalingType,
      status,
      item.notes ?? '',
    ]);
  }
  rows.push([], [
    OTHER_SCOPE_GROUP_LABEL,
    round(estimate.totals.otherScopeSubtotal),
    '',
    round(estimate.totals.otherScopeGst),
    round(estimate.totals.otherScopeSubtotal + estimate.totals.otherScopeGst),
    '',
    '',
    '',
  ]);
  return XLSX.utils.aoa_to_sheet(rows);
}

function pnlSheet(f: FinanceResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    [
      'Year',
      'Energy (kWh)',
      'Revenue (₹)',
      'O&M (₹)',
      'Loan interest (₹)',
      'Loan principal (₹)',
      'Loan payment (₹)',
      'Net cash flow (₹)',
      'Cumulative CF (₹)',
    ],
  ];
  for (const row of f.pnl) {
    rows.push([
      row.year,
      round(row.energyKWh),
      round(row.revenue),
      round(row.om),
      round(row.interest),
      round(row.principal),
      round(row.loanPayment),
      round(row.netCashFlow),
      round(row.cumulativeCashFlow),
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function loanSheet(f: FinanceResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Year', 'Interest (₹)', 'Principal (₹)', 'Payment (₹)', 'Balance (₹)'],
  ];
  for (const row of f.loan) {
    rows.push([
      row.year,
      round(row.interest),
      round(row.principal),
      round(row.payment),
      round(row.balance),
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTH_DAYS_X = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function irradianceSheet(estimate: Estimate, f: FinanceResults): XLSX.WorkSheet {
  const y = f.yield!;
  const loc = estimate.location!;
  const annualGHI = y.monthlyGHI.reduce((s, v, m) => s + v * MONTH_DAYS_X[m], 0);

  const rows: (string | number)[][] = [
    ['Site Irradiance & Yield'],
    [],
    ['Location label', loc.label ?? ''],
    ['Latitude', loc.lat],
    ['Longitude', loc.lng],
    ['Tilt (°)', loc.tiltDeg],
    ['Azimuth (°)', loc.azimuthDeg],
    ['Tilt purpose', loc.tiltPurpose],
    ['Soiling environment', loc.soilingEnv],
    ['Albedo type', loc.albedoType],
    ['Albedo (ρ)', loc.albedo],
    ['Urban shading flagged', loc.urbanShading ? 'yes' : 'no'],
    [],
    ['Headline metrics'],
    ['Annual GHI (kWh/m²/yr)', round(annualGHI)],
    ['Annual POA (kWh/m²/yr)', round(y.annualPOA)],
    ['Specific yield (kWh/kWp/yr)', round(y.annualSpecificYield)],
    ['Implied CUF (%)', Number(y.impliedCufPct.toFixed(2))],
    ['Monsoon CV (%)', Number(y.monsoonUncertainty.cvPct.toFixed(2))],
    ['Snap distance (km)', Number(y.snapDistanceKm.toFixed(1))],
    [],
    [
      'Month',
      'GHI (kWh/m²/day)',
      'POA (kWh/m²/day)',
      'AC (kWh/kWp/month)',
    ],
  ];
  for (let m = 0; m < 12; m++) {
    rows.push([
      MONTHS_SHORT[m],
      Number(y.monthlyGHI[m].toFixed(2)),
      Number(y.monthlyPOA[m].toFixed(2)),
      round(y.monthlyACkWhPerKWp[m]),
    ]);
  }

  rows.push([]);
  rows.push(['Loss waterfall', 'kWh/kWp/yr', 'Δ', 'Δ %']);
  for (const s of y.lossWaterfall) {
    rows.push([
      s.label,
      round(s.kWhPerKWpYr),
      round(s.deltaKWhPerKWpYr),
      Number(s.deltaPct.toFixed(2)),
    ]);
  }

  rows.push([]);
  rows.push(['Source provenance']);
  rows.push(['Dataset', y.provenance.dataset]);
  rows.push(['Resolution (km)', y.provenance.resolution_km]);
  rows.push(['Years', `${y.provenance.years[0]}–${y.provenance.years[1]}`]);
  rows.push(['Retrieved', y.provenance.retrieved_at]);
  rows.push([]);
  rows.push([
    'Disclaimer',
    'Indicative sizing only. Suitable for early feasibility and vendor proposal sanity checks, not for project finance, lender due diligence, or bankable resource reports.',
  ]);
  if (loc.urbanShading) {
    rows.push([
      'Urban shading',
      'Flagged. Surrounding obstructions can shave 5–15% off the simulated yield.',
    ]);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

function methodologySheet(): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Methodology & Assumptions'],
    [],
    ['BOM scaling', 'Each BOM line carries a scalingType (fixed / linear / step / conditional / optional) and an optional safe-DSL formula evaluated at materialization time.'],
    ['Per-line subtotal', 'quantity × rate'],
    ['Per-line GST', 'subtotal × gstPercent / 100'],
    ['Per-line total', 'subtotal + GST'],
    ['Grand total', 'Σ Main BOM total + Σ Other Scope total (excludes user-deselected and sync-gated lines)'],
    ['Per kW rate', 'Grand total / target capacity (kW)'],
    [],
    ['Finance (when enabled)'],
    ['Annual energy', 'Plant kW × CUF × 8,760 hours (or POA × PR when a location is pinned)'],
    ['Degradation', 'Output_year_n = Annual Output × (1 - degradation_rate)^(n-1)'],
    ['Revenue', 'Output_year_n × PPA_rate × (1 + escalation)^(n-1)'],
    ['O&M', 'Base × (1 + inflation)^(n-1), with optional year overrides'],
    ['Loan', 'Interest-only during grace period; annuity (EMI) thereafter'],
    ['NPV', '-Equity + Σ Net_CF_n / (1 + discount)^n'],
    ['IRR', 'Newton-Raphson seeded at 10%, bisection fallback'],
    ['CO₂ factor', '0.82 kg/kWh (India CEA grid default)'],
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function round(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}
