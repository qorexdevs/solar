import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { Icon } from '@/components/ui/Icon';
import { OTHER_SCOPE_GROUP_LABEL, capexBreakdown } from '@/lib/calc';
import { hasLineOverride } from '@/lib/estimate';
import { formatINR, formatIndianGroup } from '@/lib/format';
import {
  BOM_CATEGORIES,
  BOM_UOMS,
  BOM_UOM_LABELS,
  type BOMCategory,
  type BOMUom,
  type EstimateLineOverride,
  type EstimateLineOverridesMap,
  type MaterializedBOM,
  type MaterializedLine,
  type MaterializedScopeLine,
} from '@/types';

type Props = {
  /** BOM with overrides already applied (subtotal/gst/total reflect edits). */
  display: {
    mainLines: MaterializedLine[];
    otherLines: MaterializedScopeLine[];
  };
  /** Original materialized BOM, used to detect override-vs-derived state. */
  materialized: MaterializedBOM;
  overrides: EstimateLineOverridesMap | undefined;
  onLineOverride: (lineId: string, patch: EstimateLineOverride) => void;
  onClearLineOverride: (lineId: string) => void;
  onClearAllOverrides: () => void;
};

type CategoryRow = {
  key: string;
  label: string;
  isScope: boolean;
  total: number;
  count: number;
  includedCount: number;
};

/**
 * Inline-editable, category-collapsible BOM table for the builder. Each
 * cell mutates the estimate's `lineOverrides`; totals come from the
 * already-overlayed `display.mainLines` / `display.otherLines`.
 */
