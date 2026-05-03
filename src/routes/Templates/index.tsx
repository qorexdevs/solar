import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import {
  defaultSelectedOptionsFor,
  materializeTemplate,
} from '@/lib/templates';
import { useTemplateStore } from '@/store/templates';
import { useEstimateStore } from '@/store/estimates';
import { uid } from '@/lib/uid';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPE_LABELS,
  TEMPLATE_STATUSES,
  TEMPLATE_STATUS_LABELS,
  type ScenarioTemplate,
  type TemplateStatus,
} from '@/types';

export function TemplateList() {
  const navigate = useNavigate();
  const templates = useTemplateStore((s) => s.templates);
  const removeTemplate = useTemplateStore((s) => s.remove);
  const duplicateTemplate = useTemplateStore((s) => s.duplicate);
  const setStatus = useTemplateStore((s) => s.setStatus);
  const createTemplate = useTemplateStore((s) => s.create);
  const createFromTemplate = useEstimateStore((s) => s.createFromTemplate);

  const [filter, setFilter] = useState<'all' | TemplateStatus>('all');

  const visible = useMemo(
    () => (filter === 'all' ? templates : templates.filter((t) => t.status === filter)),
    [templates, filter]
  );

  function handleNewTemplate() {
    const now = Date.now();
    const t: ScenarioTemplate = {
      id: uid('tpl'),
      name: 'New scenario template',
      projectType: 'utility',
      syncType: 'HT',
      baseCapacityKW: 1000,
      status: 'draft',
      version: 'v1',
      effectiveFrom: now,
      description: '',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      mainBom: [],
      otherScope: [],
    };
    createTemplate(t);
    navigate(`/templates/${t.id}`, { state: { editableOnOpen: true } });
  }

  function handleGenerateEstimate(template: ScenarioTemplate) {
    const est = createFromTemplate({ template });
    navigate(`/estimates/${est.id}/edit`);
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <h1 className="font-headline-xl text-headline-xl text-primary">
          Scenario Templates
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Reusable BOM templates that capture real project configurations
          (e.g. <em>1000 KW Ground Mounted - HT Sync</em>). Estimators pick a
          template, set a target capacity, toggle optional scope, and the
          system scales the BOM and computes totals.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-sm justify-between">
        <div className="flex items-center gap-sm">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Filter
          </label>
          <select
            className="rounded border border-outline bg-surface-container-low px-3 py-2 font-body-sm text-body-sm"
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
        <div className="rounded-lg border border-dashed border-outline bg-surface-container-low p-xl text-center">
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            No templates {filter === 'all' ? '' : `with status “${filter}”`} yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-left text-body-sm font-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-md py-sm">Name</th>
                <th className="px-md py-sm">Project type</th>
                <th className="px-md py-sm">Sync</th>
                <th className="px-md py-sm text-right">Base capacity</th>
                <th className="px-md py-sm">Version</th>
                <th className="px-md py-sm">Status</th>
                <th className="px-md py-sm text-right">Base total</th>
                <th className="px-md py-sm">Updated</th>
                <th className="px-md py-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {visible.map((tpl) => {
                const baseTotal = safeBaseTotal(tpl);
                return (
                  <tr key={tpl.id} className="hover:bg-surface-container-low">
                    <td className="px-md py-sm">
                      <button
                        className="text-primary hover:underline text-left"
                        onClick={() => navigate(`/templates/${tpl.id}`)}
                      >
                        <span className="font-headline-sm text-headline-sm">
                          {tpl.name}
                        </span>
                      </button>
                      {tpl.description && (
                        <div className="text-on-surface-variant text-body-sm mt-1 line-clamp-1">
                          {tpl.description}
                        </div>
                      )}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {PROJECT_TYPE_LABELS[tpl.projectType]}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {SYNC_TYPE_LABELS[tpl.syncType]}
                    </td>
                    <td className="px-md py-sm text-right">
                      {formatPlantCapacityKW(tpl.baseCapacityKW)}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {tpl.version}
                    </td>
                    <td className="px-md py-sm">
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
                    <td className="px-md py-sm text-right">
                      ₹ {formatINR(baseTotal)}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {new Date(tpl.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-2 rounded hover:bg-surface-variant"
                          title="Generate estimate"
                          onClick={() => handleGenerateEstimate(tpl)}
                        >
                          <Icon name="bolt" />
                        </button>
                        <button
                          className="p-2 rounded hover:bg-surface-variant"
                          title="Duplicate"
                          onClick={() => {
                            const copy = duplicateTemplate(tpl.id);
                            if (copy) navigate(`/templates/${copy.id}`);
                          }}
                        >
                          <Icon name="content_copy" />
                        </button>
                        <button
                          className="p-2 rounded hover:bg-error/10 text-error"
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
    </div>
  );
}

function safeBaseTotal(tpl: ScenarioTemplate): number {
  try {
    const { totals } = materializeTemplate({
      template: tpl,
      targetCapacityKW: tpl.baseCapacityKW,
      selectedOptions: defaultSelectedOptionsFor(tpl),
    });
    return totals.grandTotal;
  } catch {
    return 0;
  }
}
