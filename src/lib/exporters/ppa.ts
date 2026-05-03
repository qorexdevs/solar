import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate } from '@/types';
import {
  type Indexation,
  lcoeINRPerKWh,
  type PPASolveResult,
} from '@/lib/calc';
import { safeFileName } from '@/lib/filename';
import { formatINR, formatPercent, formatPlantCapacityKW, formatRate } from '@/lib/format';

export type PPATermSheetInputs = {
  estimate: Estimate;
  result: PPASolveResult;
  termYears: number;
  escalationPct: number;
  indexation: Indexation;
  targetIRR: number;
  /** Optional buyer/seller info typed in by the user. */
  buyerName?: string;
  sellerName?: string;
  /** Optional human-friendly notes printed at the bottom. */
  notes?: string;
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

export function buildPPATermSheet(inputs: PPATermSheetInputs): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  drawCover(doc, inputs, pageWidth, margin);
  addPartiesPage(doc, inputs, pageWidth, margin);
  addTariffSchedulePage(doc, inputs, margin);
  addCommercialTermsPage(doc, inputs, margin);
  addDisclaimerFooter(doc, pageWidth);

  return doc;
}

function drawCover(
  doc: jsPDF,
  inputs: PPATermSheetInputs,
  pageWidth: number,
  margin: number
) {
  const { estimate, termYears } = inputs;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 240, 'F');
  doc.setFillColor(COLORS.primaryFixed);
  doc.rect(pageWidth - 80, 0, 80, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('SolarCalc India — PPA Term Sheet', margin, 70);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(estimate.name, margin, 130, { maxWidth: pageWidth - margin * 2 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(
    `${formatPlantCapacityKW(estimate.targetCapacityKW)} · ${termYears}-year PPA`,
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

function addPartiesPage(
  doc: jsPDF,
  inputs: PPATermSheetInputs,
  pageWidth: number,
  margin: number
) {
  doc.addPage();
  let y = margin;

  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Parties & Project Summary', margin, y);
  y += 10;

  doc.setDrawColor(COLORS.outline);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  const lcoe = lcoeINRPerKWh(inputs.estimate);

  // KPI strip — base rate, term, IRR.
  const cellW = (pageWidth - margin * 2 - 24) / 3;
  const kpis = [
    { label: 'Year-1 PPA Tariff', value: `₹${inputs.result.baseRate.toFixed(2)} / kWh` },
    { label: 'Term', value: `${inputs.termYears} years` },
    {
      label: 'Equity IRR',
      value: Number.isFinite(inputs.result.achievedIRR)
        ? formatRate(inputs.result.achievedIRR)
        : '—',
    },
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

  const finance = inputs.estimate.finance;

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: [
      ['Seller (Generator)', inputs.sellerName ?? '—'],
      ['Buyer (Offtaker)', inputs.buyerName ?? '—'],
      ['Project capacity', formatPlantCapacityKW(inputs.estimate.targetCapacityKW)],
      ['Total CAPEX (incl. GST)', `₹ ${formatINR(inputs.estimate.totals.grandTotal)}`],
      ['Per kW rate', `₹ ${formatINR(inputs.estimate.totals.perKwRate)}`],
      ['Project lifespan', finance ? `${finance.basics.lifespanYears} years` : '—'],
      ['LCOE (reference)', `₹${lcoe.toFixed(2)} / kWh`],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
}

function addTariffSchedulePage(
  doc: jsPDF,
  inputs: PPATermSheetInputs,
  margin: number
) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Tariff Schedule', margin, margin);

  const body = inputs.result.schedule.map((rate, i) => [
    `Y${i + 1}`,
    `₹${rate.toFixed(3)} / kWh`,
  ]);
  autoTable(doc, {
    startY: margin + 18,
    head: [['Year', 'Tariff']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });
}

function addCommercialTermsPage(
  doc: jsPDF,
  inputs: PPATermSheetInputs,
  margin: number
) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Commercial Terms', margin, margin);

  const indexationLabel =
    inputs.indexation.kind === 'cpi'
      ? `CPI pass-through (${formatPercent(inputs.indexation.cpiFraction * 100)})`
      : 'None';

  const body: string[][] = [
    ['Year-1 base tariff', `₹${inputs.result.baseRate.toFixed(2)} / kWh`],
    ['Annual escalation', formatPercent(inputs.escalationPct)],
    ['Indexation', indexationLabel],
    ['Target equity IRR', formatRate(inputs.targetIRR)],
    ['Achieved equity IRR', formatRate(inputs.result.achievedIRR)],
    ['Solver converged', inputs.result.converged ? 'Yes' : 'Approximate'],
    ['Billing frequency', 'Monthly, against actual delivered kWh'],
    ['Deemed generation', 'Compensated where buyer-side curtailment'],
    ['Capacity floor', '70% of Year-1 generation forecast'],
    ['Force majeure', 'Standard CERC framework'],
    ['Payment security', 'Letter of Credit equal to 1 month invoice'],
    ['Connection point', 'Seller’s injection meter at substation'],
  ];

  autoTable(doc, {
    startY: margin + 18,
    head: [['Term', 'Value']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });

  if (inputs.notes && inputs.notes.trim().length > 0) {
    // @ts-expect-error jsPDF mutates
    const startY = doc.lastAutoTable.finalY + 20;
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Notes', margin, startY);
    doc.setTextColor(COLORS.textOnSurface);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(inputs.notes, margin, startY + 18, {
      maxWidth: doc.internal.pageSize.getWidth() - margin * 2,
    });
  }
}

function addDisclaimerFooter(doc: jsPDF, pageWidth: number) {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(COLORS.outline);
    doc.text(
      'Indicative term sheet for negotiation only — not a legal contract draft.',
      pageWidth / 2,
      h - 18,
      { align: 'center' }
    );
  }
}

export function downloadPPATermSheet(inputs: PPATermSheetInputs): void {
  const doc = buildPPATermSheet(inputs);
  doc.save(`${safeFileName(inputs.estimate.name)}_PPA_TermSheet.pdf`);
}
