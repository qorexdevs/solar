import { Fragment, useMemo } from 'react';
import {
  BOM_CATEGORIES,
  BOM_UOM_LABELS,
  type BOMCategory,
  type MaterializedBOM,
  type MaterializedLine,
  type MaterializedScopeLine,
} from '@/types';
import { formatINR, formatIndianGroup, formatPercent } from '@/lib/format';
import { capexBreakdown, OTHER_SCOPE_GROUP_LABEL } from '@/lib/calc';

type Props = {
  materialized: MaterializedBOM;
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
export function CostBreakdownPanel({ materialized }: Props) {
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
    <div className="flex flex-col gap-md">
      <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-md">
            <thead>
              <tr className="text-left text-on-surface-variant bg-surface-container-low/20 border-b border-outline-variant/30">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate (₹)</th>
                <th className="px-3 py-2 text-right">GST</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">Total</th>
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
                      <td colSpan={6} className="px-md py-sm">
                        <div className="flex items-center justify-between gap-sm flex-wrap">
                          <div className="flex items-center gap-sm flex-wrap">
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
                          <ScopeBodyRow key={item.id} item={item} />
                        ))
                      : mainLines.map((line) => (
                          <MainBodyRow key={line.id} line={line} />
                        ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-md flex flex-col gap-1 border border-outline-variant/30">
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
        <div className="flex justify-between items-center pt-1 border-t border-outline-variant/30 mt-1">
          <span className="font-body-md text-on-surface">Grand total</span>
          <span className="font-data-display text-data-display text-primary">
            ₹ {formatINR(breakdown.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MainBodyRow({ line }: { line: MaterializedLine }) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        line.included ? '' : 'opacity-40'
      }`}
    >
      <td className="px-3 py-3 max-w-[280px]">
        <div className="font-body-md font-semibold text-on-surface">
          {line.itemName}
        </div>
        {line.make && (
          <div className="font-label-sm text-on-surface-variant">{line.make}</div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <ScalingBadge line={line} />
          {line.applicabilityFiltered && (
            <span className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm">
              Sync gated
            </span>
          )}
          {line.userExcluded && (
            <span className="px-2 py-0.5 rounded bg-error-container/40 text-on-error-container font-label-sm">
              User excluded
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="font-body-md text-on-surface">
          {formatIndianGroup(Math.round(line.quantity))} {BOM_UOM_LABELS[line.uom]}
        </div>
      </td>
      <td className="px-3 py-3 text-right text-on-surface">
        ₹ {formatINR(line.rate)}
      </td>
      <td className="px-3 py-3 text-right text-on-surface-variant">
        {formatPercent(line.gstPercent)}
      </td>
      <td className="px-3 py-3 text-right text-on-surface">
        ₹ {formatINR(line.subtotal)}
      </td>
      <td className="px-3 py-3 text-right font-data-display text-on-surface">
        ₹ {formatINR(line.total)}
      </td>
    </tr>
  );
}

function ScopeBodyRow({ item }: { item: MaterializedScopeLine }) {
  return (
    <tr
      className={`border-b border-outline-variant/20 align-top ${
        item.included ? '' : 'opacity-40'
      }`}
    >
      <td className="px-3 py-3 max-w-[280px]">
        <div className="font-body-md font-semibold text-on-surface">
          {item.scopeName}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm">
            {item.scalingType}
          </span>
          {item.applicabilityFiltered && (
            <span className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm">
              Sync gated
            </span>
          )}
          {item.userExcluded && (
            <span className="px-2 py-0.5 rounded bg-error-container/40 text-on-error-container font-label-sm">
              User excluded
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right font-body-md text-on-surface-variant">
        {PLACEHOLDER}
      </td>
      <td className="px-3 py-3 text-right font-body-md text-on-surface-variant">
        {PLACEHOLDER}
      </td>
      <td className="px-3 py-3 text-right text-on-surface-variant">
        {formatPercent(item.gstPercent)}
      </td>
      <td className="px-3 py-3 text-right text-on-surface">
        ₹ {formatINR(item.amount)}
      </td>
      <td className="px-3 py-3 text-right font-data-display text-on-surface">
        ₹ {formatINR(item.total)}
      </td>
    </tr>
  );
}

function ScalingBadge({ line }: { line: MaterializedLine }) {
  const label = (() => {
    switch (line.scalingType) {
      case 'fixed':
        return 'fixed';
      case 'linear':
        return 'linear';
      case 'step':
        return 'step';
      case 'conditional':
        return 'conditional';
      case 'optional':
        return 'optional';
    }
  })();
  return (
    <span className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm">
      {label}
    </span>
  );
}
