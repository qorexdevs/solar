import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { computeScenario } from '@/lib/calc';
import { downloadExcel, downloadPdf } from '@/lib/exporters';
import { formatINR, formatRate, formatTonnes, formatYears } from '@/lib/format';
import { useScenarioStore } from '@/store/scenarios';
import { PROJECT_TYPE_LABELS } from '@/types';
import { FormatTab } from './FormatTab';
import { PreviewRow } from './PreviewRow';
import { ToggleRow } from './ToggleRow';

type Format = 'pdf' | 'excel';

export function Export() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scenarios = useScenarioStore((s) => s.scenarios);
  const setRecent = useScenarioStore((s) => s.setRecent);

  const [selectedId, setSelectedId] = useState<string | undefined>(id);
  const [format, setFormat] = useState<Format>('pdf');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includePnL, setIncludePnL] = useState(true);
  const [includeMethodology, setIncludeMethodology] = useState(false);

  const scenario = scenarios.find((s) => s.id === selectedId);
  const results = useMemo(
    () => (scenario ? computeScenario(scenario) : null),
    [scenario]
  );

  function onDownload() {
    if (!scenario) return;
    setRecent(scenario.id);
    if (format === 'pdf') {
      downloadPdf(scenario, {
        includeSummary,
        includePnL,
        includeMethodology,
      });
    } else {
      downloadExcel(scenario, {
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
          Configure Export
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Pick a scenario, choose the format, and toggle the sections to include.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-start">
        <div className="md:col-span-8 flex flex-col gap-md">
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-card">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
              Select Scenario
            </h2>
            {scenarios.length === 0 ? (
              <p className="text-on-surface-variant">
                You don't have any scenarios yet.{' '}
                <Link className="text-primary underline" to="/scenarios/new">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                {scenarios.map((s) => {
                  const isSelected = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
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
                          {s.name}
                        </span>
                        <span className="font-body-md text-[14px] leading-[20px] text-on-surface-variant">
                          {PROJECT_TYPE_LABELS[s.projectType]} · {s.basics.sizeMW} MW
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-card">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
              Format &amp; Details
            </h2>
            <div className="flex bg-surface-container-low p-xs rounded-lg mb-md border border-outline-variant/50">
              <FormatTab
                active={format === 'pdf'}
                icon="picture_as_pdf"
                label="PDF Report"
                onClick={() => setFormat('pdf')}
              />
              <FormatTab
                active={format === 'excel'}
                icon="table_view"
                label="Excel Data"
                onClick={() => setFormat('excel')}
              />
            </div>

            <div className="flex flex-col gap-md">
              <ToggleRow
                title={format === 'pdf' ? 'Executive Summary' : 'Inputs & CAPEX'}
                description={
                  format === 'pdf'
                    ? 'High-level financial metrics and the inputs table.'
                    : 'Worksheets for inputs, CAPEX line items, and a summary.'
                }
                checked={includeSummary}
                onChange={setIncludeSummary}
              />
              <ToggleRow
                title="Detailed P&L Table"
                description="Year-by-year revenue, O&M, loan, net + cumulative cash flow."
                checked={includePnL}
                onChange={setIncludePnL}
              />
              <ToggleRow
                title="Methodology & Assumptions"
                description="Formula reference, escalation rates, and CO₂ factor."
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
                  {scenario
                    ? `${scenario.name}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
                    : 'Pick a scenario'}
                </span>
              </div>
            </div>
            <div className="p-md flex flex-col gap-sm bg-surface-container-lowest">
              {results && scenario ? (
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
                      includePnL,
                      includeMethodology
                    )}
                  />
                  <PreviewRow
                    label="IRR"
                    value={Number.isFinite(results.irr) ? formatRate(results.irr) : '—'}
                  />
                  <PreviewRow label="NPV" value={formatINR(results.npv)} />
                  <PreviewRow label="Payback" value={formatYears(results.paybackYears)} />
                  <PreviewRow
                    label="CO₂ (lifetime)"
                    value={formatTonnes(results.co2.cumulative)}
                  />
                </>
              ) : (
                <p className="text-on-surface-variant">
                  Select a scenario to preview the report.
                </p>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onDownload}
            disabled={!scenario}
            iconLeft={<Icon name="download" />}
            fullWidth
          >
            Download {format === 'pdf' ? 'PDF' : 'Excel'}
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              scenario ? navigate(`/scenarios/${scenario.id}`) : navigate('/')
            }
            iconLeft={<Icon name="arrow_back" />}
          >
            Back
          </Button>
        </aside>
      </div>
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
  if (summary) parts.push(format === 'pdf' ? 'Summary' : 'Inputs + CAPEX');
  if (pnl) parts.push('P&L + Loan');
  if (methodology) parts.push('Methodology');
  return parts.join(', ');
}
