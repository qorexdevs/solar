import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import {
  BOM_CATEGORIES,
  BOM_CATEGORY_LABELS,
  BOM_UOM_LABELS,
  MATERIAL_FACET_LABELS,
  MATERIAL_FACET_VALUE_LABELS,
  type BOMCategory,
  type MaterialCatalogItem,
  type MaterialFacetTags,
} from '@/types';
import { useCatalogStore } from '@/store/catalog';
import { useTemplateStore } from '@/store/templates';
import {
  computeFacetMembership,
  computeMaterialUsage,
  isEmptyFacetFilter,
  matchesFacetFilter,
  type MaterialUsage,
} from '@/lib/catalog';
import { uid } from '@/lib/uid';
import { formatINR } from '@/lib/format';
import { FacetFilterBar } from './FacetFilterBar';
import { MaterialEditorDrawer } from './MaterialEditorDrawer';
import { AttachToTemplateDialog } from './AttachToTemplateDialog';
import {
  BomImportDialog,
  type BomImportApply,
} from './BomImportDialog';

type FilterStatus = 'all' | MaterialCatalogItem['status'];

/**
 * Material Catalog admin — full-featured CRUD with hybrid facet filtering,
 * bulk actions, material-centric template attach, and Excel/CSV BOM import.
 */
