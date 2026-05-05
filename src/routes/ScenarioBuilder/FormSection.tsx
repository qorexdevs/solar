import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

type Props = {
  title: string;
  subtitle?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
};

export function FormSection({
  title,
  subtitle,
  collapsible,
  open,
  onToggle,
  children,
}: Props) {
  if (collapsible) {
    return (
      <div className="flex flex-col gap-md">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between gap-md text-left rounded-lg p-1 hover:bg-surface-container-low/50"
          aria-expanded={open}
        >
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              {title}
            </span>
            {subtitle && (
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {subtitle}
              </span>
            )}
          </div>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[24px] text-on-surface-variant"
          />
        </button>
        {open && children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
          {title}
        </h2>
        {subtitle && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
