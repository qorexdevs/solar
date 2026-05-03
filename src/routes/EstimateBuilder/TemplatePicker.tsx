import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import {
  defaultSelectedOptionsFor,
  materializeTemplate,
} from '@/lib/templates';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPE_LABELS,
  type ScenarioTemplate,
} from '@/types';

type Props = {
  templates: ScenarioTemplate[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/**
 * First step of the new-estimate flow: pick a Scenario Template. Only Active
 * templates are shown; admins can switch a template to Active from the
 * Templates list.
 */
export function TemplatePicker({ templates, selectedId, onSelect }: Props) {
  const active = templates.filter((t) => t.status === 'active');

  if (active.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-outline bg-surface-container-low p-xl text-center">
        <Icon name="info" className="text-4xl text-on-surface-variant" />
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          No active templates yet. Open Templates to mark one as Active first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
      {active.map((tpl) => {
        const baseTotal = safeBaseTotal(tpl);
        const selected = selectedId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            className={`text-left rounded-xl border p-md flex flex-col gap-sm transition-shadow ${
              selected
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-outline-variant bg-surface-container-lowest hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-sm">
              <div>
                <div className="font-headline-md text-headline-md text-on-surface">
                  {tpl.name}
                </div>
                <div className="text-body-sm text-on-surface-variant mt-1">
                  {PROJECT_TYPE_LABELS[tpl.projectType]} ·{' '}
                  {SYNC_TYPE_LABELS[tpl.syncType]} · v{tpl.version}
                </div>
              </div>
              <StatusTag status={tpl.status} />
            </div>
            {tpl.description && (
              <p className="text-body-sm text-on-surface-variant line-clamp-3">
                {tpl.description}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-sm pt-sm border-t border-outline-variant/40">
              <span className="text-body-sm text-on-surface-variant">
                Base @ {formatPlantCapacityKW(tpl.baseCapacityKW)}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary">
                ₹ {formatINR(baseTotal)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function safeBaseTotal(tpl: ScenarioTemplate): number {
  try {
    const { totals } = materializeTemplate({
      template: tpl,
      targetCapacityKW: tpl.baseCapacityKW,
      selectedOptions: defaultSelectedOptionsFor(tpl),
    });
    return totals.grandTotal;
  } catch {
    return 0;
  }
}
