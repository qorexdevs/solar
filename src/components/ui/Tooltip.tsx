import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';

type Props = {
  label: string;
  content: string;
  className?: string;
};

/**
 * Tap/click and hover tooltip used to explain technical terms (CUF, IRR, NPV, …).
 * Mobile users tap the help icon; it dismisses on outside tap or Escape.
 */
export function Tooltip({ label, content, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="text-secondary hover:text-secondary-container transition-colors p-1 rounded-full"
      >
        <Icon name="help" className="text-[16px]" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1 w-64 max-w-[80vw] rounded-lg bg-inverse-surface text-inverse-on-surface text-[13px] leading-snug p-3 shadow-elevated"
        >
          {content}
        </span>
      )}
    </span>
  );
}
