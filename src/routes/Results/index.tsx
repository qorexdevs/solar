import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CostDonut } from '@/components/charts/CostDonut';
import { YearlyBarChart } from '@/components/charts/YearlyBarChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { computeEstimate, type FinanceResults } from '@/lib/calc';
import { getVoltageClassTemplate } from '@/lib/estimate';
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
import { PROJECT_TYPE_LABELS, SYNC_TYPE_LABELS, type Estimate } from '@/types';
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
  const estimate = useEstimateStore((s) => s.estimates.find((e) => e.id === id));
  const setRecent = useEstimateStore((s) => s.setRecent);
  const enableFinance = useEstimateStore((s) => s.enableFinance);
  const templates = useTemplateStore((s) => s.templates);
  const voltageTemplate = estimate
    ? getVoltageClassTemplate(estimate, templates)
    : undefined;

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
    return (
      ((baseResults.capex.total - baseResults.finance.loanAmount) /
        baseResults.capex.total) *
      100
    );
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
      <div className="p-lg text-on-surface-variant">
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
  const baselineRetireYear = baselineFinance
    ? (() => {
        for (const r of baselineFinance.loan) {
          if (r.principal > 0 && r.balance <= 1e-6) return r.year;
        }
        return baselineFinance.meta.financing.termYears;
      })()
    : 0;
  const currentYearsToRetire =
    retireYear !== null ? retireYear : finance ? finance.meta.financing.termYears : 0;

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

  const fundingModified = equityPctOverride !== null;
  const prepayModified = clampedMonthly > 0 || autoAbsorb;
  const isWhatIfActive = fundingModified || prepayModified;

  return (
    <div className="space-y-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
        <div>
          <p className="font-label-sm text-label-sm text-outline mb-0.5 uppercase tracking-wider">
            Estimate
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {estimate.name}
          </h1>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="px-1 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              {voltageTemplate
                ? PROJECT_TYPE_LABELS[voltageTemplate.projectType ?? 'utility']
                : 'Voltage class unset'}
            </span>
            <span className="px-1 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
              {formatPlantCapacityKW(estimate.targetCapacityKW)}
            </span>
            {voltageTemplate && (
              <span className="px-1 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
                {SYNC_TYPE_LABELS[voltageTemplate.syncType ?? 'Other']} ·{' '}
                {voltageTemplate.name}
              </span>
            )}
            {isWhatIfActive && (
              <span className="px-1 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-0.5">
                <Icon name="science" className="text-[14px]" />
                What-if active
                <button
                  type="button"
                  onClick={() => {
                    setEquityPctOverride(null);
                    setExtraPrepayment(0);
                    setAutoAbsorb(false);
                  }}
                  className="ml-0.5 underline"
                >
                  reset
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-md w-full md:w-auto">
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
        <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-lg flex flex-col md:flex-row md:items-center md:justify-between gap-md">
          <div className="flex items-start gap-md">
            <Icon name="account_balance" className="text-tertiary text-[24px] shrink-0" />
            <div>
              <p className="font-body-md text-body-md text-on-surface">
                <span className="font-semibold">Finance modeling is off.</span> Toggle it
                on to see IRR, NPV, payback, cashflows, and irradiance-driven yield for
                this estimate.
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
          {!estimate.location && (
            <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-lg flex flex-col md:flex-row md:items-center md:justify-between gap-md">
              <div className="flex items-start gap-md">
                <Icon
                  name="location_searching"
                  className="text-tertiary text-[24px] shrink-0"
                />
                <p className="font-body-md text-body-md text-on-surface">
                  <span className="font-semibold">No location pinned.</span> Sized from a
                  flat CUF of {formatPercent(finance.meta.basics.cufPct)}. Pin a site to
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            <section className="lg:col-span-2 lg:row-start-1 bg-surface-container-lowest rounded-xl p-lg shadow-card">
              <div className="flex items-center justify-between mb-1">
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

            <section className="lg:col-span-2 lg:row-start-2 bg-surface-container-lowest rounded-xl p-lg shadow-card">
              <h3 className="font-body-lg text-body-lg text-on-surface mb-1">
                Year-by-year Net Cash Flow
              </h3>
              <YearlyBarChart data={yearlyBarData} />
            </section>

            <section className="lg:col-start-3 lg:row-start-1 lg:row-span-2 h-full bg-surface-container-lowest rounded-xl p-lg shadow-card flex flex-col">
              <h3 className="font-body-lg text-body-lg text-on-surface mb-2">
                CAPEX Breakdown
              </h3>
              <div className="flex-1">
                <CostDonut slices={donutSlices} />
              </div>
              <div className="flex justify-between items-center mt-lg pt-md border-t border-outline-variant/40">
                <span className="font-body-md text-on-surface-variant">Total</span>
                <span className="font-data-display text-data-display text-primary">
                  {formatINR(results.capex.total)}
                </span>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg items-stretch">
            <section className="h-full bg-surface-container-lowest rounded-xl p-lg shadow-card flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-body-lg text-body-lg text-on-surface">Funding Mix</h3>
                <ResetButton
                  disabled={!fundingModified}
                  onClick={() => setEquityPctOverride(null)}
                />
              </div>
              {results.capex.total === 0 ? (
                <p className="text-on-surface-variant text-sm">No CAPEX entered yet.</p>
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
                  <div className="grid grid-cols-3 gap-md pt-lg mt-lg border-t border-outline-variant/40">
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
              <section className="h-full bg-surface-container-lowest rounded-xl p-lg shadow-card flex flex-col">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="font-body-lg text-body-lg text-on-surface">
                    Loan Prepayment
                  </h3>
                  <div className="flex items-center gap-lg">
                    <ResetButton
                      disabled={!prepayModified}
                      onClick={() => {
                        setExtraPrepayment(0);
                        setAutoAbsorb(false);
                      }}
                    />
                    <label className="flex items-center gap-1 cursor-pointer">
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
                    <div className="flex items-start gap-1 w-full">
                      <Icon
                        name="auto_mode"
                        className="text-primary text-[20px] mt-0.5"
                      />
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        <span className="text-on-surface font-semibold">
                          Auto-absorb active.
                        </span>{' '}
                        Each post-grace year's full surplus is applied to the loan
                        principal.
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

                <div className="grid grid-cols-3 gap-md pt-lg mt-lg border-t border-outline-variant/40">
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
            annualEnergyKWh={finance.energy[0]}
          />
        </>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  dense,
}: {
  label: string;
  value: string;
  dense?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-md min-w-0">
      <span
        className={`shrink-0 ${
          dense
            ? 'font-body-sm text-on-surface-variant'
            : 'font-body-md text-on-surface-variant'
        }`}
      >
        {label}
      </span>
      <span
        className={`text-on-surface tabular-nums text-right truncate min-w-0 ${
          dense ? 'font-body-sm' : 'font-body-md'
        }`}
      >
        {value}
      </span>
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
  const lifetimeRevenue = finance ? finance.revenue.reduce((s, x) => s + x, 0) : 0;
  const y1Generation = finance?.energy[0];
  const lifespanYears = finance?.meta.basics.lifespanYears ?? 0;
  const avgAnnualRevenue =
    finance && lifespanYears > 0 ? lifetimeRevenue / lifespanYears : null;
  const irrDisplay =
    finance && Number.isFinite(finance.irr) ? formatRate(finance.irr) : '—';
  const mirrDisplay =
    finance && Number.isFinite(finance.mirr) ? formatRate(finance.mirr) : '—';

  return (
    <section
      aria-label="Expense and revenue summary"
      className="flex flex-col md:flex-row gap-md items-stretch"
    >
      <article
        aria-labelledby="results-expenses-heading"
        className="bg-surface-container-lowest rounded-xl p-lg shadow-card border-l-4 border-l-primary flex-1 min-w-0 flex flex-col"
      >
        <div className="flex items-center gap-1 text-outline mb-1">
          <Icon name="payments" />
          <h2
            id="results-expenses-heading"
            className="font-label-sm text-label-sm font-normal"
          >
            Expenses
          </h2>
        </div>
        <div className="font-data-display text-data-display text-on-surface">{`₹ ${formatINR(t.grandTotal)}`}</div>
        <div className="mt-2 pt-2 border-t border-outline-variant/40 flex flex-col gap-1 flex-1 min-h-0">
          <SummaryRow
            dense
            label="Main BOM"
            value={`₹ ${formatINR(t.mainBomSubtotal)}`}
          />
          <SummaryRow dense label="Main GST" value={`₹ ${formatINR(t.mainBomGst)}`} />
          <SummaryRow
            dense
            label="Other Scope"
            value={`₹ ${formatINR(t.otherScopeSubtotal)}`}
          />
          <SummaryRow dense label="Other GST" value={`₹ ${formatINR(t.otherScopeGst)}`} />
        </div>
        <div className="mt-2 pt-1.5 border-t border-outline-variant/40">
          <SummaryRow dense label="Per kW" value={`₹ ${formatINR(t.perKwRate)}`} />
        </div>
      </article>

      {finance ? (
        <article
          aria-labelledby="results-revenue-heading"
          className="bg-surface-container-lowest rounded-xl p-lg shadow-card border-l-4 border-l-tertiary-container flex-1 min-w-0 flex flex-col"
        >
          <div className="flex items-center gap-1 text-outline mb-1">
            <Icon name="solar_power" />
            <h2
              id="results-revenue-heading"
              className="font-label-sm text-label-sm font-normal"
            >
              Revenue
            </h2>
          </div>
          <div className="font-data-display text-data-display text-on-surface">
            ₹ {formatINR(lifetimeRevenue)}
          </div>
          <div className="mt-2 pt-2 border-t border-outline-variant/40 flex flex-col gap-1 flex-1 min-h-0">
            <SummaryRow
              dense
              label="Annual generation (Y1)"
              value={formatKWh(y1Generation ?? 0)}
            />
            {avgAnnualRevenue !== null && (
              <SummaryRow
                dense
                label="Avg. revenue / year"
                value={`₹ ${formatINR(avgAnnualRevenue)}`}
              />
            )}
          </div>
          <div className="mt-2 pt-1.5 border-t border-outline-variant/40 flex flex-col gap-1">
            <SummaryRow dense label="Internal Rate of Return (IRR)" value={irrDisplay} />
            <SummaryRow dense label="Modified IRR (MIRR)" value={mirrDisplay} />
            <SummaryRow
              dense
              label="Payback Period"
              value={formatYears(finance.paybackYears)}
            />
            <SummaryRow
              dense
              label="Discounted Payback"
              value={formatYears(finance.discountedPaybackYears)}
            />
            <SummaryRow
              dense
              label="Net Present Value (NPV)"
              value={formatINR(finance.npv)}
            />
            {Number.isFinite(finance.equityMultiple) && (
              <SummaryRow
                dense
                label="Equity Multiple"
                value={`${finance.equityMultiple.toFixed(2)}×`}
              />
            )}
            {finance.dscr.min !== null && (
              <SummaryRow
                dense
                label="Min DSCR"
                value={`${finance.dscr.min.toFixed(2)}×`}
              />
            )}
            {finance.dscr.breachYear !== null && (
              <SummaryRow
                dense
                label="DSCR < 1"
                value={
                  finance.dscr.breachCount > 1
                    ? `from yr ${finance.dscr.breachYear} (${finance.dscr.breachCount} yrs)`
                    : `yr ${finance.dscr.breachYear}`
                }
              />
            )}
            {finance.llcr !== null && (
              <SummaryRow dense label="LLCR" value={`${finance.llcr.toFixed(2)}×`} />
            )}
            {finance.plcr !== null && (
              <SummaryRow dense label="PLCR" value={`${finance.plcr.toFixed(2)}×`} />
            )}
            {finance.debtTail !== null && (
              <SummaryRow
                dense
                label="Debt Tail"
                value={
                  finance.debtTail.tailYears === 1
                    ? '1 yr'
                    : `${finance.debtTail.tailYears} yrs (${finance.debtTail.fraction.toFixed(2)}×)`
                }
              />
            )}
            {finance.peakFundingNeed > 0 && (
              <SummaryRow
                dense
                label="Peak Funding Need"
                value={`₹ ${formatINR(finance.peakFundingNeed)}`}
              />
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}
