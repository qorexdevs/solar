import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPES,
  SYNC_TYPE_LABELS,
  type ProjectType,
  type SyncType,
} from '@/types';
import { formatPlantCapacityKW } from '@/lib/format';
import { useTemplateStore } from '@/store/templates';
import { useEstimateStore } from '@/store/estimates';
import { MainBomTable } from './MainBomTable';
import { OtherScopeTable } from './OtherScopeTable';
import { TemplateSummary } from './TemplateSummary';

const PROJECT_TYPES: ProjectType[] = ['utility', 'commercial', 'hybrid', 'residential'];

type TemplateNavigateState = { editableOnOpen?: boolean };

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const template = useTemplateStore((s) =>
    s.templates.find((t) => t.id === id)
  );
  const updateTemplate = useTemplateStore((s) => s.update);
  const removeTemplate = useTemplateStore((s) => s.remove);
  const duplicateTemplate = useTemplateStore((s) => s.duplicate);
  const createFromTemplate = useEstimateStore((s) => s.createFromTemplate);

  const editableOnOpenNav = Boolean(
    (location.state as TemplateNavigateState | null)?.editableOnOpen
  );

  const [editable, setEditable] = useState(editableOnOpenNav);

  useEffect(() => {
    setEditable(editableOnOpenNav);
  }, [id, location.key, editableOnOpenNav]);

  const effectiveDate = useMemo(
    () =>
      template ? new Date(template.effectiveFrom).toISOString().slice(0, 10) : '',
    [template]
  );

  const effectiveDateDisplay =
    template != null
      ? new Date(template.effectiveFrom).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : '';

  if (!template) {
    return (
      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md text-on-surface-variant">
        <p>Template not found.</p>
        <Link to="/templates" className="text-primary hover:underline">
          ← Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex flex-col gap-sm flex-1 min-w-[280px]">
          <Link to="/templates" className="text-body-sm text-on-surface-variant hover:text-primary">
            ← All templates
          </Link>
          {editable ? (
            <input
              value={template.name}
              onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
              className="font-headline-xl text-headline-xl text-primary bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
            />
          ) : (
            <span className="font-headline-xl text-headline-xl text-primary">
              {template.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-sm justify-end">
          {!editable ? (
            <Button
              variant="outline"
              iconLeft={<Icon name="edit" />}
              onClick={() => setEditable(true)}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="ghost"
              iconLeft={<Icon name="visibility" />}
              onClick={() => setEditable(false)}
            >
              Done
            </Button>
          )}
          <Button
            variant="outline"
            iconLeft={<Icon name="content_copy" />}
            onClick={() => {
              const copy = duplicateTemplate(template.id);
              if (copy) navigate(`/templates/${copy.id}`);
            }}
          >
            Duplicate
          </Button>
          <Button
            variant="primary"
            iconLeft={<Icon name="bolt" />}
            onClick={() => {
              const est = createFromTemplate({ template });
              navigate(`/estimates/${est.id}/edit`);
            }}
          >
            Generate estimate
          </Button>
          <button
            className="p-2 rounded hover:bg-error/10 text-error"
            title="Delete template"
            type="button"
            onClick={() => {
              if (confirm(`Delete "${template.name}"?`)) {
                removeTemplate(template.id);
                navigate('/templates');
              }
            }}
          >
            <Icon name="delete" />
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <Field label="Project type">
          {editable ? (
            <select
              value={template.projectType}
              onChange={(e) =>
                updateTemplate(template.id, {
                  projectType: e.target.value as ProjectType,
                })
              }
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-2 text-body-md"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROJECT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          ) : (
            <ReadOnlyValue>{PROJECT_TYPE_LABELS[template.projectType]}</ReadOnlyValue>
          )}
        </Field>
        <Field label="Sync type">
          {editable ? (
            <select
              value={template.syncType}
              onChange={(e) =>
                updateTemplate(template.id, { syncType: e.target.value as SyncType })
              }
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-2 text-body-md"
            >
              {SYNC_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SYNC_TYPE_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <ReadOnlyValue>{SYNC_TYPE_LABELS[template.syncType]}</ReadOnlyValue>
          )}
        </Field>
        <Field label="Base capacity (kW)">
          {editable ? (
            <input
              type="number"
              value={template.baseCapacityKW}
              onChange={(e) =>
                updateTemplate(template.id, {
                  baseCapacityKW: Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-2 text-body-md"
            />
          ) : (
            <ReadOnlyValue>
              {formatPlantCapacityKW(template.baseCapacityKW)}
            </ReadOnlyValue>
          )}
        </Field>
        <Field label="Version">
          {editable ? (
            <input
              value={template.version}
              onChange={(e) =>
                updateTemplate(template.id, { version: e.target.value })
              }
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-2 text-body-md"
            />
          ) : (
            <ReadOnlyValue>{template.version}</ReadOnlyValue>
          )}
        </Field>
        <Field label="Effective from">
          {editable ? (
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) =>
                updateTemplate(template.id, {
                  effectiveFrom: new Date(e.target.value).getTime() || Date.now(),
                })
              }
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-2 text-body-md"
            />
          ) : (
            <ReadOnlyValue>{effectiveDateDisplay}</ReadOnlyValue>
          )}
        </Field>
        <Field label="Source" hint="seed / manual / upload">
          {editable ? (
            <input
              value={template.source}
              disabled
              className="w-full rounded border border-outline-variant bg-surface-container-low px-2 py-2 text-body-md text-on-surface-variant"
            />
          ) : (
            <ReadOnlyValue>{template.source}</ReadOnlyValue>
          )}
        </Field>
        <Field label="Created">
          <div className="px-2 py-2 text-body-md text-on-surface-variant">
            {new Date(template.createdAt).toLocaleDateString('en-IN')}
          </div>
        </Field>
        <Field label="Updated">
          <div className="px-2 py-2 text-body-md text-on-surface-variant">
            {new Date(template.updatedAt).toLocaleString('en-IN')}
          </div>
        </Field>
      </section>

      <TemplateSummary template={template} editable={editable} />
      <MainBomTable template={template} editable={editable} />
      <OtherScopeTable template={template} editable={editable} />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
        {label}
        {hint && (
          <span className="ml-1 normal-case text-body-sm opacity-70">
            ({hint})
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

function ReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-2 text-body-md text-on-surface min-h-[42px] flex items-center">
      {children}
    </div>
  );
}
