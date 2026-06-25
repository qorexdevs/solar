import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MultiCashFlowChart, type Row } from '@/components/charts/MultiCashFlowChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { lcoeINRPerKWh } from '@/lib/calc';
import {
  formatINR,
  formatPercent,
  formatPerKWh,
  formatPlantCapacityKW,
  formatRate,
  formatTonnes,
  formatYears,
} from '@/lib/format';
import { getVoltageClassTemplate } from '@/lib/estimate';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import { PROJECT_TYPE_LABELS, type Estimate } from '@/types';
import { BestCell } from './BestCell';
import { SERIES_COLORS } from './metrics';
import { PPARateRow } from './PPARateRow';
import {
  evaluateScenarios,
  seedScenarios,
  type RateScenario,
  type RateScenarioResult,
} from './ppaRates';

const MAX_SCENARIOS = 4;

type RowMetric = {
  id: string;
  label: string;
  icon: string;
  format: (r: RateScenarioResult) => string;
  numeric: (r: RateScenarioResult) => number | null;
  dir: 'higher' | 'lower';
};

const METRIC_ROWS: RowMetric[] = [
  {
    id: 'rate',
    label: 'Year-1 PPA',
    icon: 'payments',
    format: (r) => `₹ ${r.scenario.ppaRate.toFixed(2)} / kWh`,
    numeric: (r) => r.scenario.ppaRate,
    dir: 'lower',
  },
  {
    id: 'escalation',
    label: 'Annual escalation',
    icon: 'trending_flat',
    format: (r) => formatPercent(r.scenario.escalationPct),
    numeric: (r) => r.scenario.escalationPct,
    dir: 'lower',
  },
  {
    id: 'irr',
    label: 'Equity IRR',
    icon: 'trending_up',
    format: (r) =>
      r.results.finance && Number.isFinite(r.results.finance.irr)
        ? formatRate(r.results.finance.irr)
        : '—',
    numeric: (r) =>
      r.results.finance && Number.isFinite(r.results.finance.irr)
        ? r.results.finance.irr
        : null,
    dir: 'higher',
  },
  {
    id: 'npv',
    label: 'NPV',
    icon: 'functions',
    format: (r) => (r.results.finance ? `₹ ${formatINR(r.results.finance.npv)}` : '—'),
    numeric: (r) => (r.results.finance ? r.results.finance.npv : null),
    dir: 'higher',
  },
  {
    id: 'payback',
    label: 'Payback',
    icon: 'update',
    format: (r) =>
      r.results.finance ? formatYears(r.results.finance.paybackYears) : '—',
    numeric: (r) => (r.results.finance ? r.results.finance.paybackYears : null),
    dir: 'lower',
  },
  {
    id: 'revenueY1',
    label: 'Year-1 Revenue',
    icon: 'request_quote',
    format: (r) =>
      r.results.finance ? `₹ ${formatINR(r.results.finance.revenue[0] ?? 0)}` : '—',
    numeric: (r) => (r.results.finance ? (r.results.finance.revenue[0] ?? null) : null),
    dir: 'higher',
  },
  {
    id: 'co2',
    label: 'Lifetime CO₂',
    icon: 'co2',
    format: (r) =>
      r.results.finance ? formatTonnes(r.results.finance.co2.cumulative) : '—',
    numeric: (r) => (r.results.finance ? r.results.finance.co2.cumulative : null),
    dir: 'higher',
  },
];

