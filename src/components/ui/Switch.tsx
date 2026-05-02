type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
};

export function Switch({ checked, onChange, label, className = '' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full relative shadow-inner cursor-pointer flex-shrink-0 transition-colors ${
        checked ? 'bg-primary' : 'bg-outline-variant'
      } ${className}`}
    >
      <span
        className={`w-4 h-4 rounded-full absolute top-1 shadow-sm transition-all ${
          checked ? 'right-1 bg-on-primary' : 'left-1 bg-surface-container-lowest'
        }`}
      />
    </button>
  );
}
