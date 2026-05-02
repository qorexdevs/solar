import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MultiCashFlowChart, type Row } from '@/components/charts/MultiCashFlowChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { computeScenario } from '@/lib/calc';
import { formatMW, formatPercent } from '@/lib/format';
import { useScenarioStore } from '@/store/scenarios';
import type { Scenario } from '@/types';
import { METRICS, SERIES_COLORS } from './metrics';

export function Compare() {
  const scenarios = useScenarioStore((s) => s.scenarios);
  const comparisonIds = useScenarioStore((s) => s.comparisonIds);
  const toggleCompare = useScenarioStore((s) => s.toggleCompare);
  const clearCompare = useScenarioStore((s) => s.clearCompare);
  const navigate = useNavigate();

  const selectedIds = useMemo(() => {
    if (comparisonIds.length > 0) return comparisonIds;
    return scenarios.slice(0, Math.min(2, scenarios.length)).map((s) => s.id);
  }, [comparisonIds, scenarios]);

  const selected = selectedIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => Boolean(s));

  const computed = useMemo(
    () => selected.map((s) => ({ scenario: s, results: computeScenario(s) })),
    [selected]
  );

  const bestById = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const m of METRICS) {
      let bestVal: number | null = null;
      let bestScenarioId: string | undefined;
      for (const { scenario, results } of computed) {
        const v = m.numeric(results, scenario);
        if (v === null || !Number.isFinite(v)) continue;
        if (bestVal === null) {
          bestVal = v;
          bestScenarioId = scenario.id;
          continue;
        }
        if ((m.dir === 'higher' && v > bestVal) || (m.dir === 'lower' && v < bestVal)) {
          bestVal = v;
          bestScenarioId = scenario.id;
        }
      }
      out[m.id] = bestScenarioId;
    }
    return out;
  }, [computed]);

  const lifespanCap = selected.reduce(
    (acc, s) => Math.min(acc, s.basics.lifespanYears),
    100
  );
  const chartData: Row[] = useMemo(() => {
    if (computed.length === 0) return [];
    const rows: Row[] = [];
    for (let i = 0; i < lifespanCap; i++) {
      const row: Row = { year: i + 1 };
      for (const c of computed) {
        row[c.scenario.id] = c.results.cumulativeCF[i] ?? 0;
      }
      rows.push(row);
    }
    return rows;
  }, [computed, lifespanCap]);

  const series = computed.map((c, i) => ({
    id: c.scenario.id,
    name: c.scenario.name,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  return (
    <div className="space-y-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Scenario Comparison
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {selected.length === 0
              ? 'Pick at least 2 scenarios to compare.'
              : `Comparing ${selected.map((s) => s.name).join(', ')}.`}
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            iconLeft={<Icon name="arrow_back" />}
          >
            Back to List
          </Button>
          {comparisonIds.length > 0 && (
            <Button
              variant="ghost"
              onClick={clearCompare}
              iconLeft={<Icon name="clear_all" />}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
        <h2 className="font-body-lg text-body-lg font-semibold text-on-surface mb-3">
          Select scenarios to compare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
          {scenarios.map((s) => {
            const isSelected = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleCompare(s.id)}
                className={`text-left p-sm rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary-fixed/30'
                    : 'border-outline-variant bg-surface-bright hover:border-outline'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    name={isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    filled={isSelected}
                    className={isSelected ? 'text-primary' : 'text-outline-variant'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-body-md font-semibold text-on-surface truncate">
                      {s.name}
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      {formatMW(s.basics.sizeMW)} · {formatPercent(s.basics.cufPct)} CUF
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected.length >= 1 && (
        <>
          <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-body-lg text-body-lg font-semibold text-on-surface">
                Cumulative Cash Flow
              </h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {lifespanCap} yrs
              </span>
            </div>
            <MultiCashFlowChart data={chartData} series={series} />
            <div className="flex flex-wrap gap-4 mt-3 font-label-sm text-label-sm">
              {series.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-on-surface">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 w-1/4">
                      Metric
                    </th>
                    {selected.map((s) => (
                      <th
                        key={s.id}
                        className="p-4 font-body-md text-body-md font-semibold text-primary min-w-[150px]"
                      >
                        <Link to={`/scenarios/${s.id}`} className="hover:underline">
                          {s.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {METRICS.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-surface-container-lowest transition-colors"
                    >
                      <td className="p-4 font-label-sm text-label-sm text-on-surface-variant sticky left-0 bg-surface-container-lowest">
                        <span className="flex items-center gap-2">
                          <Icon name={m.icon} className="text-[18px]" /> {m.label}
                        </span>
                      </td>
                      {computed.map(({ scenario, results }) => {
                        const isBest =
                          bestById[m.id] === scenario.id && computed.length > 1;
                        return (
                          <td
                            key={scenario.id}
                            className="p-4 font-body-md text-body-md text-on-surface"
                          >
                            {isBest ? (
                              <span className="inline-flex items-center gap-2 bg-primary-fixed-dim/30 text-on-primary-fixed-variant px-2 py-1 rounded border-l-2 border-primary">
                                <Icon name="star" className="text-[14px]" />{' '}
                                {m.format(results, scenario)}
                              </span>
                            ) : (
                              m.format(results, scenario)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 text-label-sm text-on-surface-variant border-t border-outline-variant bg-surface-container-low">
              Best value for each metric is highlighted.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
