import type { CSSProperties } from 'react';

type Props = {
  name: string;
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

export function Icon({ name, filled, className = '', style, ariaLabel }: Props) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''} ${className}`.trim()}
      style={style}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    >
      {name}
    </span>
  );
}
