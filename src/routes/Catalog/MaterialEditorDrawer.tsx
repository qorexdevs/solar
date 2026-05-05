import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  BOM_CATEGORIES,
  BOM_CATEGORY_LABELS,
  BOM_UOMS,
  BOM_UOM_LABELS,
  BUSINESS_MODEL_VALUES,
  COMPOSE_MODE_LABELS,
  MATERIAL_FACET_LABELS,
  MATERIAL_FACET_VALUE_LABELS,
  MONITORING_VALUES,
  MOUNTING_VALUES,
  VOLTAGE_CLASS_VALUES,
  type BOMCategory,
  type BOMUom,
  type BusinessModelValue,
  type ComposeMode,
  type MaterialCatalogItem,
  type MaterialFacetTags,
  type MonitoringValue,
  type MountingValue,
  type VoltageClassValue,
} from '@/types';
import { validateCatalogItem } from '@/lib/catalog';

const GST_OPTS = [0, 5, 12, 18, 28] as const;

type Props = {
  /** When non-null, the editor is open in edit mode for this item. */
  editing: MaterialCatalogItem | null;
  /** When true, opens in create mode with `seed` as the starting state. */
  creating: boolean;
  /** Initial values for create mode. */
  seed?: Partial<MaterialCatalogItem>;
  /** Effective derived facet tags (read-only) shown alongside explicit overrides. */
  derivedTags?: MaterialFacetTags;
  onClose: () => void;
  onSave: (item: MaterialCatalogItem) => void;
};

/**
 * Right-side drawer for creating + editing a single catalog item. Handles
 * all `MaterialCatalogItem` fields including the explicit facet-tag override
 * layer used by the hybrid filter.
 */