export function CatalogAdmin() {
  const items = useCatalogStore((s) => s.items);
  const create = useCatalogStore((s) => s.create);
  const update = useCatalogStore((s) => s.update);
  const setStatus = useCatalogStore((s) => s.setStatus);
  const bulkSetStatus = useCatalogStore((s) => s.bulkSetStatus);
  const safeRemove = useCatalogStore((s) => s.safeRemove);
  const duplicate = useCatalogStore((s) => s.duplicate);

  const templates = useTemplateStore((s) => s.templates);

  const [categoryFilter, setCategoryFilter] = useState<BOMCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [facetFilter, setFacetFilter] = useState<MaterialFacetTags>({});
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<MaterialCatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [attaching, setAttaching] = useState<MaterialCatalogItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [usagePopoverFor, setUsagePopoverFor] = useState<string | null>(null);

  const usage = useMemo(
    () => computeMaterialUsage(items, templates),
    [items, templates]
  );
  const effectiveTags = useMemo(
    () => computeFacetMembership(items, templates),
    [items, templates]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (!isEmptyFacetFilter(facetFilter)) {
        const eff = effectiveTags.get(i.id) ?? {};
        if (!matchesFacetFilter(eff, facetFilter)) return false;
      }
      if (!needle) return true;
      return (
        i.id.toLowerCase().includes(needle) ||
        i.name.toLowerCase().includes(needle) ||
        (i.description ?? '').toLowerCase().includes(needle) ||
        (i.make ?? '').toLowerCase().includes(needle)
      );
    });
  }, [items, categoryFilter, statusFilter, facetFilter, q, effectiveTags]);

  function resetFilters() {
    setCategoryFilter('all');
    setStatusFilter('active');
    setFacetFilter({});
    setQ('');
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAllVisible() {
    const next = new Set(selected);
    visible.forEach((v) => next.add(v.id));
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function bulkArchive() {
    bulkSetStatus([...selected], 'archived');
    clearSelection();
  }

  function bulkActivate() {
    bulkSetStatus([...selected], 'active');
    clearSelection();
  }

  function bulkDelete() {
    const ids = [...selected];
    const blocked: string[] = [];
    for (const id of ids) {
      const refs = usage.get(id)?.count ?? 0;
      const r = safeRemove(id, refs);
      if (!r.ok && r.reason === 'in_use') blocked.push(id);
    }
    if (blocked.length > 0) {
      const names = blocked
        .map((id) => items.find((i) => i.id === id)?.name ?? id)
        .join(', ');
      alert(
        `${blocked.length} material(s) are referenced by templates and were not deleted: ${names}. Archive them, or remove their template lines first.`
      );
    }
    clearSelection();
  }

  function deleteOne(item: MaterialCatalogItem) {
    const refs = usage.get(item.id)?.count ?? 0;
    if (refs > 0) {
      alert(
        `Cannot delete: "${item.name}" is referenced by ${refs} template line(s). Archive it instead, or remove the references first.`
      );
      return;
    }
    if (!confirm(`Permanently delete "${item.name}"?`)) return;
    safeRemove(item.id, 0);
  }

  function applyImport(changes: BomImportApply) {
    for (const d of changes.decisions) {
      if (d.action === 'skip') continue;
      if (d.action === 'create') {
        create(d.newItem);
      } else {
        update(d.existingId, d.patch);
      }
    }
    setImporting(false);
  }

  return (
    <div className="flex flex-col gap-xl max-w-[1400px]">
      <header>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-md">
          Material Catalog
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Canonical BOM + scope identifiers referenced by facet templates.
          Filter by facets to find materials that belong to specific
          contexts (rooftop + HT, captive monitoring, etc.). Edits affect
          defaults for newly materialized estimates.
        </p>
      </header>

      <div className="flex gap-xl items-start">
        <aside className="w-[260px] sticky top-2 self-start flex flex-col gap-lg rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-md">
          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Search
            </span>
            <input
              className="w-full rounded border border-outline-variant bg-surface-container-low px-1 py-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="id, name, make…"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Status
            </span>
            <div className="flex gap-0.5">
              {(['active', 'archived', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 px-1 py-1 rounded font-label-sm text-label-sm border transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Category
            </span>
            <select
              className="w-full rounded border border-outline-variant bg-surface-container-low px-1 py-1"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as typeof categoryFilter)
              }
            >
              <option value="all">All</option>
              {BOM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {BOM_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <FacetFilterBar value={facetFilter} onChange={setFacetFilter} />
          <button
            type="button"
            onClick={resetFilters}
            className="text-label-sm font-label-sm text-primary hover:underline self-start"
          >
            Reset filters
          </button>
        </aside>

        <main className="flex-1 flex flex-col gap-md">
          <div className="flex flex-wrap items-center gap-md">
            <Button
              variant="primary"
              iconLeft={<Icon name="add" />}
              onClick={() => setCreating(true)}
            >
              Add material
            </Button>
            <Button
              variant="outline"
              iconLeft={<Icon name="upload_file" />}
              onClick={() => setImporting(true)}
            >
              Import BOM…
            </Button>
            <div className="flex-1" />
            {selected.size > 0 && (
              <div className="flex items-center gap-md rounded-lg border border-outline-variant bg-surface-container-low px-md py-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  onClick={bulkArchive}
                  className="font-label-sm text-label-sm text-primary hover:underline"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={bulkActivate}
                  className="font-label-sm text-label-sm text-primary hover:underline"
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={bulkDelete}
                  className="font-label-sm text-label-sm text-error hover:underline"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="font-label-sm text-label-sm text-on-surface-variant hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <table className="w-full text-left text-body-sm font-body-sm">
              <thead className="bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th className="px-1 py-1 w-6">
                    <input
                      type="checkbox"
                      aria-label="Select all visible"
                      checked={
                        visible.length > 0 &&
                        visible.every((v) => selected.has(v.id))
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAllVisible() : clearSelection()
                      }
                    />
                  </th>
                  <th className="px-1 py-1">Material</th>
                  <th className="px-1 py-1">Pricing</th>
                  <th className="px-1 py-1">Facets</th>
                  <th className="px-1 py-1">Used in</th>
                  <th className="px-1 py-1">Status</th>
                  <th className="px-1 py-1 w-3xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {visible.map((item) => (
                  <MaterialRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    usage={usage.get(item.id) ?? { templateIds: [], count: 0 }}
                    effectiveTags={effectiveTags.get(item.id) ?? {}}
                    onEdit={() => setEditing(item)}
                    onDuplicate={() => {
                      const copy = duplicate(item.id);
                      if (copy) setEditing(copy);
                    }}
                    onAttach={() => setAttaching(item)}
                    onArchiveToggle={() =>
                      setStatus(
                        item.id,
                        item.status === 'archived' ? 'active' : 'archived'
                      )
                    }
                    onDelete={() => deleteOne(item)}
                    onShowUsage={() =>
                      setUsagePopoverFor(
                        usagePopoverFor === item.id ? null : item.id
                      )
                    }
                    showUsagePopover={usagePopoverFor === item.id}
                    templateLookup={templates}
                  />
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-md py-2xl text-center">
                      <div className="text-body-md text-on-surface-variant">
                        No materials match the current filters.
                      </div>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-0.5 text-label-sm font-label-sm text-primary hover:underline"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant">
            <span>
              {visible.length} of {items.length} items shown
            </span>
            <span>
              Hard delete is blocked when a material is referenced by any
              template; archive instead.
            </span>
          </div>
        </main>
      </div>

      {(editing || creating) && (
        <MaterialEditorDrawer
          editing={editing}
          creating={creating}
          seed={
            creating
              ? {
                  id: uid('cat'),
                  name: 'New material',
                }
              : undefined
          }
          derivedTags={
            editing ? effectiveTags.get(editing.id) ?? {} : undefined
          }
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(item) => {
            if (creating) {
              create(item);
            } else {
              update(item.id, item);
            }
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {attaching && (
        <AttachToTemplateDialog
          material={attaching}
          templates={templates}
          effectiveTags={effectiveTags.get(attaching.id) ?? {}}
          alreadyInTemplateIds={
            new Set(usage.get(attaching.id)?.templateIds ?? [])
          }
          onClose={() => setAttaching(null)}
        />
      )}

      {importing && (
        <BomImportDialog
          catalog={items}
          onClose={() => setImporting(false)}
          onApply={applyImport}
        />
      )}
    </div>
  );
}

function MaterialRow({
  item,
  selected,
  onToggleSelect,
  usage,
  effectiveTags,
  onEdit,
  onDuplicate,
  onAttach,
  onArchiveToggle,
  onDelete,
  onShowUsage,
  showUsagePopover,
  templateLookup,
}: {
  item: MaterialCatalogItem;
  selected: boolean;
  onToggleSelect: () => void;
  usage: MaterialUsage;
  effectiveTags: MaterialFacetTags;
  onEdit: () => void;
  onDuplicate: () => void;
  onAttach: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onShowUsage: () => void;
  showUsagePopover: boolean;
  templateLookup: ReturnType<typeof useTemplateStore.getState>['templates'];
}) {
  const explicit = item.facetTags ?? {};
  return (
    <tr className="align-top hover:bg-surface-container-low/40">
      <td className="px-1 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${item.name}`}
        />
      </td>
      <td className="px-1 py-1 max-w-[260px]">
        <button
          type="button"
          onClick={onEdit}
          className="text-left font-title-sm text-title-sm text-on-surface hover:underline"
        >
          {item.name}
        </button>
        <div className="font-mono text-[11px] text-on-surface-variant break-all">
          {item.id}
        </div>
        {item.description && (
          <div className="text-[12px] text-on-surface-variant line-clamp-2 mt-0.5">
            {item.description}
          </div>
        )}
        <div className="flex flex-wrap gap-0.5 mt-0.5">
          <span className="px-1 py-px rounded font-label-sm text-label-sm bg-surface-container-low text-on-surface-variant">
            {item.kind}
          </span>
          <span className="px-1 py-px rounded font-label-sm text-label-sm bg-surface-container-low text-on-surface-variant">
            {BOM_CATEGORY_LABELS[item.category]}
          </span>
          {item.make && (
            <span className="px-1 py-px rounded font-label-sm text-label-sm bg-surface-container-low text-on-surface-variant">
              {item.make}
            </span>
          )}
        </div>
      </td>
      <td className="px-1 py-1 whitespace-nowrap">
        {item.kind === 'bom' ? (
          <div className="flex flex-col gap-0.5">
            <span>
              {formatINR(item.defaultRate ?? 0)}{' '}
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                / {item.uom ? BOM_UOM_LABELS[item.uom] : '—'}
              </span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              GST {item.gstPercent}% · {item.defaultComposeMode}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span>{formatINR(item.defaultAmount ?? 0)}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              GST {item.gstPercent}% · {item.defaultComposeMode}
            </span>
          </div>
        )}
      </td>
      <td className="px-1 py-1 max-w-[220px]">
        <FacetChipList effective={effectiveTags} explicit={explicit} />
      </td>
      <td className="px-1 py-1 relative">
        <button
          type="button"
          onClick={onShowUsage}
          className={`px-1 py-px rounded font-label-sm text-label-sm transition-colors ${
            usage.count > 0
              ? 'bg-primary-container/40 text-on-surface hover:bg-primary-container/60'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          {usage.count} ref{usage.count === 1 ? '' : 's'} · {usage.templateIds.length} tpl
        </button>
        {showUsagePopover && usage.templateIds.length > 0 && (
          <div className="absolute z-10 mt-0.5 right-0 w-[260px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg p-md text-body-sm font-body-sm">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-0.5">
              Used in templates
            </div>
            <ul className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
              {usage.templateIds.map((tid) => {
                const t = templateLookup.find((x) => x.id === tid);
                return (
                  <li key={tid} className="text-on-surface">
                    {t ? t.name : tid}
                    {t && (
                      <span className="ml-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        · {t.status}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </td>
      <td className="px-1 py-1">
        <StatusTag status={item.status} />
      </td>
      <td className="px-1 py-1">
        <RowActions
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onAttach={onAttach}
          onArchiveToggle={onArchiveToggle}
          isArchived={item.status === 'archived'}
          onDelete={onDelete}
          deleteBlocked={usage.count > 0}
        />
      </td>
    </tr>
  );
}

function FacetChipList({
  effective,
  explicit,
}: {
  effective: MaterialFacetTags;
  explicit: MaterialFacetTags;
}) {
  const facets = Object.keys(MATERIAL_FACET_LABELS) as (keyof MaterialFacetTags)[];
  const chips: { key: string; label: string; explicit: boolean }[] = [];
  for (const f of facets) {
    const vals = (effective[f] ?? []) as string[];
    const explicitSet = new Set((explicit[f] ?? []) as string[]);
    for (const v of vals) {
      const labels = MATERIAL_FACET_VALUE_LABELS[f] as Record<string, string>;
      chips.push({
        key: `${f}-${v}`,
        label: `${MATERIAL_FACET_LABELS[f]}: ${labels[v] ?? v}`,
        explicit: explicitSet.has(v),
      });
    }
  }
  if (chips.length === 0) {
    return (
      <span className="text-[11px] text-on-surface-variant italic">
        No facet membership yet
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-0.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`px-1 py-px rounded-full font-label-sm text-label-sm border ${
            c.explicit
              ? 'bg-primary-container/40 border-primary-container text-on-surface'
              : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
          }`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function RowActions({
  onEdit,
  onDuplicate,
  onAttach,
  onArchiveToggle,
  isArchived,
  onDelete,
  deleteBlocked,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onAttach: () => void;
  onArchiveToggle: () => void;
  isArchived: boolean;
  onDelete: () => void;
  deleteBlocked: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-0.5">
      <IconBtn name="edit" label="Edit" onClick={onEdit} />
      <IconBtn name="content_copy" label="Duplicate" onClick={onDuplicate} />
      <IconBtn name="link" label="Attach to template" onClick={onAttach} />
      <IconBtn
        name={isArchived ? 'unarchive' : 'archive'}
        label={isArchived ? 'Activate' : 'Archive'}
        onClick={onArchiveToggle}
      />
      <IconBtn
        name="delete"
        label={deleteBlocked ? 'Cannot delete (in use)' : 'Delete'}
        onClick={onDelete}
        danger
        disabled={deleteBlocked}
      />
    </div>
  );
}

function IconBtn({
  name,
  label,
  onClick,
  danger,
  disabled,
}: {
  name: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`p-0.5 rounded hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-error' : 'text-on-surface-variant'
      }`}
    >
      <Icon name={name} />
    </button>
  );
}
