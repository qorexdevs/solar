import { compactINRParts } from '@/lib/format';

type Props = {
  total: number;
  /** Override the default title (e.g. "Estimated Grand Total"). */
  label?: string;
  /** Override the default footer text. */
  hint?: string;
};

export function EstimateCard({
  total,
  label = 'Estimated Grand Total',
  hint = 'Includes all taxes, duties, and configuration overrides as of current draft.',
}: Props) {
  const { sign, number, unit } = compactINRParts(total);
  return (
    <div className="bg-primary text-on-primary rounded-xl p-lg shadow-elevated flex flex-col gap-md relative overflow-hidden h-full">
      <div
        aria-hidden
        className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed opacity-10 rounded-bl-full pointer-events-none"
      />
      <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-xs">
        <span className="font-body-lg text-body-lg text-primary-fixed">{sign}₹</span>
        <span className="font-headline-lg text-headline-lg tracking-tight">{number}</span>
        {unit && (
          <span className="font-body-md text-body-md text-primary-fixed-dim">{unit}</span>
        )}
      </div>
      {hint && (
        <p className="font-label-sm text-label-sm text-primary-fixed-dim/80 mt-auto pt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
