import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import type { ComputedResults } from '@/lib/calc';
import { formatINR, formatPlantCapacityKW, formatRate, formatYears } from '@/lib/format';
import type { Estimate, EstimateStatus, ScenarioTemplate } from '@/types';
import { PROJECT_TYPE_LABELS } from '@/types/projectType';
import { SYNC_TYPE_LABELS } from '@/types/scenarioTemplate';

const STATUS_EDGE: Record<EstimateStatus, string> = {
  feasible: 'border-l-primary-container',
  draft: 'border-l-surface-tint',
  review: 'border-l-outline',
};

export type EstimateListRow = {
  estimate: Estimate;
  results: ComputedResults | null;
  template: ScenarioTemplate | undefined;
};

type Props = {
  rows: EstimateListRow[];
  comparisonIds: string[];
  onToggleCompare: (id: string) => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

function typeLabel(template: ScenarioTemplate | undefined): string {
  if (!template) return '—';
  return `${PROJECT_TYPE_LABELS[template.projectType ?? 'utility']} · ${SYNC_TYPE_LABELS[template.syncType ?? 'Other']}`;
}

function compositeEstimateTitle(
  locationLabel: string | undefined,
  capacityKW: number,
  typeStr: string
): string {
  const loc = locationLabel?.trim() ? locationLabel : '—';
  const cap = formatPlantCapacityKW(capacityKW);
  return `${loc} · ${cap} · ${typeStr}`;
}

function irrLabel(
  estimate: Estimate,
  finance: NonNullable<ComputedResults['finance']> | null
): string {
  if (!estimate.finance?.enabled) return 'finance off';
  if (!finance || !Number.isFinite(finance.irr)) return '—';
  return formatRate(finance.irr);
}

function Metric({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider leading-none mb-px">
        {label}
      </p>
      <p
        className={`font-body-md text-[13px] leading-tight tabular-nums font-medium text-on-surface truncate ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

export function EstimateListCards({
  rows,
  comparisonIds,
  onToggleCompare,
  onOpen,
  onDuplicate,
  onRemove,
}: Props) {
  return (
    <section aria-label="Saved estimates" className="flex flex-col gap-md">
      {rows.map(({ estimate, results, template }) => {
        const typeStr = typeLabel(template);
        const finance = results?.finance ?? null;
        const inComparison = comparisonIds.includes(estimate.id);
        const loanTerm =
          estimate.finance?.financing.termYears !== undefined
            ? `${estimate.finance.financing.termYears} yrs`
            : '—';

        const titleText = compositeEstimateTitle(
          estimate.location?.label,
          estimate.targetCapacityKW,
          typeStr
        );

        return (
          <article
            key={estimate.id}
            tabIndex={0}
            aria-label={`Open estimate: ${titleText}`}
            title={titleText}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              onOpen(estimate.id);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              if ((e.target as HTMLElement).closest('button')) return;
              e.preventDefault();
              onOpen(estimate.id);
            }}
            className={`bg-surface-container-lowest rounded-lg border border-outline-variant shadow-card overflow-hidden border-l-[3px] ${STATUS_EDGE[estimate.status]} transition-colors hover:bg-surface-container-low/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
          >
            <div className="px-1.5 py-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <StatusTag
                  status={estimate.status}
                  className="py-px px-0.5 shrink-0 !text-[11px] !leading-4 !font-medium"
                />
                <div className="flex items-center justify-end gap-px shrink-0">
                  <button
                    type="button"
                    aria-label={
                      inComparison ? 'Remove from comparison' : 'Add to comparison'
                    }
                    title={inComparison ? 'In comparison set' : 'Add to comparison'}
                    onClick={() => onToggleCompare(estimate.id)}
                    className={`p-0.5 transition-colors rounded-full ${
                      inComparison
                        ? 'text-primary bg-primary-fixed/40'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                    }`}
                  >
                    <Icon
                      name={inComparison ? 'check_circle' : 'compare_arrows'}
                      filled={inComparison}
                      className="text-[18px]"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete estimate"
                    title="Delete"
                    onClick={() => onRemove(estimate.id)}
                    className="p-0.5 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicate estimate"
                    title="Duplicate"
                    onClick={() => onDuplicate(estimate.id)}
                    className="p-0.5 text-on-surface-variant hover:text-secondary-container transition-colors rounded-full hover:bg-surface-container"
                  >
                    <Icon name="content_copy" className="text-[18px]" />
                  </button>
                </div>
              </div>

              <p className="font-body-md text-[calc(13px*1.2)] leading-snug font-semibold text-on-surface truncate mb-1 min-w-0">
                {titleText}
              </p>

              <div className="flex flex-nowrap items-start gap-x-3 sm:gap-x-4 pt-1 border-t border-outline-variant/70 min-w-0 w-full overflow-x-auto">
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric label="Grand total" value={`₹ ${formatINR(estimate.totals.grandTotal)}`} />
                </div>
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric label="Loan term" value={loanTerm} />
                </div>
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric label="Per kW" value={`₹ ${formatINR(estimate.totals.perKwRate)}`} />
                </div>
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric
                    label="IRR"
                    value={irrLabel(estimate, finance)}
                    valueClassName="text-surface-tint"
                  />
                </div>
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric
                    label="NPV"
                    value={finance ? `₹ ${formatINR(finance.npv)}` : '—'}
                  />
                </div>
                <div className="min-w-0 flex-[1_1_0]">
                  <Metric
                    label="Payback"
                    value={finance ? formatYears(finance.paybackYears) : '—'}
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
