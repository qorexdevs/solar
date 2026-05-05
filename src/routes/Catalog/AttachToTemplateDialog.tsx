import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  MATERIAL_FACET_LABELS,
  MATERIAL_FACET_VALUE_LABELS,
  SCALING_TYPE_LABELS,
  SCALING_TYPES,
  TEMPLATE_STATUS_LABELS,
  type MaterialCatalogItem,
  type MaterialFacetTags,
  type ScalingType,
  type ScenarioTemplate,
} from '@/types';
import { useTemplateStore } from '@/store/templates';
import { inferTemplateFacetTags } from '@/lib/catalog';

type Props = {
  material: MaterialCatalogItem;
  templates: ScenarioTemplate[];
  /** Effective facet tags for the material — drives the relevance ranking. */
  effectiveTags: MaterialFacetTags;
  /** Set of templates that already include this material (rendered as "already attached"). */
  alreadyInTemplateIds: Set<string>;
  onClose: () => void;
};

type Defaults = {
  baseQuantity: number;
  baseAmount: number;
  scalingType: ScalingType;
  isOptional: boolean;
  includedByDefault: boolean;
};

/**
 * Material-centric attach: pick one or more templates, set per-line defaults,
 * and dispatch `addTemplateLine` once per pick. Already-attached templates
 * are shown but disabled (we never duplicate `catalogItemId` in one template).
 */
