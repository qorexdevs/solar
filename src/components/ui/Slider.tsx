import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip';
import {
  formatINR,
  formatMW,
  formatPercent,
  formatYears,
  formatIndianGroup,
} from '@/lib/format';

type Variant = 'rupee' | 'percent' | 'years' | 'mw' | 'plain';

type Props = {
  id?: string;
  label?: ReactNode;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  variant?: Variant;
  suffix?: string;
  hint?: ReactNode;
  tooltip?: { label: string; content: string };
  formatValue?: (n: number) => string;
  className?: string;
  minMaxFormat?: (n: number) => string;
};

function defaultFormat(variant: Variant, suffix?: string) {
  return (n: number): string => {
    if (suffix) return `${trimNumber(n)} ${suffix}`;
    switch (variant) {
      case 'rupee':
        return formatINR(n);
      case 'percent':
        return formatPercent(n);
      case 'years':
        return formatYears(n, 0);
      case 'mw':
        return formatMW(n);
      case 'plain':
      default:
        return trimNumber(n);
    }
  };
}

function trimNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return formatIndianGroup(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function Slider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  variant = 'plain',
  suffix,
  hint,
  tooltip,
  formatValue,
  className = '',
  minMaxFormat,
}: Props) {
  const fmt = formatValue ?? defaultFormat(variant, suffix);
  const fmtBound = minMaxFormat ?? fmt;

  const safeMax = max > min ? max : min + (step || 1);
  const clamped = Math.min(safeMax, Math.max(min, Number.isFinite(value) ? value : min));
  const pct = ((clamped - min) / (safeMax - min)) * 100;

  return (
    <div
      className={`flex flex-col gap-xs bg-surface-container-low p-md rounded-xl border border-outline-variant/20 ${className}`}
    >
      <div className="flex justify-between items-center gap-sm">
        <div className="flex items-center gap-2 min-w-0">
          {label && (
            <label
              htmlFor={id}
              className="font-label-sm text-label-sm text-on-surface font-semibold truncate"
            >
              {label}
            </label>
          )}
          {tooltip && <Tooltip label={tooltip.label} content={tooltip.content} />}
        </div>
        <span className="font-data-display text-body-lg text-primary font-semibold whitespace-nowrap">
          {fmt(clamped)}
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
      {hint && (
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{hint}</p>
      )}
    </div>
  );
}