export function MaterialEditorDrawer({
  editing,
  creating,
  seed,
  derivedTags,
  onClose,
  onSave,
}: Props) {
  const open = creating || editing !== null;
  const [draft, setDraft] = useState<MaterialCatalogItem | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft({ ...editing });
    } else if (creating) {
      const now = Date.now();
      setDraft({
        id: '',
        name: '',
        kind: 'bom',
        category: 'modules',
        uom: 'count',
        defaultRate: 0,
        gstPercent: 18,
        defaultComposeMode: 'max',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...seed,
      } as MaterialCatalogItem);
    } else {
      setDraft(null);
    }
  }, [editing, creating, seed]);

  const issues = useMemo(
    () => (draft ? validateCatalogItem(draft) : []),
    [draft]
  );

  if (!open || !draft) return null;

  function patch(p: Partial<MaterialCatalogItem>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function patchTags(t: MaterialFacetTags) {
    patch({ facetTags: pruneTags(t) });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-scrim/50"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface-container-lowest h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-primary">
            {creating ? 'New material' : 'Edit material'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 px-lg py-md flex flex-col gap-md">
          <Section title="Identity">
            <Field label="Name *">
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="ID *" hint="Stable identifier — referenced by templates.">
              <input
                className={`${inputCls} font-mono text-[12px]`}
                value={draft.id}
                disabled={!creating}
                onChange={(e) => patch({ id: e.target.value })}
                placeholder={creating ? 'e.g. cat-pv-module-540' : ''}
              />
            </Field>
            <Field label="Description">
              <textarea
                className={inputCls}
                rows={3}
                value={draft.description ?? ''}
                onChange={(e) =>
                  patch({ description: e.target.value || undefined })
                }
              />
            </Field>
            <Field label="Make">
              <input
                className={inputCls}
                value={draft.make ?? ''}
                onChange={(e) => patch({ make: e.target.value || undefined })}
              />
            </Field>
            <Field
              label="Alternate makes"
              hint="One per line. Shown to estimators when the primary make isn't available."
            >
              <textarea
                className={inputCls}
                rows={2}
                value={(draft.altMakes ?? []).join('\n')}
                onChange={(e) =>
                  patch({
                    altMakes: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </Section>

          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-md">
              <Field label="Kind">
                <select
                  className={inputCls}
                  value={draft.kind}
                  onChange={(e) =>
                    patch({ kind: e.target.value as MaterialCatalogItem['kind'] })
                  }
                >
                  <option value="bom">Main BOM (qty × rate)</option>
                  <option value="scope">Other scope (lump-sum)</option>
                </select>
              </Field>
              <Field label="Category">
                <select
                  className={inputCls}
                  value={draft.category}
                  onChange={(e) =>
                    patch({ category: e.target.value as BOMCategory })
                  }
                >
                  {BOM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {BOM_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {draft.kind === 'bom' ? (
              <div className="grid grid-cols-2 gap-md">
                <Field label="UOM">
                  <select
                    className={inputCls}
                    value={draft.uom ?? 'count'}
                    onChange={(e) =>
                      patch({ uom: e.target.value as BOMUom })
                    }
                  >
                    {BOM_UOMS.map((u) => (
                      <option key={u} value={u}>
                        {BOM_UOM_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Default rate (₹)">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={draft.defaultRate ?? 0}
                    onChange={(e) =>
                      patch({ defaultRate: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            ) : (
              <Field label="Default amount (₹)">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={draft.defaultAmount ?? 0}
                  onChange={(e) =>
                    patch({ defaultAmount: Number(e.target.value) })
                  }
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-md">
              <Field label="GST %">
                <select
                  className={inputCls}
                  value={draft.gstPercent}
                  onChange={(e) =>
                    patch({ gstPercent: Number(e.target.value) })
                  }
                >
                  {GST_OPTS.map((g) => (
                    <option key={g} value={g}>
                      {g}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Compose mode"
                hint="When templates duplicate this material, max wins for redundant scope, sum for additive."
              >
                <select
                  className={inputCls}
                  value={draft.defaultComposeMode}
                  onChange={(e) =>
                    patch({
                      defaultComposeMode: e.target.value as ComposeMode,
                    })
                  }
                >
                  {(Object.entries(COMPOSE_MODE_LABELS) as [ComposeMode, string][]).map(
                    ([k, lb]) => (
                      <option key={k} value={k}>
                        {lb}
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>
          </Section>

          <Section
            title="Facet tags"
            hint="Explicit overrides. Combined with facet values derived from templates that reference this material."
          >
            <FacetTagsEditor
              value={draft.facetTags ?? {}}
              derived={derivedTags}
              onChange={patchTags}
            />
          </Section>

          <Section title="Notes">
            <textarea
              className={inputCls}
              rows={3}
              value={draft.notes ?? ''}
              onChange={(e) =>
                patch({ notes: e.target.value || undefined })
              }
            />
          </Section>
        </div>

        {issues.length > 0 && (
          <div className="px-lg pb-md">
            <div className="rounded-lg border border-error bg-error/10 px-md py-md text-body-sm font-body-sm text-on-surface">
              <strong>Fix before saving:</strong>
              <ul className="list-disc ml-3 mt-0.5">
                {issues.map((i) => (
                  <li key={`${i.path}-${i.message}`}>{i.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-md px-lg py-md border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={issues.length > 0}
            onClick={() => onSave({ ...draft, updatedAt: Date.now() })}
          >
            {creating ? 'Create material' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FacetTagsEditor({
  value,
  derived,
  onChange,
}: {
  value: MaterialFacetTags;
  derived?: MaterialFacetTags;
  onChange: (next: MaterialFacetTags) => void;
}) {
  return (
    <div className="flex flex-col gap-md">
      <FacetTagRow<MountingValue>
        label={MATERIAL_FACET_LABELS.mounting}
        options={MOUNTING_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.mounting}
        explicit={value.mounting ?? []}
        derived={derived?.mounting ?? []}
        onChange={(next) => onChange({ ...value, mounting: next })}
      />
      <FacetTagRow<VoltageClassValue>
        label={MATERIAL_FACET_LABELS.voltageClass}
        options={VOLTAGE_CLASS_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.voltageClass}
        explicit={value.voltageClass ?? []}
        derived={derived?.voltageClass ?? []}
        onChange={(next) => onChange({ ...value, voltageClass: next })}
      />
      <FacetTagRow<BusinessModelValue>
        label={MATERIAL_FACET_LABELS.businessModel}
        options={BUSINESS_MODEL_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.businessModel}
        explicit={value.businessModel ?? []}
        derived={derived?.businessModel ?? []}
        onChange={(next) => onChange({ ...value, businessModel: next })}
      />
      <FacetTagRow<MonitoringValue>
        label={MATERIAL_FACET_LABELS.monitoring}
        options={MONITORING_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.monitoring}
        explicit={value.monitoring ?? []}
        derived={derived?.monitoring ?? []}
        onChange={(next) => onChange({ ...value, monitoring: next })}
      />
    </div>
  );
}

function FacetTagRow<T extends string>({
  label,
  options,
  labels,
  explicit,
  derived,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  explicit: T[];
  derived: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(opt: T) {
    const next = explicit.includes(opt)
      ? explicit.filter((v) => v !== opt)
      : [...explicit, opt];
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
          {label}
        </span>
        {derived.length > 0 && (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            From templates: {derived.map((d) => labels[d as T]).join(', ')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-0.5">
        {options.map((opt) => {
          const active = explicit.includes(opt);
          const inferred = derived.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm border transition-colors ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : inferred
                    ? 'bg-surface-container text-on-surface border-dashed border-outline'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
              }`}
            >
              {labels[opt]}
              {inferred && !active ? ' ◦' : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pruneTags(tags: MaterialFacetTags): MaterialFacetTags | undefined {
  const out: MaterialFacetTags = {};
  if (tags.mounting && tags.mounting.length > 0) out.mounting = tags.mounting;
  if (tags.voltageClass && tags.voltageClass.length > 0)
    out.voltageClass = tags.voltageClass;
  if (tags.businessModel && tags.businessModel.length > 0)
    out.businessModel = tags.businessModel;
  if (tags.monitoring && tags.monitoring.length > 0)
    out.monitoring = tags.monitoring;
  return Object.keys(out).length > 0 ? out : undefined;
}

const inputCls =
  'w-full rounded border border-outline-variant bg-surface-container-low px-1 py-1 text-body-sm font-body-sm';

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-md">
        <h3 className="font-title-md text-title-md text-on-surface">{title}</h3>
        {hint && (
          <span className="text-body-sm font-body-sm text-on-surface-variant">
            {hint}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-md mt-0.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-label-sm text-label-sm text-on-surface-variant">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-on-surface-variant">{hint}</span>
      )}
    </label>
  );
}
