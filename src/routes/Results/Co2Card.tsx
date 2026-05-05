import { Icon } from '@/components/ui/Icon';
import { formatTonnes } from '@/lib/format';

type Props = {
  annualYear1: number;
  cumulative: number;
  lifespanYears: number;
};

export function Co2Card({ annualYear1, cumulative, lifespanYears }: Props) {
  return (
    <section className="bg-primary-container rounded-xl p-lg text-on-primary shadow-card relative overflow-hidden">
      <div aria-hidden className="absolute right-[-20px] top-[-20px] opacity-10">
        <Icon name="eco" className="text-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-lg">
        <div className="p-2 bg-on-primary/10 rounded-full self-start">
          <Icon name="co2" className="text-4xl" />
        </div>
        <div className="flex-1">
          <h3 className="font-body-lg text-body-lg mb-0.5">CO₂ Offset</h3>
          <div className="font-data-display text-data-display">
            {formatTonnes(annualYear1)} / yr
          </div>
          <p className="font-label-sm text-label-sm text-on-primary/80 mt-0.5">
            Cumulative over {lifespanYears} years:{' '}
            <span className="font-semibold">{formatTonnes(cumulative)}</span>
            {' · '}≈ {Math.round(annualYear1 / 0.06).toLocaleString('en-IN')} trees
            planted annually
          </p>
        </div>
      </div>
    </section>
  );
}
