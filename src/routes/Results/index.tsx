import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CostDonut } from '@/components/charts/CostDonut';
import { YearlyBarChart } from '@/components/charts/YearlyBarChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { KpiCard } from '@/components/ui/KpiCard';
import { Switch } from '@/components/ui/Switch';
import { capexBreakdown, computeScenario, loanAmountForScenario } from '@/lib/calc';
import { deriveMaterials, resolveCatalog } from '@/lib/catalog';
import { formatINR, formatPercent, formatRate, formatYears } from '@/lib/format';
import { useScenarioStore } from '@/store/scenarios';
import { selectActiveCatalog, useSettingsStore } from '@/store/settings';
import { PROJECT_TYPE_LABELS } from '@/types';
import { Co2Card } from './Co2Card';
import { InlineSlider } from './InlineSlider';
import { PnLTable } from './PnLTable';
import { ResetButton } from './ResetButton';
import { Stat } from './Stat';
import { usePrepaymentMax } from './usePrepaymentMax';

const SLIDER_STEP = 100;

export function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scenario = useScenarioStore((s) => s.scenarios.find((sc) => sc.id === id));
  const setRecent = useScenarioStore((s) => s.setRecent);
  const updateScenario = useScenarioStore((s) => s.update);

  const catalogs = useSettingsStore((s) => s.catalogs);
  const activeCatalogId = useSettingsStore((s) => s.activeCatalogId);
  const activeCatalog = useSettingsStore(selectActiveCatalog);
  const bomByType = useSettingsStore((s) => s.bomByProjectType);

  const referencedCatalog = useMemo(
    () =>
      scenario
        ? resolveCatalog(catalogs, scenario.catalogVersionId, activeCatalogId)
        : null,
    [scenario, catalogs, activeCatalogId]
  );
  const isOnLatestCatalog =
    referencedCatalog !== null && referencedCatalog.id === activeCatalog.id;

  const [equityPctOverride, setEquityPctOverride] = useState<number | null>(null);
  const [extraPrepayment, setExtraPrepayment] = useState<number>(0);
  const [autoAbsorb, setAutoAbsorb] = useState<boolean>(false);

  useEffect(() => {
    if (id && scenario) setRecent(id);
  }, [id, scenario, setRecent]);

  useEffect(() => {
    setEquityPctOverride(null);
    setExtraPrepayment(0);
    setAutoAbsorb(false);
  }, [id]);

  const baseEquityPct = useMemo(() => {
    if (!scenario) return 100;
    const capex = capexBreakdown(scenario.materials);
    if (capex.total === 0) return 100;
    const loan = loanAmountForScenario(capex.total, scenario.financing);
    return ((capex.total - loan) / capex.total) * 100;
  }, [scenario]);

  const equityPct = equityPctOverride ?? baseEquityPct;

  const baseline = useMemo(
    () =>
      scenario
        ? computeScenario(scenario, {
            financedPctOverride:
              equityPctOverride !== null ? 100 - equityPctOverride : undefined,
          })
        : null,
    [scenario, equityPctOverride]
  );

  const maxMonthlyPrepayment = usePrepaymentMax(scenario, equityPctOverride);
  const sliderMax = Math.max(
    0,
    Math.floor(maxMonthlyPrepayment / SLIDER_STEP) * SLIDER_STEP
  );
  const clampedMonthly = Math.max(0, Math.min(extraPrepayment, sliderMax));
  const extraAnnualFromMonthly = clampedMonthly * 12;

  // Keep the slider's displayed value honest: if the equity split shrinks the
  // available headroom, snap the stored prepayment down to match.
  useEffect(() => {
    if (extraPrepayment > sliderMax) {
      setExtraPrepayment(sliderMax);
    }
  }, [sliderMax, extraPrepayment]);

  const results = useMemo(
    () =>
      scenario
        ? computeScenario(scenario, {
            financedPctOverride:
              equityPctOverride !== null ? 100 - equityPctOverride : undefined,
            extraAnnualPrincipal:
              !autoAbsorb && extraAnnualFromMonthly > 0
                ? extraAnnualFromMonthly
                : undefined,
            autoAbsorbSurplus: autoAbsorb || undefined,
          })
        : null,
    [scenario, equityPctOverride, extraAnnualFromMonthly, autoAbsorb]
  );

  if (!scenario || !results || !baseline) {
    return (
      <div className="p-md text-on-surface-variant">
        Scenario not found.{' '}
        <Link to="/" className="text-primary underline">
          Back to scenarios
        </Link>
      </div>
    );
  }

  // Loan-side derived values for the stats rows under the Funding Mix and
  // Loan Prepayment cards. These are cheap (length ≤ ~30) so we skip useMemo.
  const baselineInterest = baseline.loan.reduce((s, r) => s + r.interest, 0);
  const currentInterest = results.loan.reduce((s, r) => s + r.interest, 0);
  const baselineTotalLoanPaid = baseline.loan.reduce((s, r) => s + r.payment, 0);
  const currentTotalLoanPaid = results.loan.reduce((s, r) => s + r.payment, 0);

  const retireYear = (() => {
    for (const r of results.loan) {
      if (r.principal > 0 && r.balance <= 1e-6) return r.year;
    }
    return null;
  })();
  const baselineRetireYear = (() => {
    for (const r of baseline.loan) {
      if (r.principal > 0 && r.balance <= 1e-6) return r.year;
    }
    return scenario.financing.termYears;
  })();
  const currentYearsToRetire =
    retireYear !== null ? retireYear : scenario.financing.termYears;

  const annualEMI = (() => {
    for (const r of results.loan) {
      if (r.principal > 0 && r.payment > 0) return r.payment;
    }
    return 0;
  })();

  // Net Position = cumulative CF + cumulative loan principal paid down.
  // Represents the equity holder's wealth trajectory (cash recouped +
  // liability reduced), so prepayment shows up as wealth-building rather
  // than a loss.
  const cashflowChartData = results.cumulativeCF.map((v, i) => ({
    year: i + 1,
    cumulative: v,
    netPosition: v + (results.loanAmount - results.loan[i].balance),
  }));
  const showNetPosition = results.loanAmount > 0;

  const yearlyBarData = results.cashflows.map((v, i) => ({
    year: i + 1,
    net: v,
  }));

  const donutSlices = Object.entries(results.capex.byKey).map(([sliceId, v]) => ({
    id: sliceId,
    name: v.name,
    value: v.amount,
  }));

  const irrLabel = Number.isFinite(results.irr) ? formatRate(results.irr) : '—';
  const feasibilityHint = (() => {
    if (!Number.isFinite(results.irr)) return 'Insufficient feasibility';
    if (results.irr >= 0.15) return 'Excellent feasibility';
    if (results.irr >= 0.1) return 'Good feasibility';
    if (results.irr >= 0.05) return 'Marginal feasibility';
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
            Analysis Result
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {scenario.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-1 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              {PROJECT_TYPE_LABELS[scenario.projectType]}
            </span>
            <span className="px-2 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
              {scenario.basics.sizeMW} MW
            </span>
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
            onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}
            iconLeft={<Icon name="edit" />}
            className="flex-1 md:flex-none"
          >
            Edit Inputs
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(`/scenarios/${scenario.id}/export`)}
            iconLeft={<Icon name="download" />}
            className="flex-1 md:flex-none"
          >
            Export Report
          </Button>
        </div>
      </div>

      {referencedCatalog && !isOnLatestCatalog && (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
          <div className="flex items-start gap-sm">
            <Icon name="receipt_long" className="text-primary text-[24px] shrink-0" />
            <div>
              <p className="font-body-md text-body-md text-on-surface">
                Priced against{' '}
                <strong className="font-semibold">{referencedCatalog.label}</strong>.
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                A newer catalog "{activeCatalog.label}" is available. Re-pricing keeps any
                manual row overrides intact.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            iconLeft={<Icon name="autorenew" />}
            onClick={() => {
              if (!scenario) return;
              const ok = window.confirm(
                `Re-price "${scenario.name}" from "${referencedCatalog.label}" to "${activeCatalog.label}"? Manually overridden rows will keep their values.`
              );
              if (!ok) return;
              const next = deriveMaterials({
                sizeMW: scenario.basics.sizeMW,
                bom: bomByType[scenario.projectType],
                catalog: activeCatalog,
                previous: scenario.materials,
                overrides: scenario.manualOverrides ?? {},
              });
              updateScenario(scenario.id, (s) => ({
                ...s,
                materials: next,
                catalogVersionId: activeCatalog.id,
              }));
            }}
          >
            Re-price to latest
          </Button>
        </div>
      )}

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
          value={formatYears(results.paybackYears)}
          hint={`Project lifespan: ${scenario.basics.lifespanYears} yrs`}
        />
        <KpiCard
          accent="secondary"
          icon="account_balance"
          label="Net Present Value (NPV)"
          value={formatINR(results.npv)}
          hint={`At ${formatPercent(scenario.basics.discountPct)} discount rate`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <section className="lg:col-span-2 lg:row-start-1 bg-surface-container-lowest rounded-xl p-md shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-body-lg text-body-lg text-on-surface">
              Cumulative Cash Flow
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Break-even:{' '}
              {results.breakEvenYear === null ? 'never' : `Year ${results.breakEvenYear}`}
            </span>
          </div>
          <CashFlowChart
            data={cashflowChartData}
            breakEvenYear={results.breakEvenYear}
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
              <div className="grid grid-cols-3 gap-sm pt-md mt-md border-t border-outline-variant/40">
                <Stat label="Equity" value={formatINR(results.equity)} accent="primary" />
                <Stat label="Loan" value={formatINR(results.loanAmount)} />
                <Stat
                  label="Annual EMI"
                  value={annualEMI > 0 ? formatINR(annualEMI) : '—'}
                />
              </div>
            </>
          )}
        </section>

        {results.loanAmount > 0 && (
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
                    Each post-grace year's full surplus is applied to the loan principal,
                    so Net CF in those years is ≈ ₹0 and the loan retires as fast as the
                    project can support.
                  </p>
                </div>
              ) : (
                <InlineSlider
                  id="extra-prepayment-slider"
                  label="Extra Monthly Loan Prepayment"
                  tooltip={{
                    label: 'Loan Prepayment',
                    content:
                      'Adds extra monthly principal payments on top of the scheduled EMI (applied as a yearly lump for the calc). The interest rate is unchanged, but the loan ends earlier — after which Loan = ₹0 and Net CF rises.',
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

      <PnLTable results={results} />

      <Co2Card
        annualYear1={results.co2.annualYear1}
        cumulative={results.co2.cumulative}
        lifespanYears={scenario.basics.lifespanYears}
      />
    </div>
  );
}
