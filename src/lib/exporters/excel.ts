import * as XLSX from 'xlsx';
import type { Scenario } from '@/types';
import { MATERIAL_KEYS, MATERIAL_LABELS } from '@/types';
import { computeScenario, type ComputedResults } from '@/lib/calc';
import { safeFileName } from '@/lib/filename';

export type ExcelOptions = {
  includeInputs: boolean;
  includePnL: boolean;
  includeMethodology: boolean;
};

export function downloadExcel(scenario: Scenario, options: ExcelOptions): void {
  const wb = buildExcelWorkbook(scenario, options);
  XLSX.writeFile(wb, `${safeFileName(scenario.name)}.xlsx`);
}

export function buildExcelWorkbook(
  scenario: Scenario,
  options: ExcelOptions
): XLSX.WorkBook {
  const results = computeScenario(scenario);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, summarySheet(scenario, results), 'Summary');

  if (options.includeInputs) {
    XLSX.utils.book_append_sheet(wb, inputsSheet(scenario), 'Inputs');
    XLSX.utils.book_append_sheet(wb, capexSheet(scenario, results), 'CAPEX');
  }

  if (options.includePnL) {
    XLSX.utils.book_append_sheet(wb, pnlSheet(results), 'P&L by Year');
    XLSX.utils.book_append_sheet(wb, loanSheet(results), 'Loan Schedule');
  }

  if (options.includeMethodology) {
    XLSX.utils.book_append_sheet(wb, methodologySheet(), 'Methodology');
  }

  return wb;
}

function summarySheet(scenario: Scenario, r: ComputedResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Solar Plant Feasibility Report'],
    ['Scenario', scenario.name],
    ['Project type', scenario.projectType],
    ['Plant size (MW)', scenario.basics.sizeMW],
    ['Lifespan (years)', scenario.basics.lifespanYears],
    ['Generated', new Date().toISOString()],
    [],
    ['Key metrics'],
    ['Total CAPEX (₹)', round(r.capex.total)],
    ['Equity (₹)', round(r.equity)],
    ['Loan amount (₹)', round(r.loanAmount)],
    ['NPV (₹)', round(r.npv)],
    ['IRR', Number.isFinite(r.irr) ? `${(r.irr * 100).toFixed(2)}%` : '—'],
    [
      'Payback (years)',
      r.paybackYears === null ? '—' : Number(r.paybackYears.toFixed(2)),
    ],
    ['Break-even year', r.breakEvenYear ?? '—'],
    ['Annual CO₂ offset (tonnes, Y1)', round(r.co2.annualYear1)],
    ['Lifetime CO₂ offset (tonnes)', round(r.co2.cumulative)],
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function inputsSheet(scenario: Scenario): XLSX.WorkSheet {
  const { basics, revenue, om, financing } = scenario;
  const rows: (string | number)[][] = [
    ['Input', 'Value'],
    ['Plant size (MW)', basics.sizeMW],
    ['Lifespan (years)', basics.lifespanYears],
    ['Capacity Utilization Factor (%)', basics.cufPct],
    ['Panel degradation (%/yr)', basics.degradationPct],
    ['Inflation (%/yr)', basics.inflationPct],
    ['Discount rate (%)', basics.discountPct],
    [],
    ['Revenue'],
    ['PPA rate (₹/kWh)', revenue.ppaRate],
    ['PPA escalation (%/yr)', revenue.ppaEscalationPct],
    [],
    ['O&M'],
    ['O&M as % of CAPEX', om.percentOfCapex],
    ['Number of overrides', om.overrides.length],
    [],
    ['Financing'],
    ['% financed', financing.financedPct],
    ['Manual loan amount (₹)', financing.manualLoanAmount ?? ''],
    ['Interest (%)', financing.interestPct],
    ['Term (years)', financing.termYears],
    ['Grace period (years)', financing.gracePeriodYears],
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function capexSheet(scenario: Scenario, r: ComputedResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Category', 'Unit cost (₹)', 'Quantity', 'Subtotal (₹)'],
  ];
  for (const key of MATERIAL_KEYS) {
    const item = scenario.materials[key];
    rows.push([
      MATERIAL_LABELS[key],
      item.unitCost,
      item.quantity,
      round(r.capex.byKey[key]?.amount ?? 0),
    ]);
  }
  for (const item of scenario.materials.custom) {
    rows.push([
      item.name,
      item.unitCost,
      item.quantity,
      round(r.capex.byKey[item.id]?.amount ?? 0),
    ]);
  }
  rows.push(['Total', '', '', round(r.capex.total)]);
  return XLSX.utils.aoa_to_sheet(rows);
}

function pnlSheet(r: ComputedResults): XLSX.WorkSheet {
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
  for (const row of r.pnl) {
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

function loanSheet(r: ComputedResults): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Year', 'Interest (₹)', 'Principal (₹)', 'Payment (₹)', 'Balance (₹)'],
  ];
  for (const row of r.loan) {
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

function methodologySheet(): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Methodology & Assumptions'],
    [],
    ['Annual energy', 'Plant kW × CUF × 8,760 hours'],
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
