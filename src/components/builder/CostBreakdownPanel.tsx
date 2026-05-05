import { Fragment, useMemo } from 'react';
import {
  BOM_CATEGORIES,
  BOM_UOM_LABELS,
  type BOMCategory,
  type ComposeMode,
  type ComposeOverridesMap,
  type MaterializedBOM,
  type MaterializedLine,
  type MaterializedScopeLine,
  type ScalingType,
  SCALING_TYPE_LABELS,
} from '@/types';
import { formatINR, formatIndianGroup, formatPercent } from '@/lib/format';
import { capexBreakdown, OTHER_SCOPE_GROUP_LABEL } from '@/lib/calc';

type Props = {
  materialized: MaterializedBOM;
  composeOverrides?: ComposeOverridesMap;
  onComposeModeChange?: (
    catalogItemId: string,
    mode: ComposeMode | undefined
  ) => void;
};

const PLACEHOLDER = '—';

/**
 * Read-only cost breakdown for a materialized estimate BOM. Edits live on
 * the template (`/templates/:id`), not on the estimate itself; the estimate
 * builder controls inclusion via the optional-line toggles + target
 * capacity slider.
 *
 * Lines hidden by sync gating ("conditional") show greyed; user-excluded
 * optional lines also show greyed.
 */
export function CostBreakdownPanel({
  materialized,
  composeOverrides,
  onComposeModeChange,
}: Props) {
  const breakdown = capexBreakdown(materialized);

  const orderedCategories = useMemo<string[]>(() => {
    const cats: string[] = BOM_CATEGORIES.filter(
      (c): c is BOMCategory => !!breakdown.byCategory[c]
    );
    if (breakdown.byCategory['__other_scope__']) cats.push('__other_scope__');
    return cats;
  }, [breakdown]);

  const linesByCategory = useMemo(() => {
    const main = new Map<BOMCategory, MaterializedLine[]>();
    for (const line of materialized.mainLines) {
      const arr = main.get(line.category) ?? [];
      arr.push(line);
      main.set(line.category, arr);
    }
    return main;
  }, [materialized]);

  return (
    <div className="flex flex-col gap-lg">
      <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-md">
            <thead>
              <tr className="text-left text-on-surface-variant bg-surface-container-low/20 border-b border-outline-variant/30">
                <th className="px-1.5 py-1">Item</th>
                <th className="px-1.5 py-1 text-right">Qty</th>
                <th className="px-1.5 py-1 text-right">Rate (₹)</th>
                <th className="px-1.5 py-1 text-right">GST</th>
                <th className="px-1.5 py-1 text-right">Subtotal</th>
                <th className="px-1.5 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map((cat) => {
                const group = breakdown.byCategory[cat];
                if (!group) return null;
                const isScope = cat === '__other_scope__';
                const mainLines = isScope
                  ? ([] as MaterializedLine[])
                  : (linesByCategory.get(cat as BOMCategory) ?? []);
                const includedCount = group.lines.filter((l) => !l.excluded).length;
                const label = isScope ? OTHER_SCOPE_GROUP_LABEL : group.label;
                return (
                  <Fragment key={cat}>
                    <tr className="bg-surface-container-low/40 border-b border-outline-variant/30">
                      <td colSpan={6} className="px-lg py-md">
                        <div className="flex items-center justify-between gap-md flex-wrap">
                          <div className="flex items-center gap-md flex-wrap">
                            <span className="font-body-md font-semibold text-on-surface">
                              {label}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              ({includedCount}/{group.lines.length})
                            </span>
                          </div>
                          <span className="font-data-display text-on-surface">
                            ₹ {formatINR(group.total)}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isScope
                      ? materialized.otherLines.map((item) => (
                          <ScopeBodyRow
                            key={item.id}
                            item={item}
                            overrideMode={composeOverrides?.[item.catalogItemId]}
                            onComposeModeChange={onComposeModeChange}
                          />
                        ))
                      : mainLines.map((line) => (
                          <MainBodyRow
                            key={line.id}
                            line={line}
                            overrideMode={composeOverrides?.[line.catalogItemId]}
                            onComposeModeChange={onComposeModeChange}
                          />
                        ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-lg flex flex-col gap-0.5 border border-outline-variant/30">
        <div className="flex justify-between items-center">
          <span className="font-body-md text-on-surface-variant">
            Main BOM subtotal
          </span>
          <span className="font-body-md text-on-surface">
            ₹ {formatINR(breakdown.mainSubtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-body-md text-on-surface-variant">
            Main BOM GST
          </span>
          <span className="font-body-md text-on-surface">
            ₹ {formatINR(breakdown.mainTax)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-body-md text-on-surface-variant">
            Other Scope subtotal
          </span>
          <span className="font-body-md text-on-surface">
            ₹ {formatINR(breakdown.otherSubtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-body-md text-on-surface-variant">
            Other Scope GST
          </span>
          <span className="font-body-md text-on-surface">
            ₹ {formatINR(breakdown.otherTax)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-outline-variant/30 mt-0.5">
          <span className="font-body-md text-on-surface">Grand total</span>
          <span className="font-data-display text-data-display text-primary">
            ₹ {formatINR(breakdown.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MainBodyRow({
  line,
  overrideMode,
  onComposeModeChange,
}: {
  line: MaterializedLine;
  overrideMode?: ComposeMode;
  onComposeModeChange?: (catalogItemId: string, mode: ComposeMode | undefined) => void;
}) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        line.included ? '' : 'opacity-40'
      }`}
    >
      <td className="px-1.5 py-1.5 max-w-[280px]">
        <div className="font-body-md font-semibold text-on-surface">
          {line.itemName}
        </div>
        {line.make && (
          <div className="font-label-sm text-on-surface-variant">{line.make}</div>
        )}
        {line.contributedBy.length > 1 && (
          <div className="text-label-sm text-on-surface-variant mt-0.5">
            Merged ({line.composeMode}) · {line.contributedBy.length} contributions
          </div>
        )}
        <div className="flex flex-wrap gap-0.5 mt-0.5 items-center">
          {line.contributedBy.length > 1 && onComposeModeChange && (
            <span className="flex items-center gap-0.5 mr-0.5">
              <span className="text-label-sm text-on-surface-variant">Merge</span>
              <button
                type="button"
                className={`px-1 py-px rounded font-label-sm ${
                  (overrideMode ?? line.composeMode) === 'max'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
                onClick={() =>
                  onComposeModeChange(
                    line.catalogItemId,
                    overrideMode === 'max' ? undefined : 'max'
                  )
                }
              >
                Max
              </button>
              <button
                type="button"
                className={`px-1 py-px rounded font-label-sm ${
                  (overrideMode ?? line.composeMode) === 'sum'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
                onClick={() =>
                  onComposeModeChange(
                    line.catalogItemId,
                    overrideMode === 'sum' ? undefined : 'sum'
                  )
                }
              >
                Sum
              </button>
            </span>
          )}
          <ScalingBadge scalingType={line.scalingType} />
          {line.applicabilityFiltered && (
            <span className="px-1 py-px rounded bg-surface-container-low text-on-surface-variant font-label-sm">
              Sync gated
            </span>
          )}
          {line.userExcluded && (
            <span className="px-1 py-px rounded bg-error-container/40 text-on-error-container font-label-sm">
              User excluded
            </span>
          )}
        </div>
      </td>
      <td className="px-1.5 py-1.5 text-right">
        <div className="font-body-md text-on-surface">
          {formatIndianGroup(Math.round(line.quantity))} {BOM_UOM_LABELS[line.uom]}
        </div>
      </td>
      <td className="px-1.5 py-1.5 text-right text-on-surface">
        ₹ {formatINR(line.rate)}
      </td>
      <td className="px-1.5 py-1.5 text-right text-on-surface-variant">
        {formatPercent(line.gstPercent)}
      </td>
      <td className="px-1.5 py-1.5 text-right text-on-surface">
        ₹ {formatINR(line.subtotal)}
      </td>
      <td className="px-1.5 py-1.5 text-right font-data-display text-on-surface">
        ₹ {formatINR(line.total)}
      </td>
    </tr>
  );
}

function ScopeBodyRow({
  item,
  overrideMode,
  onComposeModeChange,
}: {
  item: MaterializedScopeLine;
  overrideMode?: ComposeMode;
  onComposeModeChange?: (catalogItemId: string, mode: ComposeMode | undefined) => void;
}) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        item.included ? '' : 'opacity-40'
      }`}
    >
      <td className="px-1.5 py-1.5 max-w-[280px]">
        <div className="font-body-md font-semibold text-on-surface">
          {item.scopeName}
        </div>
        {item.contributedBy.length > 1 && (
          <div className="text-label-sm text-on-surface-variant mt-0.5">
            Merged ({item.composeMode}) · {item.contributedBy.length} contributions
          </div>
        )}
        <div className="flex flex-wrap gap-0.5 mt-0.5 items-center">
          {item.contributedBy.length > 1 && onComposeModeChange && (
            <span className="flex items-center gap-0.5 mr-0.5">
              <span className="text-label-sm text-on-surface-variant">Merge</span>
              <button
                type="button"
                className={`px-1 py-px rounded font-label-sm ${
                  (overrideMode ?? item.composeMode) === 'max'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
                onClick={() =>
                  onComposeModeChange(
                    item.catalogItemId,
                    overrideMode === 'max' ? undefined : 'max'
                  )
                }
              >
                Max
              </button>
              <button
                type="button"
                className={`px-1 py-px rounded font-label-sm ${
                  (overrideMode ?? item.composeMode) === 'sum'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
                onClick={() =>
                  onComposeModeChange(
                    item.catalogItemId,
                    overrideMode === 'sum' ? undefined : 'sum'
                  )
                }
              >
                Sum
              </button>
            </span>
          )}
          <ScalingBadge scalingType={item.scalingType} />
          {item.applicabilityFiltered && (
            <span className="px-1 py-px rounded bg-surface-container-low text-on-surface-variant font-label-sm">
              Sync gated
            </span>
          )}
          {item.userExcluded && (
            <span className="px-1 py-px rounded bg-error-container/40 text-on-error-container font-label-sm">
              User excluded
            </span>
          )}
        </div>
      </td>
      <td className="px-1.5 py-1.5 text-right font-body-md text-on-surface-variant">
        {PLACEHOLDER}
      </td>
      <td className="px-1.5 py-1.5 text-right font-body-md text-on-surface-variant">
        {PLACEHOLDER}
      </td>
      <td className="px-1.5 py-1.5 text-right text-on-surface-variant">
        {formatPercent(item.gstPercent)}
      </td>
      <td className="px-1.5 py-1.5 text-right text-on-surface">
        ₹ {formatINR(item.amount)}
      </td>
      <td className="px-1.5 py-1.5 text-right font-data-display text-on-surface">
        ₹ {formatINR(item.total)}
      </td>
    </tr>
  );
}

function ScalingBadge({ scalingType }: { scalingType: ScalingType }) {
  const label = SCALING_TYPE_LABELS[scalingType];
  return (
    <span className="px-1 py-px rounded bg-surface-container-low text-on-surface-variant font-label-sm">
      {label}
    </span>
  );
}
