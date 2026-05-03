import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  SCALING_TYPES,
  SCALING_TYPE_LABELS,
  SYNC_TYPES,
  type OtherScopeItem,
  type ScalingType,
  type ScenarioTemplate,
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

export function OtherScopeTable({ template, editable }: Props) {
  const addItem = useTemplateStore((s) => s.addScopeItem);
  const updateItem = useTemplateStore((s) => s.updateScopeItem);
  const removeItem = useTemplateStore((s) => s.removeScopeItem);
  const reorder = useTemplateStore((s) => s.reorderScopeItems);

  const sorted = [...template.otherScope].sort((a, b) => a.sequence - b.sequence);

  function move(index: number, direction: -1 | 1) {
    const next = [...sorted];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder(
      template.id,
      next.map((s) => s.id)
    );
  }

  return (
    <section className="flex flex-col gap-sm">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-headline-md text-headline-md">Other Scope of Works</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Optional or supplementary items priced as a single amount (no qty
            × rate split). Rolled into Grand Total per PRD §7.
          </p>
        </div>
        <Button
          variant="outline"
          iconLeft={<Icon name="add" />}
          disabled={!editable}
          onClick={() => addItem(template.id)}
        >
          Add scope item
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded border border-dashed border-outline bg-surface-container-low p-md text-center text-on-surface-variant">
          No Other Scope items yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-2 py-2 w-8">#</th>
                <th className="px-2 py-2 min-w-[200px]">Scope name</th>
                <th className="px-2 py-2 w-32 text-right">Base amount (₹)</th>
                <th className="px-2 py-2 w-20 text-right">GST %</th>
                <th className="px-2 py-2">Scaling</th>
                <th className="px-2 py-2">Applies to</th>
                <th className="px-2 py-2">Optional</th>
                {editable ? (
                  <th className="px-2 py-2 w-20">
                    <span className="sr-only">Row actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sorted.map((item, idx) => (
                <ScopeRow
                  key={item.id}
                  item={item}
                  editable={editable}
                  index={idx}
                  isFirst={idx === 0}
                  isLast={idx === sorted.length - 1}
                  onChange={(patch) => updateItem(template.id, item.id, patch)}
                  onMove={(dir) => move(idx, dir)}
                  onRemove={() => removeItem(template.id, item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ScopeRow({
  item,
  editable,
  index,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  item: OtherScopeItem;
  editable: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<OtherScopeItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const showStep = item.scalingType === 'step';
  const passive = readOnlyInputs(editable);

  return (
    <tr className="align-top">
      <td className="px-2 py-2 align-middle text-on-surface-variant">
        {index + 1}
      </td>

      <td className="px-2 py-2 align-middle">
        <div className="flex flex-col gap-1 min-w-0">
          <input
            aria-label="Scope name"
            readOnly={!editable}
            tabIndex={editable ? undefined : -1}
            className={`${cellControl} ${passive}`}
            value={item.scopeName}
            onChange={(e) => onChange({ scopeName: e.target.value })}
          />
          <input
            aria-label="Notes"
            readOnly={!editable}
            tabIndex={editable ? undefined : -1}
            className={`${cellControl} text-on-surface-variant ${passive}`}
            value={item.notes ?? ''}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
            placeholder="Notes / assumptions (optional)"
          />
        </div>
      </td>

      <td className="px-2 py-2 align-middle text-right">
        <input
          type="number"
          aria-label="Base amount"
          readOnly={!editable}
          tabIndex={editable ? undefined : -1}
          className={`w-32 ${cellControl} text-right ${passive}`}
          value={item.baseAmount}
          onChange={(e) =>
            onChange({ baseAmount: Number(e.target.value) })
          }
        />
      </td>

      <td className="px-2 py-2 align-middle text-right">
        <input
          type="number"
          aria-label="GST %"
          readOnly={!editable}
          tabIndex={editable ? undefined : -1}
          className={`w-20 ${cellControl} text-right ${passive}`}
          value={item.gstPercent}
          onChange={(e) =>
            onChange({ gstPercent: Number(e.target.value) })
          }
        />
      </td>

      <td className="px-2 py-2 align-middle">
        <select
          aria-label="Scaling"
          disabled={!editable}
          className={`${cellControl} max-w-[12rem]`}
          value={item.scalingType}
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
        {showStep &&
          (editable ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                className={`w-16 ${cellControl} text-right`}
                value={item.unitCapacityKW ?? 0}
                onChange={(e) =>
                  onChange({ unitCapacityKW: Number(e.target.value) })
                }
                placeholder="kW/unit"
              />
              <span className="text-on-surface-variant text-body-sm">kW/unit</span>
            </div>
          ) : (
            <div className="mt-1 text-body-sm text-on-surface tabular-nums">
              {(item.unitCapacityKW ?? 0).toLocaleString('en-IN')} kW/unit
            </div>
          ))}
      </td>

      <td className="px-2 py-2 align-middle">
        <ScopeSyncPicker
          editable={editable}
          value={item.applicability?.syncTypes ?? []}
          onChange={(syncTypes) =>
            onChange({
              applicability: syncTypes.length
                ? { ...(item.applicability ?? {}), syncTypes }
                : item.applicability &&
                    Object.keys(item.applicability).length > 1
                  ? { ...item.applicability, syncTypes: undefined }
                  : undefined,
            })
          }
        />
      </td>

      <td className="px-2 py-2 align-middle text-body-sm">
        {editable ? (
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={item.isOptional}
                onChange={(e) => onChange({ isOptional: e.target.checked })}
              />
              Optional
            </label>
            {item.isOptional ? (
              <label className="flex items-center gap-1 text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={item.includedByDefault}
                  onChange={(e) =>
                    onChange({ includedByDefault: e.target.checked })
                  }
                />
                On by default
              </label>
            ) : null}
          </div>
        ) : (
          <span className="text-on-surface whitespace-nowrap">
            {item.isOptional
              ? `Optional${item.includedByDefault ? ' · default on' : ''}`
              : '—'}
          </span>
        )}
      </td>

      {editable ? (
        <td className="px-2 py-2 align-middle">
          <div className="flex flex-row items-center justify-end gap-0.5">
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

function ScopeSyncPicker({
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
    <div className="flex flex-row flex-wrap gap-1 items-center">
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
    </div>
  );
}
