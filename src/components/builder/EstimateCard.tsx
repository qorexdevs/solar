import { compactINRParts } from '@/lib/format';

type Props = {
  total: number;
};

export function EstimateCard({ total }: Props) {
  const { sign, number, unit } = compactINRParts(total);
  return (
    <div className="bg-primary text-on-primary rounded-xl p-md shadow-elevated flex flex-col gap-sm relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed opacity-10 rounded-bl-full pointer-events-none"
      />
      <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider">
        Est. Total Cost
      </span>
      <div className="flex items-baseline gap-xs">
        <span className="font-body-lg text-body-lg text-primary-fixed">{sign}₹</span>
        <span className="font-headline-lg text-headline-lg tracking-tight">{number}</span>
        {unit && (
          <span className="font-body-md text-body-md text-primary-fixed-dim">{unit}</span>
        )}
      </div>
      <p className="font-label-sm text-label-sm text-primary-fixed-dim/80 mt-2">
        Auto-derived from BOM × catalog × plant size. Save the scenario to see the full
        feasibility view.
      </p>
    </div>
  );
}
