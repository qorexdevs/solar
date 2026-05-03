import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  BOM_CATEGORIES,
  BOM_CATEGORY_LABELS,
  BOM_UOMS,
  BOM_UOM_LABELS,
  COMPOSE_MODE_LABELS,
  type BOMCategory,
  type BOMUom,
  type ComposeMode,
  type MaterialCatalogItem,
} from '@/types';
import { useCatalogStore } from '@/store/catalog';
import { uid } from '@/lib/uid';

const GST_OPTS = [0, 5, 12, 18, 28] as const;

type FilterStatus = 'all' | MaterialCatalogItem['status'];

/** Admin-style CRUD list for global material catalog items. */
export function CatalogAdmin() {
  const items = useCatalogStore((s) => s.items);
  const create = useCatalogStore((s) => s.create);
  const update = useCatalogStore((s) => s.update);
  const setStatus = useCatalogStore((s) => s.setStatus);

  const [categoryFilter, setCategoryFilter] = useState<BOMCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (!needle) return true;
      return (
        i.id.toLowerCase().includes(needle) ||
        i.name.toLowerCase().includes(needle) ||
        (i.description ?? '').toLowerCase().includes(needle)
      );
    });
  }, [items, categoryFilter, statusFilter, q]);

  function newItem() {
    const now = Date.now();
    create({
      id: uid('cat'),
      name: 'New catalog row',
      kind: 'bom',
      category: 'modules',
      uom: 'count',
      defaultRate: 0,
      gstPercent: 18,
      defaultComposeMode: 'max',
      notes: '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <div className="flex flex-col gap-lg max-w-[1200px]">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-sm">
          Material Catalog
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Canonical BOM + scope identifiers referenced by facet templates.
          Editing here updates defaults for newly materialized estimates.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-md">
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Search
          <input
            className="rounded border border-outline-variant bg-surface-container-low px-3 py-2 min-w-[200px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="id, name, description"
          />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Category
          <select
            className="rounded border border-outline-variant bg-surface-container-low px-3 py-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
          >
            <option value="all">All</option>
            {BOM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {BOM_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Status
          <select
            className="rounded border border-outline-variant bg-surface-container-low px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <Button variant="primary" iconLeft={<Icon name="add" />} onClick={newItem}>
          Add item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-body-sm font-body-sm">
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Kind</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">₹ rate / ₹ scope</th>
              <th className="px-2 py-2">GST%</th>
              <th className="px-2 py-2">Compose</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {visible.map((item) => (
              <CatalogRow
                key={item.id}
                item={item}
                onPatch={(patch) => update(item.id, patch)}
                onArchive={() =>
                  setStatus(item.id, item.status === 'archived' ? 'active' : 'archived')
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        {visible.length} of {items.length} items shown · Archived items remain in storage but composes skip them when present in templates using stale refs.
      </p>
    </div>
  );
}

function CatalogRow({
  item,
  onPatch,
  onArchive,
}: {
  item: MaterialCatalogItem;
  onPatch: (patch: Partial<MaterialCatalogItem>) => void;
  onArchive: () => void;
}) {
  return (
    <tr className="align-top hover:bg-surface-container-low/40">
      <td className="px-2 py-2 font-mono text-[11px] text-on-surface-variant break-all max-w-[120px]">
        {item.id}
      </td>
      <td className="px-2 py-2 max-w-[200px]">
        <input
          className="w-full rounded border border-outline-variant bg-surface-container-low px-1 py-1 mb-1"
          value={item.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        <textarea
          className="w-full rounded border border-outline-variant bg-surface-container-low px-1 py-1 text-[11px]"
          rows={2}
          placeholder="notes"
          value={item.description ?? ''}
          onChange={(e) => onPatch({ description: e.target.value || undefined })}
        />
      </td>
      <td className="px-2 py-2">
        <select
          className="rounded border border-outline-variant bg-surface-container-low px-1 py-1"
          value={item.kind}
          onChange={(e) =>
            onPatch({
              kind: e.target.value as MaterialCatalogItem['kind'],
            })
          }
        >
          <option value="bom">bom</option>
          <option value="scope">scope</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <select
          className="rounded border border-outline-variant bg-surface-container-low px-1 py-1"
          value={item.category}
          onChange={(e) => onPatch({ category: e.target.value as BOMCategory })}
        >
          {BOM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        {item.kind === 'bom' ? (
          <div className="flex flex-col gap-1">
            <select
              className="rounded border border-outline-variant bg-surface-container-low px-1 py-1"
              value={item.uom ?? 'count'}
              onChange={(e) => onPatch({ uom: e.target.value as BOMUom })}
            >
              {BOM_UOMS.map((u) => (
                <option key={u} value={u}>
                  {BOM_UOM_LABELS[u]}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="w-28 rounded border border-outline-variant px-1 py-1"
              value={item.defaultRate ?? 0}
              onChange={(e) => onPatch({ defaultRate: Number(e.target.value) })}
            />
          </div>
        ) : (
          <input
            type="number"
            className="w-28 rounded border border-outline-variant px-1 py-1"
            value={item.defaultAmount ?? 0}
            onChange={(e) => onPatch({ defaultAmount: Number(e.target.value) })}
          />
        )}
      </td>
      <td className="px-2 py-2">
        <select
          className="rounded border border-outline-variant bg-surface-container-low px-1 py-1"
          value={item.gstPercent}
          onChange={(e) => onPatch({ gstPercent: Number(e.target.value) })}
        >
          {GST_OPTS.map((g) => (
            <option key={g} value={g}>
              {g}%
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <select
          className="rounded border border-outline-variant bg-surface-container-low px-1 py-1"
          value={item.defaultComposeMode}
          onChange={(e) =>
            onPatch({
              defaultComposeMode: e.target.value as ComposeMode,
            })
          }
        >
          {(Object.entries(COMPOSE_MODE_LABELS) as [ComposeMode, string][]).map(
            ([key, lb]) => (
              <option key={key} value={key}>
                {lb}
              </option>
            )
          )}
        </select>
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1 items-start">
          <span
            className={`font-label-sm px-2 py-0.5 rounded ${
              item.status === 'active'
                ? 'bg-green-900/20 text-green-200'
                : 'bg-outline-variant text-on-surface-variant'
            }`}
          >
            {item.status}
          </span>
          <button
            type="button"
            className="text-label-sm text-primary hover:underline"
            onClick={onArchive}
          >
            {item.status === 'archived' ? 'Activate' : 'Archive'}
          </button>
        </div>
      </td>
    </tr>
  );
}
