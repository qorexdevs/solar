import { Tooltip } from '@/components/ui/Tooltip';

type Props = {
  id: string;
  label: string;
  tooltip?: { label: string; content: string };
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (n: number) => string;
  formatBound?: (n: number) => string;
};

export function InlineSlider({
  id,
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  formatBound,
}: Props) {
  const safeMax = max > min ? max : min + step;
  const clamped = Math.min(safeMax, Math.max(min, Number.isFinite(value) ? value : min));
  const pct = ((clamped - min) / (safeMax - min)) * 100;
  const fmtBound = formatBound ?? formatValue;

  return (
    <div className="flex flex-col gap-xs w-full">
      <div className="flex justify-between items-center gap-md">
        <div className="flex items-center gap-1 min-w-0">
          <label
            htmlFor={id}
            className="font-label-sm text-label-sm text-on-surface font-semibold truncate"
          >
            {label}
          </label>
          {tooltip && <Tooltip label={tooltip.label} content={tooltip.content} />}
        </div>
        <span className="font-data-display text-body-lg text-primary font-semibold whitespace-nowrap">
          {formatValue(clamped)}
        </span>
      </div>
      <div className="relative w-full h-8 flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-primary w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right, #003527 0%, #003527 ${pct}%, #d3e4fe ${pct}%, #d3e4fe 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
        <span>{fmtBound(min)}</span>
        <span>{fmtBound(safeMax)}</span>
      </div>
    </div>
  );
}