export function AttachToTemplateDialog({
  material,
  templates,
  effectiveTags,
  alreadyInTemplateIds,
  onClose,
}: Props) {
  const addTemplateLine = useTemplateStore((s) => s.addTemplateLine);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [defaults, setDefaults] = useState<Defaults>({
    baseQuantity: 1,
    baseAmount: material.defaultAmount ?? 0,
    scalingType: material.kind === 'bom' ? 'linear' : 'fixed',
    isOptional: false,
    includedByDefault: true,
  });

  const ranked = useMemo(
    () => rankTemplatesByRelevance(templates, effectiveTags),
    [templates, effectiveTags]
  );

  function toggle(id: string) {
    if (alreadyInTemplateIds.has(id)) return;
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  function attach() {
    for (const id of picked) {
      addTemplateLine(id, {
        catalogItemId: material.id,
        scalingType: defaults.scalingType,
        isOptional: defaults.isOptional,
        includedByDefault: defaults.includedByDefault,
        ...(material.kind === 'bom'
          ? { baseQuantity: defaults.baseQuantity }
          : { baseAmount: defaults.baseAmount }),
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-scrim/50 p-md"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Attach to template
            </h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Adds <strong>{material.name}</strong> as a new line in each
              selected template.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-lg py-md flex flex-col gap-md">
          <DefaultsRow
            material={material}
            defaults={defaults}
            onChange={setDefaults}
          />

          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Templates
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Sorted by relevance to this material's effective facets.
              Templates that already include this material are disabled.
            </p>
            <div className="rounded-lg border border-outline-variant divide-y divide-outline-variant overflow-hidden mt-0.5">
              {ranked.length === 0 && (
                <div className="px-md py-md text-body-sm font-body-sm text-on-surface-variant">
                  No templates exist yet.
                </div>
              )}
              {ranked.map(({ template, matched }) => {
                const already = alreadyInTemplateIds.has(template.id);
                const isPicked = picked.has(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={already}
                    onClick={() => toggle(template.id)}
                    className={`w-full text-left px-md py-md flex items-start gap-md transition-colors ${
                      already
                        ? 'opacity-50 cursor-not-allowed bg-surface-container-low'
                        : isPicked
                          ? 'bg-primary-container/40'
                          : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-3 w-3 items-center justify-center rounded border ${
                        isPicked
                          ? 'bg-primary border-primary text-on-primary'
                          : 'bg-surface-container-lowest border-outline-variant'
                      }`}
                    >
                      {isPicked && <Icon name="check" className="text-[10px]" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-md">
                        <span className="font-title-sm text-title-sm text-on-surface">
                          {template.name}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {TEMPLATE_STATUS_LABELS[template.status]} · {template.baseCapacityKW} kW base
                        </span>
                        {already && (
                          <span className="font-label-sm text-label-sm text-primary">
                            Already attached
                          </span>
                        )}
                      </div>
                      <FacetMatchChips matched={matched} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-md px-lg py-md border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={picked.size === 0}
            onClick={attach}
          >
            Attach to {picked.size} template{picked.size === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DefaultsRow({
  material,
  defaults,
  onChange,
}: {
  material: MaterialCatalogItem;
  defaults: Defaults;
  onChange: (next: Defaults) => void;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-md flex flex-col gap-md">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
        Line defaults applied to every selected template
      </span>
      <div className="grid grid-cols-2 gap-md">
        {material.kind === 'bom' ? (
          <Field label="Base quantity">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={defaults.baseQuantity}
              onChange={(e) =>
                onChange({ ...defaults, baseQuantity: Number(e.target.value) })
              }
            />
          </Field>
        ) : (
          <Field label="Base amount (₹)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={defaults.baseAmount}
              onChange={(e) =>
                onChange({ ...defaults, baseAmount: Number(e.target.value) })
              }
            />
          </Field>
        )}
        <Field label="Scaling">
          <select
            className={inputCls}
            value={defaults.scalingType}
            onChange={(e) =>
              onChange({ ...defaults, scalingType: e.target.value as ScalingType })
            }
          >
            {SCALING_TYPES.map((s) => (
              <option key={s} value={s}>
                {SCALING_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-md">
        <label className="flex items-center gap-0.5 font-label-sm text-label-sm text-on-surface">
          <input
            type="checkbox"
            checked={defaults.isOptional}
            onChange={(e) =>
              onChange({ ...defaults, isOptional: e.target.checked })
            }
          />
          Optional line
        </label>
        <label className="flex items-center gap-0.5 font-label-sm text-label-sm text-on-surface">
          <input
            type="checkbox"
            checked={defaults.includedByDefault}
            onChange={(e) =>
              onChange({ ...defaults, includedByDefault: e.target.checked })
            }
          />
          Included by default
        </label>
      </div>
    </div>
  );
}

function FacetMatchChips({ matched }: { matched: MaterialFacetTags }) {
  const entries = (Object.entries(matched) as [keyof MaterialFacetTags, string[]][]).filter(
    ([, v]) => v && v.length > 0
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {entries.flatMap(([facet, vals]) =>
        vals.map((v) => (
          <span
            key={`${facet}-${v}`}
            className="px-1 py-px rounded-full font-label-sm text-label-sm bg-primary-container/30 text-on-surface"
          >
            {MATERIAL_FACET_LABELS[facet]}:{' '}
            {(MATERIAL_FACET_VALUE_LABELS[facet] as Record<string, string>)[v]}
          </span>
        ))
      )}
    </div>
  );
}

function rankTemplatesByRelevance(
  templates: ScenarioTemplate[],
  effective: MaterialFacetTags
): { template: ScenarioTemplate; matched: MaterialFacetTags; score: number }[] {
  const ranked = templates.map((template) => {
    const tplTags = inferTemplateFacetTags(template);
    const matched: MaterialFacetTags = {};
    let score = 0;
    for (const key of Object.keys(tplTags) as (keyof MaterialFacetTags)[]) {
      const tplVals = (tplTags[key] ?? []) as string[];
      const effVals = (effective[key] ?? []) as string[];
      const hits = tplVals.filter((v) => effVals.includes(v));
      if (hits.length > 0) {
        score += hits.length;
        (matched as Record<keyof MaterialFacetTags, string[]>)[key] = hits;
      }
    }
    if (template.status === 'active') score += 0.5;
    return { template, matched, score };
  });
  ranked.sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
  return ranked;
}

const inputCls =
  'w-full rounded border border-outline-variant bg-surface-container-lowest px-1 py-1 text-body-sm font-body-sm';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-label-sm text-label-sm text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
