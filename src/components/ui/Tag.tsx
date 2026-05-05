import type { EstimateStatus, TemplateStatus } from '@/types';

type AnyStatus = EstimateStatus | TemplateStatus;

type Props = {
  status: AnyStatus;
  className?: string;
};

const STYLES: Record<AnyStatus, { label: string; classes: string }> = {
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
  active: {
    label: 'Active',
    classes: 'bg-surface-container-low text-primary-container',
  },
  archived: {
    label: 'Archived',
    classes: 'bg-surface-container text-on-surface-variant opacity-60',
  },
};

export function StatusTag({ status, className = '' }: Props) {
  const cfg = STYLES[status];
  return (
    <span
      className={`inline-block px-1 py-0.5 font-label-sm text-label-sm rounded ${cfg.classes} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
