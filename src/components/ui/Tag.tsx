import type { ScenarioStatus } from '@/types';

type Props = {
  status: ScenarioStatus;
  className?: string;
};

const STYLES: Record<ScenarioStatus, { label: string; classes: string }> = {
  feasible: {
    label: 'Feasible',
    classes: 'bg-surface-container-low text-primary-container',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-surface-container-highest text-on-surface-variant',
  },
  review: {
    label: 'Review Needed',
    classes: 'bg-surface-container text-on-surface-variant',
  },
};

export function StatusTag({ status, className = '' }: Props) {
  const cfg = STYLES[status];
  return (
    <span
      className={`inline-block px-2 py-1 font-label-sm text-label-sm rounded ${cfg.classes} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
