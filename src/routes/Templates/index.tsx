import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { totalsAtDefaultSelections } from '@/lib/templates/previewAtDefaults';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPE_LABELS,
  TEMPLATE_STATUSES,
  TEMPLATE_STATUS_LABELS,
  type ScenarioTemplate,
  type TemplateStatus,
} from '@/types';
import { defaultSelectionsFromFacets } from '@/lib/estimate';
import { uid } from '@/lib/uid';
import { MOUNTING_FACET_ID, VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';
import { useCatalogStore } from '@/store/catalog';
import { selectFacetsSorted, useFacetStore } from '@/store/facets';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';

export function TemplateList() {
  const navigate = useNavigate();
  const templates = useTemplateStore((s) => s.templates);
  const facetsSorted = useFacetStore(selectFacetsSorted);
  const facetsById = useMemo(() => Object.fromEntries(facetsSorted.map((f) => [f.id, f])), [facetsSorted]);
  const catalogItems = useCatalogStore((s) => s.items);
  const removeTemplate = useTemplateStore((s) => s.remove);
  const duplicateTemplate = useTemplateStore((s) => s.duplicate);
  const setStatus = useTemplateStore((s) => s.setStatus);
  const createTemplate = useTemplateStore((s) => s.create);
  const createFromSelections = useEstimateStore((s) => s.createFromSelections);

  const [filter, setFilter] = useState<'all' | TemplateStatus>('all');
  const [facetFilter, setFacetFilter] = useState<string | 'all'>('all');

  const visible = useMemo(() => {
    let list =
      filter === 'all' ? templates : templates.filter((t) => t.status === filter);
    if (facetFilter !== 'all') list = list.filter((t) => t.facetId === facetFilter);
    return [...list].sort((a, b) => {
      const fa = facetsById[a.facetId]?.sequence ?? 999;
      const fb = facetsById[b.facetId]?.sequence ?? 999;
      return fa !== fb ? fa - fb : a.name.localeCompare(b.name);
    });
  }, [templates, filter, facetFilter, facetsById]);

  function handleNewTemplate() {
    const now = Date.now();
    const defaultFacet =
      facetsSorted.find((f) => f.id === MOUNTING_FACET_ID) ?? facetsSorted[0];

    const t: ScenarioTemplate = {
      id: uid('tpl'),
      facetId: defaultFacet?.id ?? 'mounting',
      name: 'New scenario template',
      baseCapacityKW: 1000,
      syncType: undefined,
      projectType: undefined,
      status: 'draft',
      version: 'v1',
      effectiveFrom: now,
      description: '',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      lines: [],
    };
    createTemplate(t);
    navigate(`/templates/${t.id}`, { state: { editableOnOpen: true } });
  }

  function handleGenerateEstimate(template: ScenarioTemplate) {
    const tplById = new Map(useTemplateStore.getState().templates.map((x) => [x.id, x]));
    const selections = defaultSelectionsFromFacets(facetsSorted, tplById);
    selections[template.facetId] = {
      templateId: template.id,
      selectedVersion: template.version,
    };
    const estimate = createFromSelections({
      selections,
      targetCapacityKW: template.baseCapacityKW,
    });
    navigate(`/estimates/${estimate.id}/edit`);
  }

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-md">
        <h1 className="font-headline-xl text-headline-xl text-primary">
          Scenario Templates
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Templates are curated per facet (mounting, business model, voltage class, monitoring).
          An estimate merges one picked template per facet through the{' '}
          <strong className="text-on-surface">material catalog composer</strong>.{' '}
          <button
            type="button"
            className="text-primary underline hover:no-underline"
            onClick={() => navigate('/catalog')}
          >
            Manage catalog →
          </button>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-md justify-between">
        <div className="flex flex-wrap items-center gap-md">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Status
          </label>
          <select
            className="rounded border border-outline bg-surface-container-low px-1.5 py-1 font-body-sm text-body-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | TemplateStatus)}
          >
            <option value="all">All ({templates.length})</option>
            {TEMPLATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TEMPLATE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="font-label-sm text-label-sm text-on-surface-variant ml-lg">
            Facet
          </label>
          <select
            className="rounded border border-outline bg-surface-container-low px-1.5 py-1 font-body-sm text-body-sm"
            value={facetFilter}
            onChange={(e) => setFacetFilter(e.target.value)}
          >
            <option value="all">All facets</option>
            {facetsSorted.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          onClick={handleNewTemplate}
          iconLeft={<Icon name="add" filled />}
        >
          New Template
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-xl text-center text-on-surface-variant">
          <p>
            No templates {filter === 'all' ? '' : `with status “${filter}”`}{' '}
            {facetFilter === 'all' ? '' : 'for this facet '}
            yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-left text-body-sm font-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-lg py-md">Name</th>
                <th className="px-lg py-md">Facet</th>
                <th className="px-lg py-md">Voltage context</th>
                <th className="px-lg py-md text-right">Base capacity</th>
                <th className="px-lg py-md">Version</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md text-right">Preview total*</th>
                <th className="px-lg py-md">Updated</th>
                <th className="px-lg py-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {visible.map((tpl) => {
                const facetName = facetsById[tpl.facetId]?.name ?? tpl.facetId;
                const baseTotal =
                  totalsAtDefaultSelections({
                    template: tpl,
                    facets: facetsSorted,
                    allTemplates: templates,
                    catalogItems,
                  })?.grandTotal ?? 0;
                const voltageLabel =
                  tpl.facetId === VOLTAGE_CLASS_FACET_ID
                    ? `${SYNC_TYPE_LABELS[tpl.syncType ?? 'Other']} · ${PROJECT_TYPE_LABELS[tpl.projectType ?? 'utility']}`
                    : '—';
                return (
                  <tr key={tpl.id} className="hover:bg-surface-container-low">
                    <td className="px-lg py-md">
                      <button
                        className="text-primary hover:underline text-left"
                        onClick={() => navigate(`/templates/${tpl.id}`)}
                      >
                        <span className="font-headline-sm text-headline-sm">
                          {tpl.name}
                        </span>
                      </button>
                      {tpl.description && (
                        <div className="text-on-surface-variant text-body-sm mt-0.5 line-clamp-1">
                          {tpl.description}
                        </div>
                      )}
                    </td>
                    <td className="px-lg py-md text-on-surface-variant">{facetName}</td>
                    <td className="px-lg py-md text-on-surface-variant text-body-sm">
                      {voltageLabel}
                    </td>
                    <td className="px-lg py-md text-right">
                      {formatPlantCapacityKW(tpl.baseCapacityKW)}
                    </td>
                    <td className="px-lg py-md text-on-surface-variant">{tpl.version}</td>
                    <td className="px-lg py-md">
                      <select
                        value={tpl.status}
                        onChange={(e) =>
                          setStatus(tpl.id, e.target.value as TemplateStatus)
                        }
                        className="bg-transparent border-none p-0 font-label-sm text-label-sm cursor-pointer focus:outline-none"
                      >
                        {TEMPLATE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {TEMPLATE_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1">
                        <StatusTag status={tpl.status} />
                      </div>
                    </td>
                    <td className="px-lg py-md text-right">
                      ₹ {formatINR(baseTotal)}
                    </td>
                    <td className="px-lg py-md text-on-surface-variant">
                      {new Date(tpl.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex justify-end gap-0.5">
                        <button
                          className="p-1 rounded hover:bg-surface-variant"
                          title="Generate estimate (other facets use defaults)"
                          onClick={() => handleGenerateEstimate(tpl)}
                        >
                          <Icon name="bolt" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-surface-variant"
                          title="Duplicate"
                          onClick={() => {
                            const copy = duplicateTemplate(tpl.id);
                            if (copy) navigate(`/templates/${copy.id}`);
                          }}
                        >
                          <Icon name="content_copy" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-error/10 text-error"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete "${tpl.name}"?`)) {
                              removeTemplate(tpl.id);
                            }
                          }}
                        >
                          <Icon name="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-body-sm text-on-surface-variant">
        * Preview total composites this template together with seeded defaults for every other facet —
        approximate until the estimator confirms full selections.
      </p>
    </div>
  );
}
