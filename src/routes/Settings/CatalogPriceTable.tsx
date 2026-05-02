import { formatINR } from '@/lib/format';
import {
  MATERIAL_KEYS,
  MATERIAL_LABELS,
  MATERIAL_UNITS,
  MATERIAL_UNIT_LABELS,
} from '@/types';
import type { MaterialKey, MaterialUnit, PriceCatalog } from '@/types';

type Props = {
  catalog: PriceCatalog;
  editable: boolean;
  onCommit: (patch: Partial<PriceCatalog>) => void;
};

export function CatalogPriceTable({ catalog, editable, onCommit }: Props) {
  function setRow(key: MaterialKey, patch: { unitPrice?: number; unit?: MaterialUnit }) {
    const nextPrices: PriceCatalog['prices'] = {
      ...catalog.prices,
      [key]: { ...catalog.prices[key], ...patch },
    };
    onCommit({ prices: nextPrices });
  }

  function setLabel(label: string) {
    onCommit({ label });
  }

  return (
    <div className="flex flex-col gap-sm">
      {editable && (
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
            Catalog label
          </span>
          <input
            type="text"
            value={catalog.label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
          />
        </label>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-body-md">
          <thead>
            <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
              <th className="py-2 pr-2">Material</th>
              <th className="py-2 pr-2">Unit</th>
              <th className="py-2 pr-2 text-right">Unit price</th>
            </tr>
          </thead>
          <tbody>
            {MATERIAL_KEYS.map((key) => {
              const row = catalog.prices[key];
              return (
                <tr
                  key={key}
                  className="border-b border-outline-variant/20 last:border-b-0"
                >
                  <td className="py-2 pr-2 font-semibold text-on-surface">
                    {MATERIAL_LABELS[key]}
                  </td>
                  <td className="py-2 pr-2">
                    {editable ? (
                      <select
                        value={row.unit}
                        onChange={(e) =>
                          setRow(key, { unit: e.target.value as MaterialUnit })
                        }
                        className="h-9 rounded-md border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md"
                      >
                        {MATERIAL_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {MATERIAL_UNIT_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-on-surface-variant">
                        {MATERIAL_UNIT_LABELS[row.unit]}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {editable ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={row.unitPrice}
                        onChange={(e) =>
                          setRow(key, { unitPrice: Number(e.target.value) })
                        }
                        className="h-9 w-32 rounded-md border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-right"
                      />
                    ) : (
                      <span className="font-data-display text-on-surface">
                        {formatINR(row.unitPrice, { compact: false })}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
