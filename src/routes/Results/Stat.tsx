import { Icon } from '@/components/ui/Icon';

type Props = {
  label: string;
  value: string;
  before?: string;
  accent?: 'primary' | 'tertiary' | 'on-surface';
  icon?: string;
};

export function Stat({ label, value, before, accent = 'on-surface', icon }: Props) {
  const accentClass =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'tertiary'
        ? 'text-tertiary-container'
        : 'text-on-surface';
  return (
    <div className="min-w-0">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div
        className={`flex items-baseline gap-1 font-data-display text-body-lg font-semibold ${accentClass}`}
      >
        {icon && <Icon name={icon} className="text-[18px]" />}
        {before && before !== value && (
          <span className="line-through text-on-surface-variant text-body-md font-normal">
            {before}
          </span>
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