export function EditableBomTable({
  display,
  materialized,
  overrides,
  onLineOverride,
  onClearLineOverride,
  onClearAllOverrides,
}: Props) {
  const breakdown = useMemo(
    () =>
      capexBreakdown({
        mainLines: display.mainLines,
        otherLines: display.otherLines,
      }),
    [display]
  );

  const orderedCategories = useMemo<CategoryRow[]>(() => {
    const out: CategoryRow[] = [];
    for (const cat of BOM_CATEGORIES) {
      const group = breakdown.byCategory[cat];
      if (!group) continue;
      out.push({
        key: cat,
        label: group.label,
        isScope: false,
        total: group.total,
        count: group.lines.length,
        includedCount: group.lines.filter((l) => !l.excluded).length,
      });
    }
    if (breakdown.byCategory['__other_scope__']) {
      const g = breakdown.byCategory['__other_scope__']!;
      out.push({
        key: '__other_scope__',
        label: OTHER_SCOPE_GROUP_LABEL,
        isScope: true,
        total: g.total,
        count: g.lines.length,
        includedCount: g.lines.filter((l) => !l.excluded).length,
      });
    }
    return out;
  }, [breakdown]);

  const linesByCategory = useMemo(() => {
    const main = new Map<BOMCategory, MaterializedLine[]>();
    for (const line of display.mainLines) {
      const arr = main.get(line.category) ?? [];
      arr.push(line);
      main.set(line.category, arr);
    }
    return main;
  }, [display.mainLines]);

  const baselineMain = useMemo(
    () => new Map(materialized.mainLines.map((l) => [l.id, l])),
    [materialized.mainLines]
  );
  const baselineScope = useMemo(
    () => new Map(materialized.otherLines.map((l) => [l.id, l])),
    [materialized.otherLines]
  );

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      const out: Record<string, boolean> = {};
      orderedCategories.forEach((c, idx) => {
        out[c.key] = idx === 0;
      });
      return out;
    }
  );

  // Keep open state pruned when categories appear/disappear after recompute.
  useEffect(() => {
    setOpenCategories((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      const present = new Set(orderedCategories.map((c) => c.key));
      for (const k of Object.keys(prev)) {
        if (present.has(k)) next[k] = prev[k]!;
        else changed = true;
      }
      for (const c of orderedCategories) {
        if (!(c.key in next)) {
          next[c.key] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orderedCategories]);

  const toggleCategory = useCallback((key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const anyOverride = !!overrides && Object.keys(overrides).length > 0;

  return (
    <div className="flex flex-col gap-md">
      {anyOverride && (
        <div className="flex items-center justify-between gap-md flex-wrap rounded-lg border border-tertiary/30 bg-tertiary/5 px-md py-1">
          <span className="font-label-sm text-label-sm text-on-surface">
            Manual line edits are active. Changing target capacity, selections,
            or syncing template versions will reset them.
          </span>
          <button
            type="button"
            onClick={onClearAllOverrides}
            className="font-label-sm text-label-sm text-primary hover:underline"
          >
            Reset all overrides
          </button>
        </div>
      )}

      <div className="rounded-xl border border-outline-variant/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-md min-w-[640px]">
            <thead>
              <tr className="text-left text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider bg-surface-container-low/60 border-b border-outline-variant/30">
                <th className="px-md py-md">Item Description</th>
                <th className="px-md py-md text-right">UOM</th>
                <th className="px-md py-md text-right">Quantity</th>
                <th className="px-md py-md text-right">Rate (₹)</th>
                <th className="px-md py-md text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map((cat) => {
                const open = !!openCategories[cat.key];
                const mainLines = cat.isScope
                  ? []
                  : linesByCategory.get(cat.key as BOMCategory) ?? [];
                const scopeLines = cat.isScope ? display.otherLines : [];
                return (
                  <Fragment key={cat.key}>
                    <tr className="bg-surface-container-low/30 border-b border-outline-variant/30">
                      <td colSpan={5} className="px-0 py-0">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.key)}
                          className="w-full flex items-center justify-between gap-md px-md py-md text-left hover:bg-surface-container-low/50"
                          aria-expanded={open}
                        >
                          <div className="flex items-center gap-md min-w-0">
                            <Icon
                              name={
                                open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
                              }
                              className={`text-[20px] ${
                                open ? 'text-primary' : 'text-on-surface-variant'
                              }`}
                            />
                            <span
                              className={`font-body-md font-semibold ${
                                open ? 'text-primary' : 'text-on-surface'
                              }`}
                            >
                              {cat.label}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              ({cat.includedCount}/{cat.count})
                            </span>
                          </div>
                          <span className="font-data-display text-on-surface">
                            ₹ {formatINR(cat.total)}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {open &&
                      mainLines.map((line) => (
                        <EditableMainRow
                          key={line.id}
                          line={line}
                          baseline={baselineMain.get(line.id)}
                          override={overrides?.[line.id]}
                          isOverridden={hasLineOverride(overrides, line.id)}
                          onPatch={(patch) => onLineOverride(line.id, patch)}
                          onReset={() => onClearLineOverride(line.id)}
                        />
                      ))}
                    {open &&
                      scopeLines.map((line) => (
                        <EditableScopeRow
                          key={line.id}
                          line={line}
                          baseline={baselineScope.get(line.id)}
                          override={overrides?.[line.id]}
                          isOverridden={hasLineOverride(overrides, line.id)}
                          onPatch={(patch) => onLineOverride(line.id, patch)}
                          onReset={() => onClearLineOverride(line.id)}
                        />
                      ))}
                  </Fragment>
                );
              })}
              {orderedCategories.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-md py-2xl text-center text-on-surface-variant"
                  >
                    No BOM lines yet. Pick required facets in the sidebar to
                    materialize this estimate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type MainRowProps = {
  line: MaterializedLine;
  baseline: MaterializedLine | undefined;
  override: EstimateLineOverride | undefined;
  isOverridden: boolean;
  onPatch: (patch: EstimateLineOverride) => void;
  onReset: () => void;
};

function EditableMainRow({
  line,
  baseline,
  override,
  isOverridden,
  onPatch,
  onReset,
}: MainRowProps) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        line.included ? '' : 'opacity-50'
      }`}
    >
      <td className="px-md py-md min-w-[14rem]">
        <TextCell
          value={line.itemName}
          baseline={baseline?.itemName}
          edited={override?.itemName !== undefined}
          onCommit={(v) => {
            const trimmed = v.trim();
            if (!trimmed || trimmed === baseline?.itemName) {
              onPatch({ itemName: undefined });
            } else {
              onPatch({ itemName: trimmed });
            }
          }}
          fontSemibold
        />
        {line.make && (
          <div className="font-label-sm text-label-sm text-on-surface-variant mt-px">
            Make: {line.make}
          </div>
        )}
        {isOverridden && (
          <button
            type="button"
            onClick={onReset}
            className="mt-px text-label-sm font-label-sm text-tertiary hover:underline"
          >
            Reset to derived
          </button>
        )}
      </td>
      <td className="px-md py-md text-right">
        <UomCell
          value={line.uom}
          baseline={baseline?.uom}
          edited={override?.uom !== undefined}
          onChange={(v) => {
            if (!v || v === baseline?.uom) {
              onPatch({ uom: undefined });
            } else {
              onPatch({ uom: v });
            }
          }}
        />
      </td>
      <td className="px-md py-md text-right">
        <NumberCell
          value={line.quantity}
          baseline={baseline?.quantity}
          edited={override?.quantity !== undefined}
          format={(n) => formatIndianGroup(Math.round(n))}
          onCommit={(n) => {
            if (n === undefined || n === baseline?.quantity) {
              onPatch({ quantity: undefined });
            } else {
              onPatch({ quantity: n });
            }
          }}
        />
      </td>
      <td className="px-md py-md text-right">
        <NumberCell
          value={line.rate}
          baseline={baseline?.rate}
          edited={override?.rate !== undefined}
          format={(n) => formatINR(n, { compact: false })}
          onCommit={(n) => {
            if (n === undefined || n === baseline?.rate) {
              onPatch({ rate: undefined });
            } else {
              onPatch({ rate: n });
            }
          }}
        />
      </td>
      <td className="px-md py-md text-right font-data-display text-on-surface">
        {formatINR(line.subtotal, { compact: false })}
      </td>
    </tr>
  );
}

type ScopeRowProps = {
  line: MaterializedScopeLine;
  baseline: MaterializedScopeLine | undefined;
  override: EstimateLineOverride | undefined;
  isOverridden: boolean;
  onPatch: (patch: EstimateLineOverride) => void;
  onReset: () => void;
};

function EditableScopeRow({
  line,
  baseline,
  override,
  isOverridden,
  onPatch,
  onReset,
}: ScopeRowProps) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        line.included ? '' : 'opacity-50'
      }`}
    >
      <td className="px-md py-md min-w-[14rem]">
        <TextCell
          value={line.scopeName}
          baseline={baseline?.scopeName}
          edited={override?.itemName !== undefined}
          onCommit={(v) => {
            const trimmed = v.trim();
            if (!trimmed || trimmed === baseline?.scopeName) {
              onPatch({ itemName: undefined });
            } else {
              onPatch({ itemName: trimmed });
            }
          }}
          fontSemibold
        />
        {isOverridden && (
          <button
            type="button"
            onClick={onReset}
            className="mt-px text-label-sm font-label-sm text-tertiary hover:underline"
          >
            Reset to derived
          </button>
        )}
      </td>
      <td className="px-md py-md text-right text-on-surface-variant">lot</td>
      <td className="px-md py-md text-right text-on-surface-variant">—</td>
      <td className="px-md py-md text-right">
        <NumberCell
          value={line.amount}
          baseline={baseline?.amount}
          edited={override?.rate !== undefined}
          format={(n) => formatINR(n, { compact: false })}
          onCommit={(n) => {
            if (n === undefined || n === baseline?.amount) {
              onPatch({ rate: undefined });
            } else {
              onPatch({ rate: n });
            }
          }}
        />
      </td>
      <td className="px-md py-md text-right font-data-display text-on-surface">
        {formatINR(line.amount, { compact: false })}
      </td>
    </tr>
  );
}

