import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { validateTemplate } from '@/lib/templates';
import { totalsAtDefaultSelections } from '@/lib/templates/previewAtDefaults';
import { useCatalogStore } from '@/store/catalog';
import { selectFacetsSorted, useFacetStore } from '@/store/facets';
import { useTemplateStore } from '@/store/templates';
import {
  TEMPLATE_STATUSES,
  TEMPLATE_STATUS_LABELS,
  type ScenarioTemplate,
  type TemplateStatus,
} from '@/types';

type Props = {
  template: ScenarioTemplate;
  editable: boolean;
};

export function TemplateSummary({ template, editable }: Props) {
  const setStatus = useTemplateStore((s) => s.setStatus);
  const bumpVersion = useTemplateStore((s) => s.bumpVersion);
  const update = useTemplateStore((s) => s.update);
  const allTemplates = useTemplateStore((s) => s.templates);
  const facets = useFacetStore(selectFacetsSorted);
  const catalogItems = useCatalogStore((s) => s.items);

  const issues = useMemo(() => validateTemplate(template), [template]);

  const totals = useMemo(
    () =>
      totalsAtDefaultSelections({
        template,
        facets,
        allTemplates,
        catalogItems,
      }),
    [template, facets, allTemplates, catalogItems]
  );

  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h3 className="font-headline-md text-headline-md">Base totals @ defaults</h3>
        <div className="flex items-center gap-md">
          {editable ? (
            <>
              <select
                value={template.status}
                onChange={(e) =>
                  setStatus(template.id, e.target.value as TemplateStatus)
                }
                className="rounded border border-outline bg-surface-container-low px-1 py-0.5 text-body-sm"
              >
                {TEMPLATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TEMPLATE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                iconLeft={<Icon name="auto_awesome_motion" />}
                onClick={() => bumpVersion(template.id)}
                title="Bump version + set effective date to now"
              >
                Bump version
              </Button>
            </>
          ) : (
            <StatusTag status={template.status} />
          )}
        </div>
      </div>

      {totals ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-md">
          <Stat label="Main BOM" value={`₹ ${formatINR(totals.mainBomSubtotal)}`} />
          <Stat label="Main GST" value={`₹ ${formatINR(totals.mainBomGst)}`} />
          <Stat
            label="Other Scope"
            value={`₹ ${formatINR(totals.otherScopeSubtotal)}`}
          />
          <Stat label="Other GST" value={`₹ ${formatINR(totals.otherScopeGst)}`} />
          <Stat label="Grand total" value={`₹ ${formatINR(totals.grandTotal)}`} accent />
          <Stat
            label={`Per kW @ ${formatPlantCapacityKW(template.baseCapacityKW)}`}
            value={`₹ ${formatINR(totals.perKwRate)}`}
          />
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Totals unavailable — fix catalog links / validation issues.
        </p>
      )}

      {issues.length > 0 && (
        <div className="rounded border border-error/40 bg-error/5 p-md">
          <div className="flex items-center gap-0.5 text-error font-label-sm">
            <Icon name="error" className="text-base" />
            <span>{issues.length} validation issue(s)</span>
          </div>
          <ul className="mt-0.5 text-body-sm text-on-surface-variant list-disc pl-2.5">
            {issues.slice(0, 8).map((i, idx) => (
              <li key={idx}>
                <code className="text-on-surface">{i.path}</code>: {i.message}
              </li>
            ))}
            {issues.length > 8 && <li>… and {issues.length - 8} more</li>}
          </ul>
        </div>
      )}

      <details className="text-body-sm text-on-surface-variant">
        <summary className="cursor-pointer">Notes / description</summary>
        {editable ? (
          <textarea
            rows={3}
            className="w-full mt-1 rounded border border-outline-variant bg-surface-container-lowest px-1 py-0.5 text-on-surface"
            value={template.description ?? ''}
            onChange={(e) =>
              update(template.id, { description: e.target.value || undefined })
            }
            placeholder="Free-form notes about this scenario template."
          />
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-body-md text-on-surface">
            {template.description?.trim()
              ? template.description
              : 'No notes for this template.'}
          </p>
        )}
      </details>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded p-md ${
        accent
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-low text-on-surface'
      }`}
    >
      <div
        className={`text-label-sm font-label-sm uppercase tracking-wide ${
          accent ? 'opacity-80' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </div>
      <div className="text-headline-sm font-headline-sm mt-0.5">{value}</div>
    </div>
  );
}
