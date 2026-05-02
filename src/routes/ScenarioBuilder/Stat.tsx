type Props = {
  label: string;
  value: string;
  accent?: boolean;
};

export function Stat({ label, value, accent }: Props) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`font-data-display text-data-display ${accent ? 'text-primary' : 'text-on-surface'}`}
      >
        {value}
      </span>
    </div>
  );
}