export function PPARatesPanel() {
  const estimates = useEstimateStore((s) => s.estimates);
  const recentId = useEstimateStore((s) => s.recentEstimateId);
  const templates = useTemplateStore((s) => s.templates);

  const financeReady = useMemo(
    () => estimates.filter((e) => e.finance?.enabled),
    [estimates]
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    if (recentId && financeReady.some((e) => e.id === recentId)) return recentId;
    return financeReady[0]?.id;
  });

  const estimate = estimates.find((e) => e.id === selectedId);

  const [scenarios, setScenarios] = useState<RateScenario[]>(() =>
    estimate ? seedScenarios(estimate) : []
  );

  useEffect(() => {
    if (!estimate) {
      setScenarios([]);
      return;
    }
    setScenarios(seedScenarios(estimate));
  }, [estimate?.id]);

  const evaluated = useMemo<RateScenarioResult[]>(() => {
    if (!estimate || !estimate.finance?.enabled) return [];
    return evaluateScenarios(estimate, scenarios);
  }, [estimate, scenarios]);

  const lcoe = useMemo(
    () => (estimate?.finance?.enabled ? lcoeINRPerKWh(estimate) : null),
    [estimate]
  );

  const lifespan = estimate?.finance?.basics.lifespanYears ?? 25;

  const bestById = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const m of METRIC_ROWS) {
      let bestVal: number | null = null;
      let bestId: string | undefined;
      for (const r of evaluated) {
        const v = m.numeric(r);
        if (v === null || !Number.isFinite(v)) continue;
        if (bestVal === null) {
          bestVal = v;
          bestId = r.scenario.id;
          continue;
        }
        if ((m.dir === 'higher' && v > bestVal) || (m.dir === 'lower' && v < bestVal)) {
          bestVal = v;
          bestId = r.scenario.id;
        }
      }
      out[m.id] = bestId;
    }
    return out;
  }, [evaluated]);

  const series = evaluated.map((r, i) => ({
    id: r.scenario.id,
    name: `₹${r.scenario.ppaRate.toFixed(2)} @ ${r.scenario.escalationPct.toFixed(1)}%/yr`,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  const chartData: Row[] = useMemo(() => {
    if (evaluated.length === 0) return [];
    const rows: Row[] = [];
    for (let i = 0; i < lifespan; i++) {
      const row: Row = { year: i + 1 };
      for (const r of evaluated) {
        const fin = r.results.finance;
        row[r.scenario.id] = fin?.cumulativeCF[i] ?? 0;
        row[`${r.scenario.id}__net`] = fin?.cashflows[i] ?? 0;
      }
      rows.push(row);
    }
    return rows;
  }, [evaluated, lifespan]);

  function updateScenario(id: string, next: RateScenario) {
    setScenarios((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeScenario(id: string) {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  function addScenario() {
    if (!estimate || scenarios.length >= MAX_SCENARIOS) return;
    const last = scenarios[scenarios.length - 1];
    const baseRate = last?.ppaRate ?? estimate.finance?.revenue.ppaRate ?? 4.5;
    const escalation =
      last?.escalationPct ?? estimate.finance?.revenue.ppaEscalationPct ?? 2.0;
    setScenarios((prev) => [
      ...prev,
      {
        id: `s_${Date.now()}_${prev.length}`,
        ppaRate: round2(baseRate + 0.25),
        escalationPct: escalation,
      },
    ]);
  }

  function resetScenarios() {
    if (!estimate) return;
    setScenarios(seedScenarios(estimate));
  }

  if (estimates.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-on-surface-variant">
        You don&apos;t have any estimates yet.{' '}
        <Link className="text-primary underline" to="/estimates/new">
          Create one
        </Link>{' '}
        to use the PPA rate comparison.
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-card">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-md">
          Select Estimate
        </h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
          Only estimates with finance enabled can be analysed — IRR / NPV / payback all
          depend on the finance layer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {estimates.map((e) => {
            const vTpl = getVoltageClassTemplate(e, templates);
            const isSelected = e.id === selectedId;
            const disabled = !e.finance?.enabled;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => !disabled && setSelectedId(e.id)}
                disabled={disabled}
                className={`text-left rounded-xl p-lg flex items-start gap-md border transition-all ${
                  isSelected
                    ? 'border-2 border-primary bg-primary-fixed/20'
                    : disabled
                      ? 'border-outline-variant/40 bg-surface opacity-60 cursor-not-allowed'
                      : 'border-outline-variant bg-surface hover:border-outline'
                }`}
              >
                <Icon
                  name={isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  filled={isSelected}
                  className={
                    isSelected ? 'text-primary mt-0.5' : 'text-outline-variant mt-0.5'
                  }
                />
                <div className="flex flex-col gap-xs min-w-0 flex-1">
                  <span className="font-data-display text-[18px] leading-[24px] font-semibold text-on-surface truncate">
                    {e.name}
                  </span>
                  <span className="font-body-md text-[14px] leading-[20px] text-on-surface-variant">
                    {vTpl
                      ? PROJECT_TYPE_LABELS[vTpl.projectType ?? 'utility']
                      : 'Voltage facet unset'}{' '}
                    · {formatPlantCapacityKW(e.targetCapacityKW)}
                  </span>
                  {disabled && (
                    <Link
                      to={`/estimates/${e.id}/edit`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="font-label-sm text-label-sm text-tertiary underline mt-0.5"
                    >
                      Enable finance →
                    </Link>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {!estimate ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-on-surface-variant">
          Pick an estimate above to start comparing PPA rates.
        </div>
      ) : !estimate.finance?.enabled ? (
        <div className="rounded-xl border border-tertiary/40 bg-tertiary/5 p-lg flex flex-col md:flex-row md:items-center md:justify-between gap-md">
          <div className="flex items-start gap-md">
            <Icon name="account_balance" className="text-tertiary text-[24px] shrink-0" />
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-semibold">{estimate.name}</span> doesn&apos;t have a
              finance layer enabled. Open the estimate and toggle finance modeling on to
              compare PPA rates.
            </p>
          </div>
          <Link
            className="px-lg py-md rounded-lg bg-primary text-on-primary font-label-sm hover:bg-primary-container"
            to={`/estimates/${estimate.id}/edit`}
          >
            Open estimate
          </Link>
        </div>
      ) : (
        <>
          <LCOECallout estimate={estimate} lcoe={lcoe} />

          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-card">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  PPA Rate Scenarios
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Up to {MAX_SCENARIOS} scenarios. Each row is recomputed through the full
                  finance engine.
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  onClick={resetScenarios}
                  iconLeft={<Icon name="restart_alt" />}
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={addScenario}
                  disabled={scenarios.length >= MAX_SCENARIOS}
                  iconLeft={<Icon name="add" />}
                >
                  Add rate
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-md">
              {scenarios.map((s, i) => (
                <PPARateRow
                  key={s.id}
                  scenario={s}
                  onChange={(next) => updateScenario(s.id, next)}
                  onRemove={scenarios.length > 1 ? () => removeScenario(s.id) : undefined}
                  color={SERIES_COLORS[i % SERIES_COLORS.length]}
                  index={i}
                />
              ))}
            </div>
          </section>

          {evaluated.length >= 1 && (
            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-card">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">
                  Cumulative Cash Flow
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {lifespan} yrs
                </span>
              </div>
              <MultiCashFlowChart
                data={chartData}
                series={series}
                annualNetSuffix="__net"
              />
              <div className="flex flex-wrap gap-2 mt-1.5 font-label-sm text-label-sm">
                {series.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 text-on-surface">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </div>
                ))}
              </div>
            </section>
          )}

          {evaluated.length >= 1 && (
            <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="p-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 w-1/4">
                        Metric
                      </th>
                      {evaluated.map((r, i) => (
                        <th
                          key={r.scenario.id}
                          className="p-2 font-body-md text-body-md font-semibold text-primary min-w-[150px]"
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background: SERIES_COLORS[i % SERIES_COLORS.length],
                              }}
                            />
                            Scenario {i + 1}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {METRIC_ROWS.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-surface-container-lowest transition-colors"
                      >
                        <td className="p-2 font-label-sm text-label-sm text-on-surface-variant sticky left-0 bg-surface-container-lowest">
                          <span className="flex items-center gap-1">
                            <Icon name={m.icon} className="text-[18px]" /> {m.label}
                          </span>
                        </td>
                        {evaluated.map((r) => {
                          const isBest =
                            bestById[m.id] === r.scenario.id && evaluated.length > 1;
                          return (
                            <td
                              key={r.scenario.id}
                              className="p-2 font-body-md text-body-md text-on-surface"
                            >
                              <BestCell isBest={isBest}>{m.format(r)}</BestCell>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-2 py-1.5 text-label-sm text-on-surface-variant border-t border-outline-variant bg-surface-container-low">
                Best value for each metric is highlighted. Estimate parameters (CAPEX,
                financing, lifespan) stay fixed — only the year-1 tariff and escalation
                change between scenarios.
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LCOECallout({ estimate, lcoe }: { estimate: Estimate; lcoe: number | null }) {
  const currentRate = estimate.finance?.revenue.ppaRate ?? null;
  return (
    <section className="bg-surface-container-low rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row md:items-center gap-lg">
      <div className="flex items-start gap-md flex-1">
        <Icon name="straighten" className="text-tertiary text-[24px] shrink-0 mt-0.5" />
        <div>
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
            LCOE reference
          </p>
          <p className="font-headline-md text-headline-md text-on-surface font-semibold">
            {lcoe !== null ? formatPerKWh(lcoe) : '—'}
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            Levelized cost — the floor below which the project loses money.
          </p>
        </div>
      </div>
      {currentRate !== null && (
        <div className="md:border-l md:border-outline-variant md:pl-lg">
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
            Estimate&apos;s current PPA
          </p>
          <p className="font-headline-md text-headline-md text-on-surface font-semibold">
            ₹ {currentRate.toFixed(2)} / kWh
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            Used to seed the scenarios below.
          </p>
        </div>
      )}
    </section>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
