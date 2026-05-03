import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { KpiCard } from '@/components/ui/KpiCard';
import { Slider } from '@/components/ui/Slider';
import { type Indexation, lcoeINRPerKWh, solvePPARate } from '@/lib/calc';
import { downloadPPATermSheet } from '@/lib/exporters';
import { formatINR, formatPercent, formatPlantCapacityKW, formatRate } from '@/lib/format';
import { useTemplateStore } from '@/store/templates';
import { PROJECT_TYPE_LABELS, type Estimate } from '@/types';
import { SensitivityGrid } from './SensitivityGrid';
import { TariffTable } from './TariffTable';

const TERM_OPTIONS: number[] = [15, 20, 25];

type Props = {
  estimate?: Estimate;
};

/**
 * PPA solver + term sheet export. Estimate is chosen by the parent Export page.
 */
export function PPAPanel({ estimate }: Props) {
  const templates = useTemplateStore((s) => s.templates);
  const template = estimate
    ? templates.find((t) => t.id === estimate.templateId)
    : undefined;

  const [termYears, setTermYears] = useState<number>(25);
  const [escalationPct, setEscalationPct] = useState<number>(2.0);
  const [indexationKind, setIndexationKind] = useState<'none' | 'cpi'>('none');
  const [cpiFraction, setCpiFraction] = useState<number>(0.5);
  const [targetIRRPct, setTargetIRRPct] = useState<number>(15);

  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setBuyerName('');
    setSellerName('');
    setNotes('');
  }, [estimate?.id]);

  const indexation: Indexation = useMemo(
    () =>
      indexationKind === 'cpi'
        ? { kind: 'cpi', cpiFraction }
        : { kind: 'none' },
    [indexationKind, cpiFraction]
  );

  const result = useMemo(() => {
    if (!estimate) return null;
    return solvePPARate({
      estimate,
      termYears,
      escalationPct,
      indexation,
      targetIRR: targetIRRPct / 100,
    });
  }, [estimate, termYears, escalationPct, indexation, targetIRRPct]);

  const lcoe = useMemo(
    () => (estimate ? lcoeINRPerKWh(estimate) : null),
    [estimate]
  );

  const inflationPct = estimate?.finance?.basics.inflationPct ?? 0;

  if (!estimate) return null;

  return (
    <div className="space-y-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">
            PPA Term Sheet Generator
          </p>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Solve for a tariff that hits your target IRR
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Set the term &amp; escalation; the solver finds the year-1 PPA rate that
            drives equity IRR to your target.
          </p>
        </div>
        <div className="flex gap-sm shrink-0">
          <Button
            variant="primary"
            iconLeft={<Icon name="picture_as_pdf" />}
            disabled={!result || !estimate.finance?.enabled}
            onClick={() => {
              if (!estimate || !result) return;
              downloadPPATermSheet({
                estimate,
                result,
                termYears,
                escalationPct,
                indexation,
                targetIRR: targetIRRPct / 100,
                buyerName: buyerName || undefined,
                sellerName: sellerName || undefined,
                notes: notes || undefined,
              });
            }}
          >
            Export Term Sheet
          </Button>
        </div>
      </div>

      {estimate.finance?.enabled && result ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <KpiCard
              accent="primary"
              icon="payments"
              label="Year-1 PPA Tariff"
              value={`₹${result.baseRate.toFixed(2)}`}
              hint={`per kWh, escalates ${formatPercent(escalationPct)} / yr`}
            />
            <KpiCard
              accent="tertiary"
              icon="trending_up"
              label={`Achieved Equity IRR`}
              value={
                Number.isFinite(result.achievedIRR) ? formatRate(result.achievedIRR) : '—'
              }
              hint={
                result.converged
                  ? `Target ${formatPercent(targetIRRPct)} · converged`
                  : `Target ${formatPercent(targetIRRPct)} · approximate`
              }
            />
            <KpiCard
              accent="secondary"
              icon="straighten"
              label="LCOE (reference)"
              value={lcoe !== null ? `₹${lcoe.toFixed(2)}` : '—'}
              hint="Levelized cost — the floor below which the project loses money."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md items-start">
            <section className="bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col gap-md">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Contract Parameters
              </h3>

              <TermPicker value={termYears} onChange={setTermYears} />

              <Slider
                label="Annual escalation"
                value={escalationPct}
                onChange={setEscalationPct}
                min={0}
                max={5}
                step={0.1}
                variant="percent"
                hint="Compounds on the year-1 base rate."
              />

              <Slider
                label="Target equity IRR"
                value={targetIRRPct}
                onChange={setTargetIRRPct}
                min={5}
                max={25}
                step={0.5}
                variant="percent"
              />

              <IndexationControls
                kind={indexationKind}
                cpiFraction={cpiFraction}
                onKindChange={setIndexationKind}
                onCpiFractionChange={setCpiFraction}
                inflationPct={inflationPct}
              />
            </section>

            <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
              <div className="flex items-center justify-between mb-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Tariff Schedule
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {result.schedule.length} years
                </span>
              </div>
              <TariffTable schedule={result.schedule} />
            </section>
          </div>

          <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
            <div className="flex items-center justify-between mb-sm">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Sensitivity: Term × Escalation
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Year-1 ₹/kWh required to hit a {formatPercent(targetIRRPct)}{' '}
                  target IRR.
                </p>
              </div>
            </div>
            <SensitivityGrid
              estimate={estimate}
              indexation={indexation}
              targetIRR={targetIRRPct / 100}
            />
          </section>

          <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-sm">
              Counterparties &amp; Notes
            </h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
              Optional — appears verbatim on the exported term sheet.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <TextField
                label="Seller (Generator)"
                value={sellerName}
                onChange={setSellerName}
                placeholder="e.g. Sunrise Power Pvt. Ltd."
              />
              <TextField
                label="Buyer (Offtaker)"
                value={buyerName}
                onChange={setBuyerName}
                placeholder="e.g. Acme Industrials Ltd."
              />
            </div>
            <div className="mt-md">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md focus:outline-none focus:border-primary"
                placeholder="Special clauses, conditions precedent, or footnotes."
              />
            </div>
          </section>

          <ProjectSummary
            estimate={estimate}
            templateName={template?.name}
            projectTypeLabel={
              template ? PROJECT_TYPE_LABELS[template.projectType] : '—'
            }
          />
        </>
      ) : (
        <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
          <div className="flex items-start gap-sm">
            <Icon name="account_balance" className="text-tertiary text-[24px] shrink-0" />
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-semibold">{estimate.name}</span> doesn&apos;t
              have a finance layer enabled. Open the estimate and toggle finance
              modeling on to use the PPA solver.
            </p>
          </div>
          <Link
            className="px-md py-sm rounded-lg bg-primary text-on-primary font-label-sm hover:bg-primary-container"
            to={`/estimates/${estimate.id}/edit`}
          >
            Open estimate
          </Link>
        </div>
      )}
    </div>
  );
}

function TermPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
        Term length
      </span>
      <div className="inline-flex flex-wrap gap-2">
        {TERM_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`px-3 h-9 rounded-full font-label-sm text-label-sm border transition-colors ${
              t === value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-variant'
            }`}
          >
            {t} years
          </button>
        ))}
      </div>
    </div>
  );
}

function IndexationControls({
  kind,
  cpiFraction,
  onKindChange,
  onCpiFractionChange,
  inflationPct,
}: {
  kind: 'none' | 'cpi';
  cpiFraction: number;
  onKindChange: (k: 'none' | 'cpi') => void;
  onCpiFractionChange: (n: number) => void;
  inflationPct: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
        Inflation indexation
      </span>
      <div className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => onKindChange('none')}
          className={`px-3 h-9 rounded-full font-label-sm text-label-sm border transition-colors ${
            kind === 'none'
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-variant'
          }`}
        >
          None
        </button>
        <button
          type="button"
          onClick={() => onKindChange('cpi')}
          className={`px-3 h-9 rounded-full font-label-sm text-label-sm border transition-colors ${
            kind === 'cpi'
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-variant'
          }`}
        >
          CPI pass-through
        </button>
      </div>
      {kind === 'cpi' && (
        <Slider
          label="CPI fraction passed through"
          value={cpiFraction}
          onChange={onCpiFractionChange}
          min={0}
          max={1}
          step={0.05}
          formatValue={(n) =>
            `${(n * 100).toFixed(0)}% of ${formatPercent(inflationPct)}`
          }
        />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md focus:outline-none focus:border-primary"
      />
    </label>
  );
}

function ProjectSummary({
  estimate,
  templateName,
  projectTypeLabel,
}: {
  estimate: Estimate;
  templateName?: string;
  projectTypeLabel: string;
}) {
  const finance = estimate.finance;
  return (
    <section className="bg-surface-container-low rounded-xl p-md border border-outline-variant/30">
      <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-2">
        Project Snapshot
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm font-body-md text-on-surface-variant">
        <Snippet label="Type" value={projectTypeLabel} />
        <Snippet
          label="Capacity"
          value={formatPlantCapacityKW(estimate.targetCapacityKW)}
        />
        <Snippet label="Template" value={templateName ?? '—'} />
        <Snippet
          label="Grand total"
          value={`₹ ${formatINR(estimate.totals.grandTotal)}`}
        />
        {finance && (
          <>
            <Snippet label="CUF" value={formatPercent(finance.basics.cufPct)} />
            <Snippet
              label="Lifespan"
              value={`${finance.basics.lifespanYears} yrs`}
            />
            <Snippet
              label="Discount"
              value={formatPercent(finance.basics.discountPct)}
            />
            <Snippet
              label="Per kW"
              value={`₹ ${formatINR(estimate.totals.perKwRate)}`}
            />
          </>
        )}
      </div>
    </section>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-outline">{label}</span>
      <span className="text-on-surface font-semibold">{value}</span>
    </div>
  );
}
