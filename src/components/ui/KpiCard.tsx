import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  icon?: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'primary' | 'tertiary' | 'secondary' | 'outline';
  className?: string;
};

const ACCENTS: Record<NonNullable<Props['accent']>, string> = {
  primary: 'border-l-primary',
  tertiary: 'border-l-tertiary-container',
  secondary: 'border-l-secondary-container',
  outline: 'border-l-outline',
};

export function KpiCard({
  icon,
  label,
  value,
  hint,
  accent = 'primary',
  className = '',
}: Props) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-md shadow-card border-l-4 ${ACCENTS[accent]} ${className}`}
    >
      <div className="flex items-center gap-2 text-outline mb-2">
        {icon && <Icon name={icon} />}
        <span className="font-label-sm text-label-sm">{label}</span>
      </div>
      <div className="font-data-display text-data-display text-on-surface">{value}</div>
      {hint && <p className="font-label-sm text-label-sm text-outline mt-1">{hint}</p>}
    </div>
  );
}
