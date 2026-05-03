import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CostDonut } from '@/components/charts/CostDonut';
import { YearlyBarChart } from '@/components/charts/YearlyBarChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { KpiCard } from '@/components/ui/KpiCard';
import { Switch } from '@/components/ui/Switch';
import { computeEstimate, type FinanceResults } from '@/lib/calc';
import {
  formatINR,
  formatKWh,
  formatPercent,
  formatPlantCapacityKW,
  formatRate,
  formatYears,
} from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPE_LABELS,
  type Estimate,
} from '@/types';
import { Co2Card } from './Co2Card';
import { InlineSlider } from './InlineSlider';
import { IrradianceSection } from './IrradianceSection';
import { PnLTable } from './PnLTable';
import { ResetButton } from './ResetButton';
import { Stat } from './Stat';
import { usePrepaymentMax } from './usePrepaymentMax';

const SLIDER_STEP = 100;

export function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const estimate = useEstimateStore((s) =>
    s.estimates.find((e) => e.id === id)
  );
  const setRecent = useEstimateStore((s) => s.setRecent);
  const enableFinance = useEstimateStore((s) => s.enableFinance);
  const template = useTemplateStore((s) =>
    estimate ? s.templates.find((t) => t.id === estimate.templateId) : undefined
  );

  const [equityPctOverride, setEquityPctOverride] = useState<number | null>(null);
  const [extraPrepayment, setExtraPrepayment] = useState<number>(0);
  const [autoAbsorb, setAutoAbsorb] = useState<boolean>(false);

  useEffect(() => {
    if (id && estimate) setRecent(id);
  }, [id, estimate, setRecent]);

  useEffect(() => {
    setEquityPctOverride(null);
    setExtraPrepayment(0);
    setAutoAbsorb(false);
  }, [id]);

  const baseResults = useMemo(
    () => (estimate ? computeEstimate(estimate) : null),
    [estimate]
  );

  const baseEquityPct = useMemo(() => {
    if (!estimate || !baseResults || !baseResults.finance) return 100;
    if (baseResults.capex.total === 0) return 100;
    return ((baseResults.capex.total - baseResults.finance.loanAmount) / baseResults.capex.total) * 100;
  }, [estimate, baseResults]);

  const equityPct = equityPctOverride ?? baseEquityPct;

  const baseline = useMemo(
    () =>
      estimate
        ? computeEstimate(estimate, {
            financedPctOverride:
              equityPctOverride !== null ? 100 - equityPctOverride : undefined,
          })
        : null,
    [estimate, equityPctOverride]
  );

  const maxMonthlyPrepayment = usePrepaymentMax(estimate, equityPctOverride);
  const sliderMax = Math.max(
    0,
    Math.floor(maxMonthlyPrepayment / SLIDER_STEP) * SLIDER_STEP
  );
  const clampedMonthly = Math.max(0, Math.min(extraPrepayment, sliderMax));
  const extraAnnualFromMonthly = clampedMonthly * 12;

  useEffect(() => {
    if (extraPrepayment > sliderMax) {
      setExtraPrepayment(sliderMax);
    }
  }, [sliderMax, extraPrepayment]);

  const results = useMemo(
    () =>
      estimate
        ? computeEstimate(estimate, {
            financedPctOverride:
              equityPctOverride !== null ? 100 - equityPctOverride : undefined,
            extraAnnualPrincipal:
              !autoAbsorb && extraAnnualFromMonthly > 0
                ? extraAnnualFromMonthly
                : undefined,
            autoAbsorbSurplus: autoAbsorb || undefined,
          })
        : null,
    [estimate, equityPctOverride, extraAnnualFromMonthly, autoAbsorb]
  );

  if (!estimate || !results || !baseline) {
    return (
      <div className="p-md text-on-surface-variant">
        Estimate not found.{' '}
        <Link to="/" className="text-primary underline">
          Back to estimates
        </Link>
      </div>
    );
  }

  const finance = results.finance;
  const baselineFinance = baseline.finance;

  const baselineInterest = baselineFinance
    ? baselineFinance.loan.reduce((s, r) => s + r.interest, 0)
    : 0;
  const currentInterest = finance ? finance.loan.reduce((s, r) => s + r.interest, 0) : 0;
  const baselineTotalLoanPaid = baselineFinance
    ? baselineFinance.loan.reduce((s, r) => s + r.payment, 0)
    : 0;
  const currentTotalLoanPaid = finance
    ? finance.loan.reduce((s, r) => s + r.payment, 0)
    : 0;

  const retireYear = finance
    ? (() => {
        for (const r of finance.loan) {
          if (r.principal > 0 && r.balance <= 1e-6) return r.year;
        }
        return null;
      })()
    : null;
  const baselineRetireYear =
    baselineFinance
      ? (() => {
          for (const r of baselineFinance.loan) {
            if (r.principal > 0 && r.balance <= 1e-6) return r.year;
          }
          return baselineFinance.meta.financing.termYears;
        })()
      : 0;
  const currentYearsToRetire =
    retireYear !== null
      ? retireYear
      : finance
        ? finance.meta.financing.termYears
        : 0;

  const annualEMI = finance
    ? (() => {
        for (const r of finance.loan) {
          if (r.principal > 0 && r.payment > 0) return r.payment;
        }
        return 0;
      })()
    : 0;

  const cashflowChartData = finance
    ? finance.cumulativeCF.map((v, i) => ({
        year: i + 1,
        cumulative: v,
        netPosition: v + (finance.loanAmount - finance.loan[i].balance),
      }))
    : [];
  const showNetPosition = (finance?.loanAmount ?? 0) > 0;

  const yearlyBarData = finance
    ? finance.cashflows.map((v, i) => ({
        year: i + 1,
        net: v,
      }))
    : [];

  const donutSlices = Object.values(results.capex.byCategory)
    .filter((g) => g.total > 0)
    .map((g) => ({
      id: g.category,
      name: g.label,
      value: g.total,
    }));

  const irrLabel =
    finance && Number.isFinite(finance.irr) ? formatRate(finance.irr) : '—';
  const feasibilityHint = (() => {
    if (!finance || !Number.isFinite(finance.irr)) return 'Finance modeling off';
    if (finance.irr >= 0.15) return 'Excellent feasibility';
    if (finance.irr >= 0.1) return 'Good feasibility';
    if (finance.irr >= 0.05) return 'Marginal feasibility';
    return 'Poor feasibility';
  })();

  const fundingModified = equityPctOverride !== null;
  const prepayModified = clampedMonthly > 0 || autoAbsorb;
  const isWhatIfActive = fundingModified || prepayModified;

  return (
    <div className="space-y-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">
            Estimate
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {estimate.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-1 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              {template
                ? PROJECT_TYPE_LABELS[template.projectType]
                : 'Template missing'}
            </span>
            <span className="px-2 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
              {formatPlantCapacityKW(estimate.targetCapacityKW)}
            </span>
            {template && (
              <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
                {SYNC_TYPE_LABELS[template.syncType]} · {template.name}
              </span>
            )}
            {isWhatIfActive && (
              <span className="px-2 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1">
                <Icon name="science" className="text-[14px]" />
                What-if active
                <button
                  type="button"
                  onClick={() => {
                    setEquityPctOverride(null);
                    setExtraPrepayment(0);
                    setAutoAbsorb(false);
                  }}
                  className="ml-1 underline"
                >
                  reset
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-sm w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate(`/estimates/${estimate.id}/edit`)}
            iconLeft={<Icon name="edit" />}
            className="flex-1 md:flex-none"
          >
            Edit Inputs
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(`/estimates/${estimate.id}/export`)}
            iconLeft={<Icon name="download" />}
            className="flex-1 md:flex-none"
          >
            Export
          </Button>
        </div>
      </div>

      {/* Always-on totals + optional generation / revenue */}
      <EstimateTotalsCard estimate={estimate} finance={finance} />

      {/* Finance section gating */}
      {!finance ? (
        <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
          <div className="flex items-start gap-sm">
            <Icon name="account_balance" className="text-tertiary text-[24px] shrink-0" />
            <div>
              <p className="font-body-md text-body-md text-on-surface">
                <span className="font-semibold">Finance modeling is off.</span>{' '}
                Toggle it on to see IRR, NPV, payback, cashflows, and
                irradiance-driven yield for this estimate.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            iconLeft={<Icon name="bolt" />}
            onClick={() => enableFinance(estimate.id)}
          >
            Enable finance
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <KpiCard
              accent="tertiary"
              icon="trending_up"
              label="Internal Rate of Return (IRR)"
              value={irrLabel}
              hint={feasibilityHint}
            />
            <KpiCard
              accent="primary"
              icon="update"
              label="Payback Period"
              value={formatYears(finance.paybackYears)}
              hint={`Project lifespan: ${finance.meta.basics.lifespanYears} yrs`}
            />
            <KpiCard
              accent="secondary"
              icon="account_balance"
              label="Net Present Value (NPV)"
              value={formatINR(finance.npv)}
              hint={`At ${formatPercent(finance.meta.basics.discountPct)} discount rate`}
            />
          </div>

          {!estimate.location && (
            <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
              <div className="flex items-start gap-sm">
                <Icon
                  name="location_searching"
                  className="text-tertiary text-[24px] shrink-0"
                />
                <p className="font-body-md text-body-md text-on-surface">
                  <span className="font-semibold">No location pinned.</span>{' '}
                  Sized from a flat CUF of{' '}
                  {formatPercent(finance.meta.basics.cufPct)}. Pin a site to
                  drive yield from real NSRDB India irradiance.
                </p>
              </div>
              <Button
                variant="primary"
                iconLeft={<Icon name="add_location" />}
                onClick={() => navigate(`/estimates/${estimate.id}/edit`)}
              >
                Pin a location
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
            <section className="lg:col-span-2 lg:row-start-1 bg-surface-container-lowest rounded-xl p-md shadow-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-body-lg text-body-lg text-on-surface">
                  Cumulative Cash Flow
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Break-even:{' '}
                  {finance.breakEvenYear === null
                    ? 'never'
                    : `Year ${finance.breakEvenYear}`}
                </span>
              </div>
              <CashFlowChart
                data={cashflowChartData}
                breakEvenYear={finance.breakEvenYear}
                showNetPosition={showNetPosition}
              />
            </section>

            <section className="lg:col-span-2 lg:row-start-2 bg-surface-container-lowest rounded-xl p-md shadow-card">
              <h3 className="font-body-lg text-body-lg text-on-surface mb-2">
                Year-by-year Net Cash Flow
              </h3>
              <YearlyBarChart data={yearlyBarData} />
            </section>

            <section className="lg:col-start-3 lg:row-start-1 lg:row-span-2 h-full bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col">
              <h3 className="font-body-lg text-body-lg text-on-surface mb-4">
                CAPEX Breakdown
              </h3>
              <div className="flex-1">
                <CostDonut slices={donutSlices} />
              </div>
              <div className="flex justify-between items-center mt-md pt-sm border-t border-outline-variant/40">
                <span className="font-body-md text-on-surface-variant">Total</span>
                <span className="font-data-display text-data-display text-primary">
                  {formatINR(results.capex.total)}
                </span>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md items-stretch">
            <section className="h-full bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-body-lg text-body-lg text-on-surface">
                  Funding Mix
                </h3>
                <ResetButton
                  disabled={!fundingModified}
                  onClick={() => setEquityPctOverride(null)}
                />
              </div>
              {results.capex.total === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No CAPEX entered yet.
                </p>
              ) : (
                <>
                  <div className="flex-1 flex items-center">
                    <InlineSlider
                      id="equity-pct-slider"
                      label="Equity Share"
                      value={equityPct}
                      onChange={(n) => setEquityPctOverride(Math.round(n))}
                      min={0}
                      max={100}
                      step={1}
                      formatValue={(n) =>
                        `${Math.round(n)}% · ${formatINR((results.capex.total * n) / 100)}`
                      }
                      formatBound={(n) => `${n}%`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-sm pt-md mt-md border-t border-outline-variant/40">
                    <Stat
                      label="Equity"
                      value={formatINR(finance.equity)}
                      accent="primary"
                    />
                    <Stat label="Loan" value={formatINR(finance.loanAmount)} />
                    <Stat
                      label="Annual EMI"
                      value={annualEMI > 0 ? formatINR(annualEMI) : '—'}
                    />
                  </div>
                </>
              )}
            </section>

            {finance.loanAmount > 0 && (
              <section className="h-full bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-body-lg text-body-lg text-on-surface">
                    Loan Prepayment
                  </h3>
                  <div className="flex items-center gap-md">
                    <ResetButton
                      disabled={!prepayModified}
                      onClick={() => {
                        setExtraPrepayment(0);
                        setAutoAbsorb(false);
                      }}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Auto-absorb
                      </span>
                      <Switch
                        checked={autoAbsorb}
                        onChange={(next) => {
                          setAutoAbsorb(next);
                          if (next) setExtraPrepayment(0);
                        }}
                        label="Auto-absorb surplus"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 flex items-center">
                  {autoAbsorb ? (
                    <div className="flex items-start gap-2 w-full">
                      <Icon name="auto_mode" className="text-primary text-[20px] mt-0.5" />
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        <span className="text-on-surface font-semibold">
                          Auto-absorb active.
                        </span>{' '}
                        Each post-grace year's full surplus is applied to the
                        loan principal.
                      </p>
                    </div>
                  ) : (
                    <InlineSlider
                      id="extra-prepayment-slider"
                      label="Extra Monthly Loan Prepayment"
                      tooltip={{
                        label: 'Loan Prepayment',
                        content:
                          'Adds extra monthly principal payments on top of the scheduled EMI (applied as a yearly lump for the calc).',
                      }}
                      value={extraPrepayment}
                      onChange={setExtraPrepayment}
                      min={0}
                      max={sliderMax > 0 ? sliderMax : 1}
                      step={SLIDER_STEP}
                      formatValue={(n) => `${formatINR(n)} /mo`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-sm pt-md mt-md border-t border-outline-variant/40">
                  <Stat
                    label="Loan Retires In"
                    before={`${baselineRetireYear} yrs`}
                    value={`${currentYearsToRetire} yrs`}
                    accent="primary"
                  />
                  <Stat
                    label="Interest Paid"
                    before={formatINR(baselineInterest)}
                    value={formatINR(currentInterest)}
                  />
                  <Stat
                    label="Total Loan Paid"
                    before={formatINR(baselineTotalLoanPaid)}
                    value={formatINR(currentTotalLoanPaid)}
                  />
                </div>
              </section>
            )}
          </div>

          <PnLTable finance={finance} />

          {finance.yield && (
            <IrradianceSection estimate={estimate} yieldResult={finance.yield} />
          )}

          <Co2Card
            annualYear1={finance.co2.annualYear1}
            cumulative={finance.co2.cumulative}
            lifespanYears={finance.meta.basics.lifespanYears}
          />
        </>
      )}
    </div>
  );
}

function EstimateTotalsCard({
  estimate,
  finance,
}: {
  estimate: Estimate;
  finance: FinanceResults | null;
}) {
  const t = estimate.totals;
  const lifetimeRevenue = finance
    ? finance.revenue.reduce((s, x) => s + x, 0)
    : 0;
  const y1Generation = finance?.energy[0];

  return (
    <section
      aria-label="Cost and generation summary"
      className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-md shadow-card"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-md gap-y-4">
        <TotalsMetric label="Main BOM" value={`₹ ${formatINR(t.mainBomSubtotal)}`} />
        <TotalsMetric label="Main GST" value={`₹ ${formatINR(t.mainBomGst)}`} />
        <TotalsMetric label="Other Scope" value={`₹ ${formatINR(t.otherScopeSubtotal)}`} />
        <TotalsMetric label="Other GST" value={`₹ ${formatINR(t.otherScopeGst)}`} />
        <TotalsMetric
          label="Grand total"
          value={`₹ ${formatINR(t.grandTotal)}`}
          accent
        />
        <TotalsMetric label="Per kW" value={`₹ ${formatINR(t.perKwRate)}`} />
        {finance && (
          <>
            <TotalsMetric
              label="Annual generation (Y1)"
              value={formatKWh(y1Generation ?? 0)}
            />
            <TotalsMetric
              label="Lifetime revenue"
              value={`₹ ${formatINR(lifetimeRevenue)}`}
            />
          </>
        )}
      </div>
    </section>
  );
}

function TotalsMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-sm min-w-0 border ${
        accent
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container-lowest border-outline-variant'
      }`}
    >
      <div
        className={`font-label-sm text-label-sm uppercase tracking-wide truncate ${
          accent ? 'text-on-primary opacity-85' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </div>
      <div
        className={`font-data-display text-body-lg font-semibold mt-1 tabular-nums truncate min-w-0 ${
          accent ? 'text-on-primary' : 'text-on-surface'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
