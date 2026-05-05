import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import type { RateScenario } from './ppaRates';

/** Bisection solver in ppa.ts probes up to ~25 ₹/kWh; slider caps at 15 for UX. */
const PPA_RATE_MIN = 0.5;
const PPA_RATE_MAX = 15;
const PPA_RATE_STEP = 0.05;

const ESCALATION_MIN = 0;
const ESCALATION_MAX = 10;
const ESCALATION_STEP = 0.1;

type Props = {
  scenario: RateScenario;
  onChange: (next: RateScenario) => void;
  onRemove?: () => void;
  color: string;
  index: number;
};

/**
 * One editable row in the PPA rate scenario list. Bundles the year-1 tariff
 * slider, the escalation slider, and a remove button. The colored swatch ties
 * the row to its line in the comparison chart.
 */
export function PPARateRow({ scenario, onChange, onRemove, color, index }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-md rounded-lg border border-outline-variant bg-surface px-md py-md">
      <div className="flex items-center gap-md shrink-0 sm:pt-0.5">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} aria-hidden />
        <span className="font-label-sm text-label-sm text-on-surface-variant w-[5.5rem] shrink-0">
          Scenario {index + 1}
        </span>
      </div>

      <div className="flex flex-1 flex-col sm:flex-row gap-md min-w-0">
        <Slider
          id={`ppa-${scenario.id}`}
          className="flex-1 !p-md !gap-0.5"
          label="Year-1 PPA (₹/kWh)"
          value={scenario.ppaRate}
          onChange={(ppaRate) => onChange({ ...scenario, ppaRate })}
          min={PPA_RATE_MIN}
          max={PPA_RATE_MAX}
          step={PPA_RATE_STEP}
          variant="plain"
          formatValue={(n) => `₹${n.toFixed(2)}/kWh`}
        />
        <Slider
          id={`esc-${scenario.id}`}
          className="flex-1 !p-md !gap-0.5"
          label="Escalation (%/yr)"
          value={scenario.escalationPct}
          onChange={(escalationPct) => onChange({ ...scenario, escalationPct })}
          min={ESCALATION_MIN}
          max={ESCALATION_MAX}
          step={ESCALATION_STEP}
          variant="percent"
        />
      </div>

      {onRemove && (
        <div className="flex items-center justify-end sm:justify-center sm:self-center shrink-0">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove scenario ${index + 1}`}
            className="text-on-surface-variant hover:text-error rounded-full p-0.5 transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
