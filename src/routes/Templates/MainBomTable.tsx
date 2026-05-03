import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  BOM_CATEGORIES,
  BOM_CATEGORY_LABELS,
  BOM_UOMS,
  BOM_UOM_LABELS,
  SCALING_TYPES,
  SCALING_TYPE_LABELS,
  SYNC_TYPES,
  type BOMLineItem,
  type ScenarioTemplate,
  type ScalingType,
  type SyncType,
} from '@/types';
import { useTemplateStore } from '@/store/templates';

const cellControl =
  'rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm';

function readOnlyInputs(editable: boolean) {
  return editable ? '' : 'border-transparent bg-surface-container-low/40 cursor-default';
}

type Props = {
  template: ScenarioTemplate;
  editable: boolean;
};

export function MainBomTable({ template, editable }: Props) {
  const addLine = useTemplateStore((s) => s.addBomLine);
  const updateLine = useTemplateStore((s) => s.updateBomLine);
  const removeLine = useTemplateStore((s) => s.removeBomLine);
  const reorder = useTemplateStore((s) => s.reorderBomLines);

  const sorted = [...template.mainBom].sort((a, b) => a.sequence - b.sequence);

  function move(index: number, direction: -1 | 1) {
    const next = [...sorted];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder(
      template.id,
      next.map((l) => l.id)
    );
  }

  return (
    <section className="flex flex-col gap-sm">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-headline-md text-headline-md">Main BOM</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Core project materials and services. Quantities are scaled per
            line via the chosen scaling type.
          </p>
        </div>
        <Button
          variant="outline"
          iconLeft={<Icon name="add" />}
          onClick={() => addLine(template.id)}
          disabled={!editable}
        >
          Add line
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded border border-dashed border-outline bg-surface-container-low p-md text-center text-on-surface-variant">
          No BOM lines yet. Add the first one above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[920px] text-left text-body-sm border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-2 py-2 w-8 whitespace-nowrap">#</th>
                <th className="px-2 py-2 min-w-[132px]">Item</th>
                <th className="px-2 py-2 min-w-[160px]">Description</th>
                <th className="px-2 py-2 min-w-[120px]">Make</th>
                <th className="px-2 py-2 whitespace-nowrap">Category</th>
                <th className="px-2 py-2 whitespace-nowrap">UoM</th>
                <th className="px-2 py-2 w-24 text-right whitespace-nowrap">
                  Base qty
                </th>
                <th className="px-2 py-2 w-28 text-right whitespace-nowrap">
                  Rate (₹)
                </th>
                <th className="px-2 py-2 w-16 text-right whitespace-nowrap">
                  GST %
                </th>
                <th className="px-2 py-2 min-w-[136px] whitespace-nowrap">
                  Scaling
                </th>
                <th className="px-2 py-2 w-24 text-right whitespace-nowrap">
                  Step <span className="font-normal opacity-90">(kW/unit)</span>
                </th>
                <th className="px-2 py-2 min-w-[180px]">Applies to</th>
                <th className="px-2 py-2 whitespace-nowrap">Optional</th>
                {editable ? (
                  <th className="px-2 py-2 w-[88px]">
                    <span className="sr-only">Row actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sorted.map((line, idx) => (
                <BomRow
                  key={line.id}
                  line={line}
                  editable={editable}
                  index={idx}
                  isFirst={idx === 0}
                  isLast={idx === sorted.length - 1}
                  onChange={(patch) => updateLine(template.id, line.id, patch)}
                  onMove={(dir) => move(idx, dir)}
                  onRemove={() => removeLine(template.id, line.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BomRow({
  line,
  editable,
  index,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  line: BOMLineItem;
  editable: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<BOMLineItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const showStep = line.scalingType === 'step';
  const passive = readOnlyInputs(editable);

  return (
    <tr>
      <td className="px-2 py-2 align-middle text-on-surface-variant">{index + 1}</td>

      <td className="px-2 py-2 align-middle">
        <div className="min-w-[112px]">
          <input
            aria-label="Item name"
            readOnly={!editable}
            tabIndex={editable ? undefined : -1}
            className={`w-full ${cellControl} font-body-sm text-body-sm ${passive}`}
            value={line.itemName}
            onChange={(e) => onChange({ itemName: e.target.value })}
          />
        </div>
      </td>

      <td className="px-2 py-2 align-middle">
        <div className="min-w-[144px]">
          <input
            aria-label="Description"
            readOnly={!editable}
            tabIndex={editable ? undefined : -1}
            className={`w-full ${cellControl} text-on-surface-variant ${passive}`}
            value={line.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Description / spec"
          />
        </div>
      </td>

      <td className="px-2 py-2 align-middle">
        <div className="min-w-[104px]">
          <input
            aria-label="Make"
            readOnly={!editable}
            tabIndex={editable ? undefined : -1}
            className={`w-full ${cellControl} text-on-surface-variant ${passive}`}
            value={line.make ?? ''}
            onChange={(e) => onChange({ make: e.target.value || undefined })}
            placeholder="Brands / mfr"
          />
        </div>
      </td>

      <td className="px-2 py-2 align-middle">
        <select
          aria-label="Category"
          disabled={!editable}
          className={`max-w-[11rem] ${cellControl}`}
          value={line.category}
          onChange={(e) =>
            onChange({ category: e.target.value as BOMLineItem['category'] })
          }
        >
          {BOM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BOM_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2 align-middle">
        <select
          aria-label="UoM"
          disabled={!editable}
          className={cellControl}
          value={line.uom}
          onChange={(e) =>
            onChange({ uom: e.target.value as BOMLineItem['uom'] })
          }
        >
          {BOM_UOMS.map((u) => (
            <option key={u} value={u}>
              {BOM_UOM_LABELS[u]}
            </option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2 align-middle text-right">
        <input
          type="number"
          aria-label="Base quantity"
          readOnly={!editable}
          tabIndex={editable ? undefined : -1}
          className={`w-24 ${cellControl} text-right ${passive}`}
          value={line.baseQuantity}
          onChange={(e) =>
            onChange({ baseQuantity: Number(e.target.value) })
          }
        />
      </td>

      <td className="px-2 py-2 align-middle text-right">
        <input
          type="number"
          aria-label="Rate"
          readOnly={!editable}
          tabIndex={editable ? undefined : -1}
          className={`w-28 ${cellControl} text-right ${passive}`}
          value={line.rate}
          onChange={(e) => onChange({ rate: Number(e.target.value) })}
        />
      </td>

      <td className="px-2 py-2 align-middle text-right">
        <input
          type="number"
          aria-label="GST %"
          readOnly={!editable}
          tabIndex={editable ? undefined : -1}
          className={`w-16 ${cellControl} text-right ${passive}`}
          value={line.gstPercent}
          onChange={(e) =>
            onChange({ gstPercent: Number(e.target.value) })
          }
        />
      </td>

      <td className="px-2 py-2 align-middle">
        <select
          aria-label="Scaling"
          disabled={!editable}
          className={`min-w-[8rem] max-w-[200px] ${cellControl}`}
          value={line.scalingType}
          onChange={(e) =>
            onChange({ scalingType: e.target.value as ScalingType })
          }
        >
          {SCALING_TYPES.map((s) => (
            <option key={s} value={s}>
              {SCALING_TYPE_LABELS[s]}
            </option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2 align-middle text-right tabular-nums text-on-surface">
        {showStep ? (
          editable ? (
            <div className="inline-flex items-center gap-1 justify-end">
              <input
                type="number"
                aria-label="Unit capacity (kW per step)"
                className={`w-[4.75rem] ${cellControl} text-right`}
                value={line.unitCapacityKW ?? 0}
                onChange={(e) =>
                  onChange({ unitCapacityKW: Number(e.target.value) })
                }
                placeholder="0"
              />
            </div>
          ) : (
            <span>{line.unitCapacityKW ?? 0}</span>
          )
        ) : (
          <span className="text-on-surface-variant pr-2" aria-hidden>
            —
          </span>
        )}
      </td>

      <td className="px-2 py-2 align-middle max-w-[220px]">
        <div className="flex flex-row flex-wrap gap-1 items-center">
          <SyncTypePicker
            editable={editable}
            value={line.applicability?.syncTypes ?? []}
            onChange={(syncTypes) =>
              onChange({
                applicability: syncTypes.length
                  ? { ...(line.applicability ?? {}), syncTypes }
                  : line.applicability &&
                      Object.keys(line.applicability).length > 1
                    ? { ...line.applicability, syncTypes: undefined }
                    : undefined,
              })
            }
          />
        </div>
      </td>

      <td className="px-2 py-2 align-middle text-body-sm whitespace-nowrap">
        {editable ? (
          <div className="flex flex-row flex-wrap items-center gap-x-md gap-y-1">
            <label className="flex items-center gap-1 whitespace-nowrap">
              <input
                type="checkbox"
                checked={line.isOptional}
                onChange={(e) =>
                  onChange({ isOptional: e.target.checked })
                }
              />
              Optional
            </label>
            {line.isOptional ? (
              <label className="flex items-center gap-1 whitespace-nowrap text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={line.includedByDefault}
                  onChange={(e) =>
                    onChange({ includedByDefault: e.target.checked })
                  }
                />
                On by default
              </label>
            ) : null}
          </div>
        ) : (
          <span className="text-on-surface">
            {line.isOptional
              ? `Optional${line.includedByDefault ? ' · default on' : ''}`
              : '—'}
          </span>
        )}
      </td>

      {editable ? (
        <td className="px-2 py-2 align-middle">
          <div className="flex flex-row items-center justify-end gap-0.5 shrink-0">
            <button
              type="button"
              className="p-1 rounded hover:bg-surface-variant disabled:opacity-30"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              title="Move up"
            >
              <Icon name="arrow_upward" className="text-base" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-surface-variant disabled:opacity-30"
              disabled={isLast}
              onClick={() => onMove(1)}
              title="Move down"
            >
              <Icon name="arrow_downward" className="text-base" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-error/10 text-error"
              onClick={onRemove}
              title="Remove"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function SyncTypePicker({
  editable,
  value,
  onChange,
}: {
  editable: boolean;
  value: SyncType[];
  onChange: (next: SyncType[]) => void;
}) {
  if (!editable) {
    return (
      <span className="text-body-sm text-on-surface">
        {value.length === 0 ? 'all' : value.join(', ')}
      </span>
    );
  }

  return (
    <>
      {SYNC_TYPES.map((s) => {
        const on = value.includes(s);
        return (
          <button
            key={s}
            type="button"
            className={`px-2 py-1 rounded text-body-sm border whitespace-nowrap ${
              on
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
            }`}
            onClick={() =>
              onChange(on ? value.filter((v) => v !== s) : [...value, s])
            }
          >
            {s}
          </button>
        );
      })}
      {value.length === 0 && (
        <span className="text-on-surface-variant text-body-sm self-center">
          all
        </span>
      )}
    </>
  );
}
