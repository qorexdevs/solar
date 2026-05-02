import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Scenario } from '@/types';
import { MATERIAL_KEYS, MATERIAL_LABELS, PROJECT_TYPE_LABELS } from '@/types';
import { computeScenario, type ComputedResults } from '@/lib/calc';
import { safeFileName } from '@/lib/filename';
import {
  formatINR,
  formatPercent,
  formatRate,
  formatTonnes,
  formatYears,
} from '@/lib/format';

export type PdfOptions = {
  includeSummary: boolean;
  includePnL: boolean;
  includeMethodology: boolean;
};

const COLORS = {
  primary: '#003527',
  primaryFixed: '#b0f0d6',
  surfaceContainer: '#e5eeff',
  outline: '#707974',
  textOnSurface: '#0b1c30',
  textOnSurfaceVariant: '#404944',
  surfaceTint: '#2b6954',
};

export function buildPdf(scenario: Scenario, options: PdfOptions): jsPDF {
  const results = computeScenario(scenario);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  drawCover(doc, scenario, pageWidth, margin);

  if (options.includeSummary) {
    addSummaryPage(doc, scenario, results, pageWidth, margin);
    addCapexPage(doc, scenario, results, margin);
  }

  if (options.includePnL) {
    addPnLPage(doc, results, margin);
  }

  if (options.includeMethodology) {
    addMethodologyPage(doc, margin);
  }

  return doc;
}

function drawCover(doc: jsPDF, scenario: Scenario, pageWidth: number, margin: number) {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 240, 'F');
  doc.setFillColor(COLORS.primaryFixed);
  doc.rect(pageWidth - 80, 0, 80, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('SolarCalc India', margin, 70);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(scenario.name, margin, 130, { maxWidth: pageWidth - margin * 2 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(
    `${PROJECT_TYPE_LABELS[scenario.projectType]} · ${scenario.basics.sizeMW} MW · ${scenario.basics.lifespanYears} yr lifespan`,
    margin,
    170
  );

  doc.setTextColor(COLORS.textOnSurfaceVariant);
  doc.setFontSize(11);
  doc.text(
    `Generated ${new Date().toLocaleString('en-IN')}`,
    margin,
    pageHeight - margin
  );
}

function addSummaryPage(
  doc: jsPDF,
  scenario: Scenario,
  r: ComputedResults,
  pageWidth: number,
  margin: number
) {
  doc.addPage();
  let y = margin;

  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Executive Summary', margin, y);
  y += 10;

  doc.setDrawColor(COLORS.outline);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // KPI grid
  const cellW = (pageWidth - margin * 2 - 24) / 3;
  const kpis = [
    { label: 'IRR', value: Number.isFinite(r.irr) ? formatRate(r.irr) : '—' },
    { label: 'NPV', value: formatINR(r.npv) },
    { label: 'Payback', value: formatYears(r.paybackYears) },
  ];
  kpis.forEach((kpi, i) => {
    const x = margin + i * (cellW + 12);
    doc.setFillColor(COLORS.surfaceContainer);
    doc.roundedRect(x, y, cellW, 70, 8, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.outline);
    doc.text(kpi.label, x + 12, y + 22);
    doc.setFontSize(20);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 12, y + 50);
    doc.setFont('helvetica', 'normal');
  });
  y += 90;

  // Project basics
  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: [
      ['Plant size', `${scenario.basics.sizeMW} MW`],
      ['Lifespan', `${scenario.basics.lifespanYears} years`],
      ['Capacity Utilization Factor', formatPercent(scenario.basics.cufPct)],
      ['Panel degradation', `${scenario.basics.degradationPct}% / yr`],
      ['Inflation', formatPercent(scenario.basics.inflationPct)],
      ['Discount rate', formatPercent(scenario.basics.discountPct)],
      ['PPA rate', `₹${scenario.revenue.ppaRate} / kWh`],
      ['PPA escalation', formatPercent(scenario.revenue.ppaEscalationPct)],
      ['Year-1 O&M', `${scenario.om.percentOfCapex}% of CAPEX`],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error jsPDF mutates
  y = doc.lastAutoTable.finalY + 20;

  // Financing & sustainability
  autoTable(doc, {
    startY: y,
    head: [['Financing & sustainability', 'Value']],
    body: [
      ['Total CAPEX', formatINR(r.capex.total)],
      ['Equity', formatINR(r.equity)],
      ['Loan amount', formatINR(r.loanAmount)],
      ['Interest rate', formatPercent(scenario.financing.interestPct)],
      ['Loan term', `${scenario.financing.termYears} years`],
      ['Grace period', `${scenario.financing.gracePeriodYears} years`],
      ['Annual CO₂ offset (Y1)', formatTonnes(r.co2.annualYear1)],
      ['Lifetime CO₂ offset', formatTonnes(r.co2.cumulative)],
      ['Break-even year', r.breakEvenYear === null ? '—' : `Y${r.breakEvenYear}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
}

function addCapexPage(
  doc: jsPDF,
  scenario: Scenario,
  r: ComputedResults,
  margin: number
) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CAPEX Breakdown', margin, margin);

  const body: (string | number)[][] = [];
  for (const key of MATERIAL_KEYS) {
    const item = scenario.materials[key];
    body.push([
      MATERIAL_LABELS[key],
      formatINR(item.unitCost),
      String(item.quantity),
      formatINR(r.capex.byKey[key]?.amount ?? 0),
    ]);
  }
  for (const item of scenario.materials.custom) {
    body.push([
      item.name,
      formatINR(item.unitCost),
      String(item.quantity),
      formatINR(r.capex.byKey[item.id]?.amount ?? 0),
    ]);
  }
  body.push(['Total', '', '', formatINR(r.capex.total)]);

  autoTable(doc, {
    startY: margin + 18,
    head: [['Category', 'Unit cost', 'Quantity', 'Subtotal']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
}

function addPnLPage(doc: jsPDF, r: ComputedResults, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Year-by-Year P&L', margin, margin);

  autoTable(doc, {
    startY: margin + 18,
    head: [['Yr', 'Revenue', 'O&M', 'Loan pmt', 'Net CF', 'Cumulative']],
    body: r.pnl.map((row) => [
      `Y${row.year}`,
      formatINR(row.revenue),
      formatINR(row.om),
      row.loanPayment > 0 ? formatINR(row.loanPayment) : '—',
      formatINR(row.netCashFlow),
      formatINR(row.cumulativeCashFlow),
    ]),
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
}

function addMethodologyPage(doc: jsPDF, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Methodology & Assumptions', margin, margin);

  const body = [
    ['Annual energy', 'Plant kW × CUF × 8,760 hours'],
    ['Degradation', 'Output_n = Annual × (1 - degradation)^(n-1)'],
    ['Revenue', 'Output_n × PPA × (1 + escalation)^(n-1)'],
    ['O&M', 'Base × (1 + inflation)^(n-1), year overrides allowed'],
    ['Loan', 'Interest-only during grace period; annuity afterwards'],
    ['NPV', '-Equity + Σ Net_CF_n / (1 + discount)^n'],
    ['IRR', 'Newton-Raphson @ 10% seed, bisection fallback'],
    ['CO₂ factor', '0.82 kg/kWh (India CEA grid default)'],
  ];

  autoTable(doc, {
    startY: margin + 18,
    head: [['Concept', 'Definition']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
}

export function downloadPdf(scenario: Scenario, options: PdfOptions): void {
  const doc = buildPdf(scenario, options);
  doc.save(`${safeFileName(scenario.name)}.pdf`);
}
