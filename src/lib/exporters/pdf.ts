import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BOM_CATEGORY_LABELS,
  BOM_UOM_LABELS,
  type Estimate,
} from '@/types';
import {
  computeEstimate,
  type ComputedResults,
  type FinanceResults,
} from '@/lib/calc';
import { safeFileName } from '@/lib/filename';
import {
  formatINR,
  formatPercent,
  formatPlantCapacityKW,
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

export function buildPdf(estimate: Estimate, options: PdfOptions): jsPDF {
  const results = computeEstimate(estimate);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  drawCover(doc, estimate, pageWidth, margin);

  if (options.includeSummary) {
    addSummaryPage(doc, estimate, results, pageWidth, margin);
    addCapexPage(doc, results, margin);
    addBomPage(doc, estimate, margin);
    if (estimate.materialized.otherLines.length > 0) {
      addOtherScopePage(doc, estimate, margin);
    }
    if (results.finance?.yield) {
      addIrradiancePage(doc, estimate, results.finance, margin);
    }
  }

  if (options.includePnL && results.finance) {
    addPnLPage(doc, results.finance, margin);
  }

  if (options.includeMethodology) {
    addMethodologyPage(doc, margin);
  }

  return doc;
}

function drawCover(
  doc: jsPDF,
  estimate: Estimate,
  pageWidth: number,
  margin: number
) {
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
  doc.text(estimate.name, margin, 130, { maxWidth: pageWidth - margin * 2 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  const detail = estimate.finance?.enabled
    ? `${formatPlantCapacityKW(estimate.targetCapacityKW)} · ${estimate.finance.basics.lifespanYears} yr lifespan`
    : `${formatPlantCapacityKW(estimate.targetCapacityKW)} · estimate-only (no finance modeling)`;
  doc.text(detail, margin, 170);

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
  estimate: Estimate,
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
  const t = estimate.totals;
  const f = r.finance;
  const kpis = [
    { label: 'Grand Total', value: `₹ ${formatINR(t.grandTotal)}` },
    { label: 'Per kW Rate', value: `₹ ${formatINR(t.perKwRate)}` },
    {
      label: 'IRR',
      value: f && Number.isFinite(f.irr) ? formatRate(f.irr) : '—',
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

  // Estimate basics
  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: [
      ['Target capacity', formatPlantCapacityKW(estimate.targetCapacityKW)],
      ['Status', estimate.status],
      ['Template version (snapshot)', estimate.selectedVersion],
      ['Main BOM subtotal', `₹ ${formatINR(t.mainBomSubtotal)}`],
      ['Main BOM GST', `₹ ${formatINR(t.mainBomGst)}`],
      ['Other Scope subtotal', `₹ ${formatINR(t.otherScopeSubtotal)}`],
      ['Other Scope GST', `₹ ${formatINR(t.otherScopeGst)}`],
      ['Grand total', `₹ ${formatINR(t.grandTotal)}`],
      ['Per kW rate', `₹ ${formatINR(t.perKwRate)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error jsPDF mutates
  y = doc.lastAutoTable.finalY + 20;

  // Finance section, only if enabled
  if (f) {
    const basics = f.meta.basics;
    autoTable(doc, {
      startY: y,
      head: [['Finance & sustainability', 'Value']],
      body: [
        ['Lifespan', `${basics.lifespanYears} years`],
        ['Capacity Utilization Factor', formatPercent(basics.cufPct)],
        ['Inflation', formatPercent(basics.inflationPct)],
        ['Discount rate', formatPercent(basics.discountPct)],
        ['PPA rate', `₹${f.meta.revenue.ppaRate} / kWh`],
        ['PPA escalation', formatPercent(f.meta.revenue.ppaEscalationPct)],
        ['Year-1 O&M', `${f.meta.om.percentOfCapex}% of CAPEX`],
        ['Equity', `₹ ${formatINR(f.equity)}`],
        ['Loan amount', `₹ ${formatINR(f.loanAmount)}`],
        ['Interest rate', formatPercent(f.meta.financing.interestPct)],
        ['Loan term', `${f.meta.financing.termYears} years`],
        ['Grace period', `${f.meta.financing.gracePeriodYears} years`],
        ['NPV', `₹ ${formatINR(f.npv)}`],
        ['IRR', Number.isFinite(f.irr) ? formatRate(f.irr) : '—'],
        ['Payback', formatYears(f.paybackYears)],
        ['Annual CO₂ offset (Y1)', formatTonnes(f.co2.annualYear1)],
        ['Lifetime CO₂ offset', formatTonnes(f.co2.cumulative)],
        ['Break-even year', f.breakEvenYear === null ? '—' : `Y${f.breakEvenYear}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Finance modeling']],
      body: [
        [
          'Disabled. Enable on the estimate to compute IRR, NPV, payback, cashflows and yield.',
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
  }
}

function addCapexPage(doc: jsPDF, r: ComputedResults, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CAPEX Breakdown', margin, margin);

  const summaryBody: (string | number)[][] = [];
  for (const group of Object.values(r.capex.byCategory)) {
    summaryBody.push([
      group.label,
      `₹ ${formatINR(group.subtotal)}`,
      `₹ ${formatINR(group.tax)}`,
      `₹ ${formatINR(group.total)}`,
    ]);
  }
  summaryBody.push([
    'Total',
    `₹ ${formatINR(r.capex.subtotal)}`,
    `₹ ${formatINR(r.capex.tax)}`,
    `₹ ${formatINR(r.capex.total)}`,
  ]);
  autoTable(doc, {
    startY: margin + 18,
    head: [['Category', 'Subtotal', 'GST', 'Total']],
    body: summaryBody,
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

function addBomPage(doc: jsPDF, estimate: Estimate, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Main BOM Detail', margin, margin);

  const body = estimate.materialized.mainLines.map((line) => [
    BOM_CATEGORY_LABELS[line.category] ?? line.category,
    line.itemName,
    BOM_UOM_LABELS[line.uom] ?? line.uom,
    Number(line.quantity.toFixed(2)).toString(),
    `₹ ${formatINR(line.rate)}`,
    `${line.gstPercent}%`,
    `₹ ${formatINR(line.total)}`,
    line.included ? '' : line.applicabilityFiltered ? 'sync gated' : 'excluded',
  ]);

  autoTable(doc, {
    startY: margin + 18,
    head: [['Category', 'Item', 'UoM', 'Qty', 'Rate', 'GST', 'Total', 'Status']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
}

function addOtherScopePage(doc: jsPDF, estimate: Estimate, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Other Scope of Works', margin, margin);

  const body = estimate.materialized.otherLines.map((line) => [
    line.scopeName,
    `₹ ${formatINR(line.amount)}`,
    `${line.gstPercent}%`,
    `₹ ${formatINR(line.total)}`,
    line.included ? '' : line.applicabilityFiltered ? 'sync gated' : 'excluded',
  ]);

  autoTable(doc, {
    startY: margin + 18,
    head: [['Scope item', 'Amount', 'GST', 'Total', 'Status']],
    body,
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
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
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function addIrradiancePage(
  doc: jsPDF,
  estimate: Estimate,
  f: FinanceResults,
  margin: number
) {
  if (!f.yield || !estimate.location) return;
  const y = f.yield;

  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Site Irradiance & Yield', margin, margin);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.textOnSurfaceVariant);
  doc.text(
    `${estimate.location.label ?? 'Pinned site'} · ${estimate.location.lat.toFixed(3)}, ${estimate.location.lng.toFixed(3)} · tilt ${estimate.location.tiltDeg}° · azimuth ${estimate.location.azimuthDeg}°`,
    margin,
    margin + 18
  );

  // Headline KPIs
  autoTable(doc, {
    startY: margin + 36,
    head: [['Metric', 'Value', 'Note']],
    body: [
      [
        'Annual GHI',
        `${y.monthlyGHI.reduce((s, v, m) => s + v * MONTH_DAYS[m], 0).toFixed(0)} kWh/m²`,
        'Horizontal at site',
      ],
      ['Annual POA', `${y.annualPOA.toFixed(0)} kWh/m²`, 'Tilted plane'],
      ['Specific yield', `${y.annualSpecificYield.toFixed(0)} kWh/kWp/yr`, 'AC at meter'],
      ['Implied CUF', `${y.impliedCufPct.toFixed(1)}%`, 'After all losses'],
      [
        'Monsoon CV',
        `±${y.monsoonUncertainty.cvPct.toFixed(1)}%`,
        'Jun–Sep inter-annual',
      ],
      [
        'Snap distance',
        `${y.snapDistanceKm.toFixed(0)} km`,
        estimate.location.label ?? '',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });

  // Monthly table
  // @ts-expect-error jsPDF mutates
  const startY = doc.lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY,
    head: [
      [
        'Month',
        'GHI (kWh/m²/d)',
        'POA (kWh/m²/d)',
        'AC (kWh/kWp/mo)',
        'Stdev',
      ],
    ],
    body: MONTHS_SHORT.map((m, i) => [
      m,
      y.monthlyGHI[i].toFixed(2),
      y.monthlyPOA[i].toFixed(2),
      y.monthlyACkWhPerKWp[i].toFixed(0),
      `±${(y.monsoonUncertainty.months.includes(i) ? y.monsoonUncertainty.cvPct : 0).toFixed(1)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });

  // Loss waterfall
  // @ts-expect-error jsPDF mutates
  const wfY = doc.lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY: wfY,
    head: [['Stage', 'kWh/kWp/yr', 'Δ', 'Δ %']],
    body: y.lossWaterfall.map((s) => [
      s.label,
      s.kWhPerKWpYr.toFixed(0),
      s.deltaKWhPerKWpYr.toFixed(0),
      `${s.deltaPct.toFixed(1)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: COLORS.surfaceTint, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });

  // Provenance + disclaimer block
  // @ts-expect-error jsPDF mutates
  let footY = doc.lastAutoTable.finalY + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text('Source', margin, footY);
  footY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textOnSurfaceVariant);
  doc.text(
    `${y.provenance.dataset} · ${y.provenance.resolution_km} km · ${y.provenance.years[0]}–${y.provenance.years[1]} · retrieved ${y.provenance.retrieved_at}`,
    margin,
    footY,
    { maxWidth: 520 }
  );
  footY += 24;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary);
  doc.text('Disclaimer', margin, footY);
  footY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textOnSurfaceVariant);
  doc.text(
    'Indicative sizing only. Suitable for early feasibility and vendor proposal sanity checks, not for project finance, lender due diligence, or bankable resource reports.',
    margin,
    footY,
    { maxWidth: 520 }
  );

  if (estimate.location.urbanShading) {
    footY += 24;
    doc.setTextColor('#ba1a1a');
    doc.setFont('helvetica', 'bold');
    doc.text('Urban shading flagged', margin, footY);
    footY += 14;
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Surrounding obstructions can shave 5–15% off the simulated yield. Consider a measured shading profile before committing to the numbers above.',
      margin,
      footY,
      { maxWidth: 520 }
    );
  }
}

function addPnLPage(doc: jsPDF, f: FinanceResults, margin: number) {
  doc.addPage();
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Year-by-Year P&L', margin, margin);

  autoTable(doc, {
    startY: margin + 18,
    head: [['Yr', 'Revenue', 'O&M', 'Loan pmt', 'Net CF', 'Cumulative']],
    body: f.pnl.map((row) => [
      `Y${row.year}`,
      `₹ ${formatINR(row.revenue)}`,
      `₹ ${formatINR(row.om)}`,
      row.loanPayment > 0 ? `₹ ${formatINR(row.loanPayment)}` : '—',
      `₹ ${formatINR(row.netCashFlow)}`,
      `₹ ${formatINR(row.cumulativeCashFlow)}`,
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
    [
      'BOM scaling',
      'Each BOM line uses one of five scaling types (fixed / linear / step / conditional / optional) plus an optional safe-DSL formula.',
    ],
    ['Per-line subtotal', 'quantity × rate'],
    ['Per-line GST', 'subtotal × gstPercent / 100'],
    ['Per-line total', 'subtotal + GST'],
    [
      'Grand total',
      'Σ Main BOM total + Σ Other Scope total (excludes user-deselected and sync-gated lines)',
    ],
    ['Per kW rate', 'Grand total / target capacity (kW)'],
    [],
    ['Finance (when enabled)'],
    ['Annual energy', 'Plant kW × CUF × 8,760 hours, or POA × PR when a location is pinned'],
    ['Degradation', 'Output_n = Annual × (1 - degradation)^(n-1)'],
    ['Revenue', 'Output_n × PPA × (1 + escalation)^(n-1)'],
    ['O&M', 'Base × (1 + inflation)^(n-1), with year-level overrides'],
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

export function downloadPdf(estimate: Estimate, options: PdfOptions): void {
  const doc = buildPdf(estimate, options);
  doc.save(`${safeFileName(estimate.name)}.pdf`);
}
