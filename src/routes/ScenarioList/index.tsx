import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { computeScenario } from '@/lib/calc';
import { formatMW, formatRate } from '@/lib/format';
import { useScenarioStore } from '@/store/scenarios';
import type { Scenario } from '@/types';
import { EmptyState } from './EmptyState';
import { ScenarioCard } from './ScenarioCard';
import { SummaryTile } from './SummaryTile';

export function ScenarioList() {
  const scenarios = useScenarioStore((s) => s.scenarios);
  const remove = useScenarioStore((s) => s.remove);
  const duplicate = useScenarioStore((s) => s.duplicate);
  const setRecent = useScenarioStore((s) => s.setRecent);
  const comparisonIds = useScenarioStore((s) => s.comparisonIds);
  const toggleCompare = useScenarioStore((s) => s.toggleCompare);
  const navigate = useNavigate();

  const computed = useMemo(
    () => scenarios.map((s) => ({ scenario: s, results: safeCompute(s) })),
    [scenarios]
  );

  const summary = useMemo(() => {
    const totalCapacity = scenarios.reduce((acc, s) => acc + s.basics.sizeMW, 0);
    const irrs = computed
      .map((c) => (c.results ? c.results.irr : NaN))
      .filter((r) => Number.isFinite(r)) as number[];
    const avgIrr =
      irrs.length === 0 ? null : irrs.reduce((a, b) => a + b, 0) / irrs.length;
    return { totalCapacity, count: scenarios.length, avgIrr };
  }, [computed, scenarios]);

  return (
    <>
      <section className="mb-md">
        <h2 className="font-headline-lg text-headline-lg mb-sm">Scenario Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
          <SummaryTile
            label="Total Capacity Under Eval"
            value={formatMW(summary.totalCapacity).replace(' MW', '')}
            unit={summary.totalCapacity < 1 ? 'kW' : 'MW'}
          />
          <SummaryTile label="Active Scenarios" value={String(summary.count)} />
          <SummaryTile
            label="Avg. Projected IRR"
            value={summary.avgIrr === null ? '—' : formatRate(summary.avgIrr)}
            accent
          />
        </div>
      </section>

      <div className="flex justify-between items-center mb-sm gap-sm">
        <h3 className="font-headline-lg text-headline-lg">Saved Scenarios</h3>
        <div className="flex gap-sm">
          {comparisonIds.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => navigate('/compare')}
              iconLeft={<Icon name="compare_arrows" />}
            >
              Compare ({comparisonIds.length})
            </Button>
          )}
          <Button
            variant="primary"
            className="hidden md:inline-flex"
            iconLeft={<Icon name="add" filled />}
            onClick={() => navigate('/scenarios/new')}
          >
            New Scenario
          </Button>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {computed.map(({ scenario, results }) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              irr={results?.irr ?? null}
              inComparison={comparisonIds.includes(scenario.id)}
              onToggleCompare={() => toggleCompare(scenario.id)}
              onOpen={() => {
                setRecent(scenario.id);
                navigate(`/scenarios/${scenario.id}`);
              }}
              onEdit={() => {
                setRecent(scenario.id);
                navigate(`/scenarios/${scenario.id}/edit`);
              }}
              onDuplicate={() => duplicate(scenario.id)}
              onRemove={() => {
                if (confirm(`Delete "${scenario.name}"?`)) remove(scenario.id);
              }}
            />
          ))}
        </div>
      )}

      <Link
        to="/scenarios/new"
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-elevated flex items-center justify-center z-30 hover:bg-primary-container active:scale-95 transition-all"
        aria-label="New scenario"
      >
        <Icon name="add" filled />
      </Link>
    </>
  );
}

function safeCompute(scenario: Scenario) {
  try {
    return computeScenario(scenario);
  } catch {
    return null;
  }
}
