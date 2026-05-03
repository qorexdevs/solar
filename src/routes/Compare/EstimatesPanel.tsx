import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MultiCashFlowChart, type Row } from '@/components/charts/MultiCashFlowChart';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { computeEstimate } from '@/lib/calc';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import type { Estimate } from '@/types';
import { BestCell } from './BestCell';
import { METRICS, SERIES_COLORS } from './metrics';

export function EstimatesPanel() {
  const estimates = useEstimateStore((s) => s.estimates);
  const comparisonIds = useEstimateStore((s) => s.comparisonIds);
  const toggleCompare = useEstimateStore((s) => s.toggleCompare);
  const clearCompare = useEstimateStore((s) => s.clearCompare);
  const navigate = useNavigate();

  const selectedIds = useMemo(() => {
    if (comparisonIds.length > 0) return comparisonIds;
    return estimates.slice(0, Math.min(2, estimates.length)).map((s) => s.id);
  }, [comparisonIds, estimates]);

  const selected = selectedIds
    .map((id) => estimates.find((e) => e.id === id))
    .filter((e): e is Estimate => Boolean(e));

  const computed = useMemo(
    () => selected.map((e) => ({ estimate: e, results: computeEstimate(e) })),
    [selected]
  );

  const bestById = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const m of METRICS) {
      let bestVal: number | null = null;
      let bestId: string | undefined;
      for (const { estimate, results } of computed) {
        const v = m.numeric(results, estimate);
        if (v === null || !Number.isFinite(v)) continue;
        if (bestVal === null) {
          bestVal = v;
          bestId = estimate.id;
          continue;
        }
        if ((m.dir === 'higher' && v > bestVal) || (m.dir === 'lower' && v < bestVal)) {
          bestVal = v;
          bestId = estimate.id;
        }
      }
      out[m.id] = bestId;
    }
    return out;
  }, [computed]);

  const lifespanCap = computed.reduce((acc, c) => {
    const lifespan = c.results.finance?.meta.basics.lifespanYears ?? 25;
    return Math.min(acc, lifespan);
  }, 100);

  const chartData: Row[] = useMemo(() => {
    if (computed.length === 0) return [];
    const rows: Row[] = [];
    for (let i = 0; i < lifespanCap; i++) {
      const row: Row = { year: i + 1 };
      for (const c of computed) {
        row[c.estimate.id] = c.results.finance?.cumulativeCF[i] ?? 0;
      }
      rows.push(row);
    }
    return rows;
  }, [computed, lifespanCap]);

  const series = computed.map((c, i) => ({
    id: c.estimate.id,
    name: c.estimate.name,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  const anyHasFinance = computed.some((c) => c.results.finance);

  return (
    <div className="space-y-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">
            Estimate Comparison
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {selected.length === 0
              ? 'Pick at least 2 estimates to compare.'
              : `Comparing ${selected.map((e) => e.name).join(', ')}.`}
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
            <Button variant="ghost" onClick={clearCompare} iconLeft={<Icon name="clear_all" />}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
        <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-3">
          Select estimates to compare
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
          {estimates.map((e) => {
            const isSelected = selectedIds.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleCompare(e.id)}
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
                      {e.name}
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      {formatPlantCapacityKW(e.targetCapacityKW)} · ₹{' '}
                      {formatINR(e.totals.grandTotal)}
                      {e.finance?.enabled ? ' · finance on' : ''}
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
          {anyHasFinance && (
            <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">
                  Cumulative Cash Flow (finance-enabled estimates only)
                </h3>
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
          )}

          <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 w-1/4">
                      Metric
                    </th>
                    {selected.map((e) => (
                      <th
                        key={e.id}
                        className="p-4 font-body-md text-body-md font-semibold text-primary min-w-[150px]"
                      >
                        <Link to={`/estimates/${e.id}`} className="hover:underline">
                          {e.name}
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
                          {m.requiresFinance && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-tertiary/10 text-tertiary">
                              finance
                            </span>
                          )}
                        </span>
                      </td>
                      {computed.map(({ estimate, results }) => {
                        const isBest =
                          bestById[m.id] === estimate.id && computed.length > 1;
                        return (
                          <td
                            key={estimate.id}
                            className="p-4 font-body-md text-body-md text-on-surface"
                          >
                            <BestCell isBest={isBest}>
                              {m.format(results, estimate)}
                            </BestCell>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 text-label-sm text-on-surface-variant border-t border-outline-variant bg-surface-container-low">
              Best value for each metric is highlighted. Finance metrics are
              only computed when an estimate has its finance layer enabled.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
