import { compactINRParts } from '@/lib/format';

type Tile = {
  label: string;
  value: number;
};

type Props = {
  mainBomSubtotal: number;
  mainBomGst: number;
  otherScopeSubtotal: number;
  otherScopeGst: number;
};

/**
 * Four tile strip mirroring the cost breakdown on the mockup. Sits to the
 * left of the big "Estimated Grand Total" card.
 */
export function EstimateKpiStrip({
  mainBomSubtotal,
  mainBomGst,
  otherScopeSubtotal,
  otherScopeGst,
}: Props) {
  const tiles: Tile[] = [
    { label: 'Main BOM Subtotal', value: mainBomSubtotal },
    { label: 'Main BOM GST', value: mainBomGst },
    { label: 'Other Scope Subtotal', value: otherScopeSubtotal },
    { label: 'Other Scope GST', value: otherScopeGst },
  ];

  return (
    <div className="grid grid-cols-2 gap-md">
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </div>
  );
}

function KpiTile({ label, value }: Tile) {
  const { sign, number, unit } = compactINRParts(value);
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-lg shadow-card flex flex-col gap-xs min-h-[6rem]">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-xs">
        <span className="font-body-md text-body-md text-on-surface-variant">
          {sign}₹
        </span>
        <span className="font-data-display text-data-display text-on-surface">
          {number}
        </span>
        {unit && (
          <span className="font-body-md text-body-md text-on-surface-variant">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
