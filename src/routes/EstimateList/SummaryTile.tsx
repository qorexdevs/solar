type Props = {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
};

export function SummaryTile({ label, value, unit, accent }: Props) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-lg shadow-card border border-outline-variant flex flex-col justify-between">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`font-data-display text-data-display ${
          accent ? 'text-surface-tint' : 'text-primary'
        }`}
      >
        {value}
        {unit && (
          <span className="font-body-md text-body-md text-on-surface-variant ml-0.5">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
