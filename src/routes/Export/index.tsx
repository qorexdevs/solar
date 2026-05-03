import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PillTab } from '@/components/ui/PillTab';
import { computeEstimate } from '@/lib/calc';
import { downloadExcel, downloadPdf } from '@/lib/exporters';
import { formatINR, formatPlantCapacityKW, formatRate, formatTonnes, formatYears } from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import { PROJECT_TYPE_LABELS } from '@/types';
import { PPAPanel } from './ppa/PPAPanel';
import { PreviewRow } from './PreviewRow';
import { ToggleRow } from './ToggleRow';

type Format = 'pdf' | 'excel';

type ExportPanelTab = 'reports' | 'ppa';

function parseExportTab(raw: string | null): ExportPanelTab {
  if (raw === 'ppa') return 'ppa';
  return 'reports';
}

export function Export() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const exportTab = parseExportTab(searchParams.get('tab'));

  const estimates = useEstimateStore((s) => s.estimates);
  const setRecent = useEstimateStore((s) => s.setRecent);
  const templates = useTemplateStore((s) => s.templates);

  const [selectedId, setSelectedId] = useState<string | undefined>(id);

  useEffect(() => {
    setSelectedId(id);
  }, [id]);

  const [format, setFormat] = useState<Format>('pdf');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includePnL, setIncludePnL] = useState(true);
  const [includeMethodology, setIncludeMethodology] = useState(false);

  const estimate = estimates.find((e) => e.id === selectedId);
  const results = useMemo(
    () => (estimate ? computeEstimate(estimate) : null),
    [estimate]
  );
  const finance = results?.finance;

  function pickEstimate(nextId: string) {
    setSelectedId(nextId);
    navigate(`/estimates/${nextId}/export?tab=${exportTab}`, { replace: true });
  }

  function setExportTab(tab: ExportPanelTab) {
    setSearchParams({ tab }, { replace: true });
  }

  function onDownload() {
    if (!estimate) return;
    setRecent(estimate.id);
    if (format === 'pdf') {
      downloadPdf(estimate, {
        includeSummary,
        includePnL,
        includeMethodology,
      });
    } else {
      downloadExcel(estimate, {
        includeInputs: includeSummary,
        includePnL,
        includeMethodology,
      });
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-xl text-headline-xl text-on-background">
          Export
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Download PDF or Excel reports, or generate a finance-backed PPA term
          sheet. P&amp;L and irradiance pages only appear when the estimate has
          finance modeling enabled.
        </p>
      </div>

      <div className="flex bg-surface-container-low p-xs rounded-lg border border-outline-variant/50 gap-0">
        <PillTab
          active={exportTab === 'reports'}
          icon="ios_share"
          label="Reports"
          onClick={() => setExportTab('reports')}
        />
        <PillTab
          active={exportTab === 'ppa'}
          icon="description"
          label="PPA Term Sheet"
          onClick={() => setExportTab('ppa')}
        />
      </div>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-card">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
          Select Estimate
        </h2>
        {estimates.length === 0 ? (
          <p className="text-on-surface-variant">
            You don&apos;t have any estimates yet.{' '}
            <Link className="text-primary underline" to="/estimates/new">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {estimates.map((e) => {
              const t = templates.find((tt) => tt.id === e.templateId);
              const isSelected = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => pickEstimate(e.id)}
                  className={`text-left rounded-xl p-md flex items-start gap-sm border transition-all ${
                    isSelected
                      ? 'border-2 border-primary bg-primary-fixed/20'
                      : 'border-outline-variant bg-surface hover:border-outline'
                  }`}
                >
                  <Icon
                    name={isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    filled={isSelected}
                    className={
                      isSelected ? 'text-primary mt-1' : 'text-outline-variant mt-1'
                    }
                  />
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="font-data-display text-[18px] leading-[24px] font-semibold text-on-surface truncate">
                      {e.name}
                    </span>
                    <span className="font-body-md text-[14px] leading-[20px] text-on-surface-variant">
                      {t ? PROJECT_TYPE_LABELS[t.projectType] : 'Template missing'} ·{' '}
                      {formatPlantCapacityKW(e.targetCapacityKW)}
                      {e.finance?.enabled ? ' · finance on' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {exportTab === 'reports' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-start">
          <div className="md:col-span-8 flex flex-col gap-md">
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-card">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
                Format &amp; Details
              </h2>
              <div className="flex bg-surface-container-low p-xs rounded-lg mb-md border border-outline-variant/50">
                <PillTab
                  active={format === 'pdf'}
                  icon="picture_as_pdf"
                  label="PDF Report"
                  onClick={() => setFormat('pdf')}
                />
                <PillTab
                  active={format === 'excel'}
                  icon="table_view"
                  label="Excel Data"
                  onClick={() => setFormat('excel')}
                />
              </div>

              <div className="flex flex-col gap-md">
                <ToggleRow
                  title={
                    format === 'pdf'
                      ? 'Executive Summary + BOM Detail'
                      : 'Inputs, CAPEX & BOM'
                  }
                  description={
                    format === 'pdf'
                      ? 'High-level totals, BOM line items, and Other Scope.'
                      : 'Worksheets for inputs, CAPEX, the full materialized BOM and Other Scope.'
                  }
                  checked={includeSummary}
                  onChange={setIncludeSummary}
                />
                <ToggleRow
                  title="Detailed P&L Table"
                  description={
                    finance
                      ? 'Year-by-year revenue, O&M, loan, net + cumulative cash flow.'
                      : 'Requires finance to be enabled on this estimate.'
                  }
                  checked={includePnL && !!finance}
                  onChange={(v) => setIncludePnL(v && !!finance)}
                />
                <ToggleRow
                  title="Methodology & Assumptions"
                  description="BOM scaling rules, formula reference, escalation rates, CO₂ factor."
                  checked={includeMethodology}
                  onChange={setIncludeMethodology}
                />
              </div>
            </section>
          </div>

          <aside className="md:col-span-4 md:sticky md:top-24 flex flex-col gap-md">
            <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-card-xl">
              <div className="h-32 w-full bg-primary relative">
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 to-transparent flex items-end p-md">
                  <span className="font-headline-lg text-[20px] leading-[26px] text-on-primary font-semibold truncate">
                    {estimate
                      ? `${estimate.name}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
                      : 'Pick an estimate'}
                  </span>
                </div>
              </div>
              <div className="p-md flex flex-col gap-sm bg-surface-container-lowest">
                {estimate && results ? (
                  <>
                    <PreviewRow
                      label="Format"
                      value={format === 'pdf' ? 'PDF' : 'Excel (.xlsx)'}
                    />
                    <PreviewRow
                      label="Sections"
                      value={describeSections(
                        format,
                        includeSummary,
                        includePnL && !!finance,
                        includeMethodology
                      )}
                    />
                    <PreviewRow
                      label="Grand total"
                      value={`₹ ${formatINR(estimate.totals.grandTotal)}`}
                    />
                    <PreviewRow
                      label="Per kW"
                      value={`₹ ${formatINR(estimate.totals.perKwRate)}`}
                    />
                    {finance ? (
                      <>
                        <PreviewRow
                          label="IRR"
                          value={
                            Number.isFinite(finance.irr)
                              ? formatRate(finance.irr)
                              : '—'
                          }
                        />
                        <PreviewRow
                          label="NPV"
                          value={`₹ ${formatINR(finance.npv)}`}
                        />
                        <PreviewRow
                          label="Payback"
                          value={formatYears(finance.paybackYears)}
                        />
                        <PreviewRow
                          label="CO₂ (lifetime)"
                          value={formatTonnes(finance.co2.cumulative)}
                        />
                      </>
                    ) : (
                      <p className="text-label-sm text-on-surface-variant">
                        Finance modeling is off — IRR / NPV / payback omitted.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-on-surface-variant">
                    Select an estimate to preview the report.
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={onDownload}
              disabled={!estimate}
              iconLeft={<Icon name="download" />}
              fullWidth
            >
              Download {format === 'pdf' ? 'PDF' : 'Excel'}
            </Button>

            <Button
              variant="ghost"
              onClick={() =>
                estimate ? navigate(`/estimates/${estimate.id}`) : navigate('/')
              }
              iconLeft={<Icon name="arrow_back" />}
            >
              Back
            </Button>
          </aside>
        </div>
      ) : (
        <PPAPanel estimate={estimate} />
      )}
    </div>
  );
}

function describeSections(
  format: Format,
  summary: boolean,
  pnl: boolean,
  methodology: boolean
): string {
  const parts: string[] = [format === 'pdf' ? 'Cover' : 'Summary'];
  if (summary) parts.push(format === 'pdf' ? 'Summary + BOM' : 'Inputs + CAPEX + BOM');
  if (pnl) parts.push('P&L + Loan');
  if (methodology) parts.push('Methodology');
  return parts.join(', ');
}