type TextCellProps = {
  value: string;
  baseline: string | undefined;
  edited: boolean;
  onCommit: (v: string) => void;
  fontSemibold?: boolean;
};

function TextCell({
  value,
  baseline,
  edited,
  onCommit,
  fontSemibold,
}: TextCellProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      title={
        baseline && edited
          ? `Manually edited (was: ${baseline}). Press Esc to revert.`
          : undefined
      }
      className={`w-full bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none text-on-surface ${
        edited ? 'text-tertiary' : ''
      } ${fontSemibold ? 'font-body-md font-semibold' : 'font-body-md'}`}
    />
  );
}

type UomCellProps = {
  value: BOMUom;
  baseline: BOMUom | undefined;
  edited: boolean;
  onChange: (v: BOMUom) => void;
};

function UomCell({ value, baseline, edited, onChange }: UomCellProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
        onChange(e.target.value as BOMUom)
      }
      title={
        baseline && edited
          ? `Manually edited (was: ${BOM_UOM_LABELS[baseline]}).`
          : undefined
      }
      className={`bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none text-on-surface text-right font-body-md ${
        edited ? 'text-tertiary' : ''
      }`}
    >
      {BOM_UOMS.map((u) => (
        <option key={u} value={u}>
          {BOM_UOM_LABELS[u]}
        </option>
      ))}
    </select>
  );
}

type NumberCellProps = {
  value: number;
  baseline: number | undefined;
  edited: boolean;
  format: (n: number) => string;
  onCommit: (n: number | undefined) => void;
};

function NumberCell({
  value,
  baseline,
  edited,
  format,
  onCommit,
}: NumberCellProps) {
  const [draft, setDraft] = useState<string>(formatNumberDraft(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(formatNumberDraft(value));
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : format(value)}
      onFocus={() => {
        setFocused(true);
        setDraft(formatNumberDraft(value));
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const cleaned = draft.replace(/,/g, '').trim();
        if (cleaned === '') {
          onCommit(undefined);
          return;
        }
        const parsed = Number(cleaned);
        if (!Number.isFinite(parsed)) {
          onCommit(undefined);
          return;
        }
        onCommit(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(formatNumberDraft(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      title={
        baseline !== undefined && edited
          ? `Manually edited (was: ${format(baseline)}). Press Esc to revert.`
          : undefined
      }
      className={`w-full bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none text-right font-body-md text-on-surface ${
        edited ? 'text-tertiary' : ''
      }`}
    />
  );
}

function formatNumberDraft(n: number): string {
  if (!Number.isFinite(n)) return '';
  // Strip trailing zeros after decimal but keep precision for the user.
  return String(Math.round(n * 100) / 100);
}
