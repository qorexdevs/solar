import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

type Props = {
  isBest: boolean;
  children: ReactNode;
};

/**
 * Renders a metric value, highlighting it with a star + accent border when
 * it is the best value across the comparison set.
 */
export function BestCell({ isBest, children }: Props) {
  if (!isBest) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-2 bg-primary-fixed-dim/30 text-on-primary-fixed-variant px-2 py-1 rounded border-l-2 border-primary">
      <Icon name="star" className="text-[14px]" /> {children}
    </span>
  );
}
