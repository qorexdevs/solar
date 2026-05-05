/**
 * Combined catalog-backed line editor — replaces standalone Main BOM + Other Scope tables.
 */
import { Fragment } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SCALING_TYPE_LABELS, type ScenarioTemplate } from '@/types';
import { useCatalogStore } from '@/store/catalog';
import { useTemplateStore } from '@/store/templates';

type Props = { template: ScenarioTemplate; editable: boolean };

export function UnifiedLinesTable({ template, editable }: Props) {
  const catalogItems = useCatalogStore((s) => s.items);
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));

  const addTemplateLine = useTemplateStore((s) => s.addTemplateLine);
  const updateTemplateLine = useTemplateStore((s) => s.updateTemplateLine);
  const removeTemplateLine = useTemplateStore((s) => s.removeTemplateLine);

  const sorted = [...template.lines].sort((a, b) => a.sequence - b.sequence);

  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md flex-wrap">
        <h3 className="font-headline-md text-headline-md">
          BOM &amp; Scope lines ({sorted.length})
        </h3>
        {editable && (
          <div className="flex gap-md">
            <Button
              variant="outline"
              iconLeft={<Icon name="add" />}
              type="button"
              onClick={() =>
                addTemplateLine(template.id, {
                  scalingType: 'linear',
                  isOptional: false,
                  includedByDefault: true,
                  catalogItemId: 'cat-pv-module-540',
                  baseQuantity: 1,
                })
              }
            >
              Quick-add module line
            </Button>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          No catalog lines linked yet — add BOM or scope references from the catalog.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm font-body-sm text-left">
            <thead className="text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-1 py-1">Catalog</th>
                <th className="px-1 py-1">Kind</th>
                <th className="px-1 py-1">Qty / ₹</th>
                <th className="px-1 py-1">Scaling</th>
                <th className="px-1 py-1 w-28">GST %</th>
                <th className="px-1 py-1">Optional?</th>
                {editable && <th className="px-1 py-1"></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((line) => {
                const cat = catalogById.get(line.catalogItemId);
                const kindLabel = cat?.kind ?? '?';
                return (
                  <Fragment key={line.id}>
                    <tr className="border-b border-outline-variant/40 align-top">
                      <td className="px-1 py-1">
                        {editable ? (
                          <select
                            className="w-full rounded border border-outline-variant bg-surface-container-low px-0.5 py-0.5"
                            value={line.catalogItemId}
                            onChange={(e) =>
                              updateTemplateLine(template.id, line.id, {
                                catalogItemId: e.target.value,
                              })
                            }
                          >
                            {catalogItems.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{cat?.name ?? line.catalogItemId}</span>
                        )}
                      </td>
                      <td className="px-1 py-1">{kindLabel}</td>
                      <td className="px-1 py-1">
                        {editable ? (
                          <input
                            type="number"
                            className="w-28 rounded border border-outline-variant bg-surface-container-low px-0.5 py-0.5"
                            value={
                              cat?.kind === 'scope'
                                ? (line.baseAmount ?? cat.defaultAmount ?? 0)
                                : (line.baseQuantity ?? 0)
                            }
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (cat?.kind === 'scope') {
                                updateTemplateLine(template.id, line.id, {
                                  baseAmount: v,
                                  baseQuantity: undefined,
                                });
                              } else {
                                updateTemplateLine(template.id, line.id, {
                                  baseQuantity: v,
                                  baseAmount: undefined,
                                });
                              }
                            }}
                          />
                        ) : cat?.kind === 'scope' ? (
                          line.baseAmount ?? '—'
                        ) : (
                          line.baseQuantity ?? '—'
                        )}
                      </td>
                      <td className="px-1 py-1">
                        {editable ? (
                          <select
                            value={line.scalingType}
                            onChange={(e) =>
                              updateTemplateLine(template.id, line.id, {
                                scalingType: e.target.value as typeof line.scalingType,
                              })
                            }
                            className="rounded border border-outline-variant bg-surface-container-low px-0.5 py-0.5"
                          >
                            {Object.entries(SCALING_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          SCALING_TYPE_LABELS[line.scalingType]
                        )}
                      </td>
                      <td className="px-1 py-1">
                        {editable ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-outline-variant px-0.5 py-0.5"
                            value={
                              line.gstPercentOverride ??
                              cat?.gstPercent ??
                              18
                            }
                            onChange={(e) =>
                              updateTemplateLine(template.id, line.id, {
                                gstPercentOverride: Number(e.target.value),
                              })
                            }
                          />
                        ) : (
                          line.gstPercentOverride ?? cat?.gstPercent ?? '—'
                        )}
                      </td>
                      <td className="px-1 py-1">
                        {editable ? (
                          <label className="flex items-center gap-0.5">
                            <input
                              type="checkbox"
                              checked={line.isOptional}
                              onChange={(e) =>
                                updateTemplateLine(template.id, line.id, {
                                  isOptional: e.target.checked,
                                })
                              }
                            />
                          </label>
                        ) : (
                          line.isOptional ? 'yes' : 'no'
                        )}
                      </td>
                      {editable && (
                        <td className="px-1 py-1 text-right">
                          <button
                            type="button"
                            aria-label="Remove line"
                            className="p-0.5 text-error hover:bg-error/10 rounded"
                            onClick={() =>
                              removeTemplateLine(template.id, line.id)
                            }
                          >
                            <Icon name="delete" />
                          </button>
                        </td>
                      )}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
