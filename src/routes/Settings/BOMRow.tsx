import { MATERIAL_LABELS, MATERIAL_UNITS, MATERIAL_UNIT_LABELS } from '@/types';
import type { BOMRule, MaterialKey, MaterialUnit } from '@/types';

type Props = {
  materialKey: MaterialKey;
  rule: BOMRule;
  onChange: (patch: Partial<BOMRule>) => void;
};

export function BOMRow({ materialKey, rule, onChange }: Props) {
  return (
    <tr className="border-b border-outline-variant/20 last:border-b-0">
      <td className="py-2 pr-2 font-semibold text-on-surface">
        {MATERIAL_LABELS[materialKey]}
      </td>
      <td className="py-2 pr-2">
        <select
          value={rule.unit}
          onChange={(e) => onChange({ unit: e.target.value as MaterialUnit })}
          className="h-9 rounded-md border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md"
        >
          {MATERIAL_UNITS.map((u) => (
            <option key={u} value={u}>
              {MATERIAL_UNIT_LABELS[u]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2 text-right">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={rule.perMW}
          onChange={(e) => onChange({ perMW: Number(e.target.value) })}
          className="h-9 w-32 rounded-md border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-right"
        />
      </td>
      <td className="py-2 pr-2">
        <select
          value={rule.scaleMode}
          onChange={(e) =>
            onChange({ scaleMode: e.target.value as BOMRule['scaleMode'] })
          }
          className="h-9 rounded-md border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md"
        >
          <option value="linear">Linear</option>
          <option value="fixed">Fixed</option>
        </select>
      </td>
    </tr>
  );
}
