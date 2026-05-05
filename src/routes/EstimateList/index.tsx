import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { computeEstimate } from '@/lib/calc';
import { formatINR, formatPlantCapacityKW, formatRate } from '@/lib/format';
import { getVoltageClassTemplate } from '@/lib/estimate';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import type { Estimate } from '@/types';
import { EmptyState } from './EmptyState';
import { EstimateListCards } from './EstimateListCards';
import { SummaryTile } from './SummaryTile';

export function EstimateList() {
  const estimates = useEstimateStore((s) => s.estimates);
  const remove = useEstimateStore((s) => s.remove);
  const duplicate = useEstimateStore((s) => s.duplicate);
  const setRecent = useEstimateStore((s) => s.setRecent);
  const comparisonIds = useEstimateStore((s) => s.comparisonIds);
  const toggleCompare = useEstimateStore((s) => s.toggleCompare);
  const templates = useTemplateStore((s) => s.templates);
  const navigate = useNavigate();

  const computed = useMemo(
    () =>
      estimates.map((e) => ({
        estimate: e,
        results: safeCompute(e),
        template: getVoltageClassTemplate(e, templates),
      })),
    [estimates, templates]
  );

  const summary = useMemo(() => {
    const totalKW = estimates.reduce((acc, e) => acc + e.targetCapacityKW, 0);
    const totalGrand = estimates.reduce((acc, e) => acc + e.totals.grandTotal, 0);
    const irrs = computed
      .map((c) => (c.results?.finance ? c.results.finance.irr : NaN))
      .filter((r) => Number.isFinite(r)) as number[];
    const avgIrr =
      irrs.length === 0 ? null : irrs.reduce((a, b) => a + b, 0) / irrs.length;
    return { totalKW, count: estimates.length, avgIrr, totalGrand };
  }, [computed, estimates]);

  return (
    <>
      <section className="mb-lg">
        <h2 className="font-headline-lg text-headline-lg mb-md">Portfolio Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <SummaryTile
            label="Total Capacity"
            value={formatPlantCapacityKW(summary.totalKW)}
          />
          <SummaryTile label="Active Estimates" value={String(summary.count)} />
          <SummaryTile
            label="Avg. IRR (finance-on)"
            value={summary.avgIrr === null ? '—' : formatRate(summary.avgIrr)}
            accent
          />
        </div>
      </section>

      <div className="flex justify-between items-center mb-md gap-md">
        <h3 className="font-headline-lg text-headline-lg">Saved Estimates</h3>
        <div className="flex gap-md">
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
            variant="outline"
            className="hidden md:inline-flex"
            iconLeft={<Icon name="library_books" />}
            onClick={() => navigate('/templates')}
          >
            Templates
          </Button>
          <Button
            variant="primary"
            className="hidden md:inline-flex"
            iconLeft={<Icon name="add" filled />}
            onClick={() => navigate('/estimates/new')}
          >
            New Estimate
          </Button>
        </div>
      </div>

      {estimates.length === 0 ? (
        <EmptyState />
      ) : (
        <EstimateListCards
          rows={computed}
          comparisonIds={comparisonIds}
          onToggleCompare={(id) => toggleCompare(id)}
          onOpen={(id) => {
            setRecent(id);
            navigate(`/estimates/${id}`);
          }}
          onDuplicate={(id) => duplicate(id)}
          onRemove={(id) => {
            const e = estimates.find((x) => x.id === id);
            if (e && confirm(`Delete "${e.name}"?`)) remove(id);
          }}
        />
      )}

      {/* Provide a portfolio total row */}
      {estimates.length > 0 && (
        <p className="text-on-surface-variant font-label-sm mt-md">
          Combined grand total across all estimates: ₹ {formatINR(summary.totalGrand)}.
        </p>
      )}

      <Link
        to="/estimates/new"
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-elevated flex items-center justify-center z-30 hover:bg-primary-container active:scale-95 transition-all"
        aria-label="New estimate"
      >
        <Icon name="add" filled />
      </Link>
    </>
  );
}

function safeCompute(estimate: Estimate) {
  try {
    return computeEstimate(estimate);
  } catch {
    return null;
  }
}
