import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { FacetSegmentedControl } from '@/components/ui/FacetSegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { EstimateCard } from '@/components/builder/EstimateCard';
import {
  applyLineOverrides,
  facetPickerPrimaryLabel,
  hasAnyLineOverride,
  mountKindFromTemplateId,
  recomputeMaterialization,
  resolveMountSnapshot,
  type MountKind,
} from '@/lib/estimate';
import { capexBreakdown, loanAmountForEstimate } from '@/lib/calc';
import { facetStripAccent } from '@/lib/facets';
import {
  BUSINESS_MODEL_FACET_ID,
  MONITORING_FACET_ID,
  MOUNTING_FACET_ID,
  VOLTAGE_CLASS_FACET_ID,
} from '@/lib/facets/constants';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import { useCatalogStore } from '@/store/catalog';
import { selectFacetsSorted, useFacetStore } from '@/store/facets';
import type {
  Estimate,
  EstimateFacetSelections,
  EstimateLineOverride,
  FinanceLayer,
  MaterialCatalogItem,
  ScenarioLocation,
  ScenarioTemplate,
  TemplateFacet,
} from '@/types';
import { FormSection } from '../ScenarioBuilder/FormSection';
import { SiteLocationSection } from '../ScenarioBuilder/SiteLocationSection';
import { EditableBomTable } from './EditableBomTable';
import { EstimateActionsBar } from './EstimateActionsBar';
import { EstimateKpiStrip } from './EstimateKpiStrip';
import { EstimateFilterAccordions, EstimateSidebar } from './EstimateSidebar';

type Mode = 'new' | 'edit';
type Props = { mode: Mode };

const OVERRIDE_RESET_PROMPT =
  'Manual line edits will be reset by this change. Continue?';

export function EstimateBuilder({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const facets = useFacetStore(selectFacetsSorted);
  const templates = useTemplateStore((s) => s.templates);
  const catalogItems = useCatalogStore((s) => s.items);

  const estimate = useEstimateStore((s) =>
    id ? s.estimates.find((e) => e.id === id) : undefined
  );

  const createFromSelections = useEstimateStore((s) => s.createFromSelections);
  const update = useEstimateStore((s) => s.update);
  const setName = useEstimateStore((s) => s.setName);
  const setTargetCapacity = useEstimateStore((s) => s.setTargetCapacity);
  const setSelections = useEstimateStore((s) => s.setSelections);
  const setLineOptionsForTemplate = useEstimateStore(
    (s) => s.setLineOptionsForTemplate
  );
  const setLocation = useEstimateStore((s) => s.setLocation);
  const enableFinance = useEstimateStore((s) => s.enableFinance);
  const disableFinance = useEstimateStore((s) => s.disableFinance);
  const updateFinance = useEstimateStore((s) => s.updateFinance);
  const setLineOverride = useEstimateStore((s) => s.setLineOverride);
  const clearLineOverride = useEstimateStore((s) => s.clearLineOverride);
  const clearAllLineOverrides = useEstimateStore((s) => s.clearAllLineOverrides);
  const setRecent = useEstimateStore((s) => s.setRecent);

  const newEstimateBootstrapRef = useRef(false);
  const [newEstimateBootstrapError, setNewEstimateBootstrapError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (mode !== 'new') return;
    if (!facets.length || !templates.length) return;
    if (newEstimateBootstrapRef.current) return;
    newEstimateBootstrapRef.current = true;
    try {
      const est = createFromSelections({});
      setRecent(est.id);
      navigate(`/estimates/${est.id}/edit`, { replace: true });
    } catch (e) {
      newEstimateBootstrapRef.current = false;
      const msg =
        e instanceof Error ? e.message : 'Could not compose a new estimate.';
      setNewEstimateBootstrapError(msg);
    }
  }, [mode, facets, templates, createFromSelections, navigate, setRecent]);

  if (mode === 'new') {
    if (newEstimateBootstrapError) {
      return (
        <div className="rounded-lg border border-error/40 bg-error/5 p-lg text-body-sm text-on-surface">
          <p className="font-semibold mb-1">{newEstimateBootstrapError}</p>
          <Link to="/" className="text-primary hover:underline">
            ← Back to estimates
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-lg py-2xl text-on-surface-variant">
        <Icon
          name="sync"
          className="text-4xl animate-spin text-primary"
          ariaLabel="Loading"
        />
        <p className="font-body-lg text-body-lg">Creating your estimate…</p>
        <Link to="/" className="text-body-sm hover:text-primary">
          Cancel
        </Link>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="rounded border border-outline-variant bg-surface-container-lowest p-lg text-on-surface-variant">
        <p>Estimate not found.</p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to estimates
        </Link>
      </div>
    );
  }

  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const resolved = facets.map((f) => {
    const snap = estimate.selections[f.id];
    const tpl = snap?.templateId
      ? templatesById.get(snap.templateId)
      : undefined;
    return { facet: f, snap, tpl };
  });

  const missing = resolved.filter((r) => {
    if (!r.facet.required && !r.snap?.templateId) return false;
    if (r.facet.required && !r.snap?.templateId) return true;
    return !!(r.snap?.templateId && !r.tpl);
  });

  if (missing.length > 0) {
    return (
      <div className="rounded border border-error/40 bg-error/5 p-lg text-on-surface">
        <p className="font-semibold mb-1">Incomplete or stale selections</p>
        <ul className="list-disc pl-2.5 text-body-sm mb-2">
          {missing.map((m) => (
            <li key={m.facet.id}>
              {m.facet.name}:{' '}
              {m.snap?.templateId ? 'template missing — pick again' : 'not selected'}
            </li>
          ))}
        </ul>
        <Link to="/estimates/new" className="text-primary hover:underline">
          Start fresh →
        </Link>
      </div>
    );
  }

  return (
    <BuilderShell
      estimate={estimate}
      facets={facets}
      templates={templates}
      catalogItems={catalogItems}
      onChangeName={(n) => setName(estimate.id, n)}
      onChangeTarget={(n) => setTargetCapacity(estimate.id, n)}
      onSelectionsChange={(s) => setSelections(estimate.id, s)}
      onLineOptionsChange={(tid, lids) =>
        setLineOptionsForTemplate(estimate.id, tid, lids)
      }
      onEnableFinance={(p) => enableFinance(estimate.id, p)}
      onDisableFinance={() => disableFinance(estimate.id)}
      onUpdateFinance={(p) => updateFinance(estimate.id, p)}
      onSetLocation={(loc) => setLocation(estimate.id, loc)}
      onLineOverride={(lineId, patch) =>
        setLineOverride(estimate.id, lineId, patch)
      }
      onClearLineOverride={(lineId) => clearLineOverride(estimate.id, lineId)}
      onClearAllOverrides={() => clearAllLineOverrides(estimate.id)}
      onResync={() => {
        update(estimate.id, (e) =>
          recomputeMaterialization(e, {
            facets,
            templates: useTemplateStore.getState().templates,
            catalogItems: useCatalogStore.getState().items,
          })
        );
      }}
      onSave={() => {
        setRecent(estimate.id);
        navigate(`/estimates/${estimate.id}`);
      }}
      onExport={() => {
        navigate(`/estimates/${estimate.id}/export`);
      }}
    />
  );
}

type ShellProps = {
  estimate: Estimate;
  facets: TemplateFacet[];
  templates: ScenarioTemplate[];
  catalogItems: MaterialCatalogItem[];
  onChangeName: (n: string) => void;
  onChangeTarget: (kw: number) => void;
  onSelectionsChange: (s: EstimateFacetSelections) => void;
  onLineOptionsChange: (templateId: string, lineIds: string[]) => void;
  onEnableFinance: (patch?: Partial<FinanceLayer>) => void;
  onDisableFinance: () => void;
  onUpdateFinance: (patch: Partial<FinanceLayer>) => void;
  onSetLocation: (loc: ScenarioLocation | undefined) => void;
  onLineOverride: (lineId: string, patch: EstimateLineOverride) => void;
  onClearLineOverride: (lineId: string) => void;
  onClearAllOverrides: () => void;
  onResync: () => void;
  onSave: () => void;
  onExport: () => void;
};

const MD_BREAKPOINT = '(min-width: 768px)';

/**
 * Tailwind `md` — used so we only mount one copy of capacity (incl. Leaflet).
 * A second map under `display:none` gets 0×0 layout and `flyTo` can throw
 * `Invalid LatLng object: (NaN, NaN)`.
 */
function useMinWidthMd(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MD_BREAKPOINT).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MD_BREAKPOINT);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

function BuilderShell(p: ShellProps) {
  const wideLayout = useMinWidthMd();
  const templatesById = useMemo(
    () => new Map(p.templates.map((t) => [t.id, t])),
    [p.templates]
  );

  const voltageTpl = useMemo(() => {
    const v = p.estimate.selections[VOLTAGE_CLASS_FACET_ID];
    return v?.templateId ? templatesById.get(v.templateId) : undefined;
  }, [p.estimate.selections, templatesById]);

  const projectSubtitle = useMemo(() => {
    if (!voltageTpl) return 'Solar estimate';
    return `${voltageTpl.syncType} solar plant · ${formatPlantCapacityKW(
      p.estimate.targetCapacityKW
    )}`;
  }, [voltageTpl, p.estimate.targetCapacityKW]);

  const appliedFilterSummary = useMemo(() => {
    const chips: string[] = [];
    const vSnap = p.estimate.selections[VOLTAGE_CLASS_FACET_ID];
    if (vSnap?.templateId) {
      const t = templatesById.get(vSnap.templateId);
      if (t) chips.push(facetPickerPrimaryLabel(VOLTAGE_CLASS_FACET_ID, t));
    }
    const mSnap = p.estimate.selections[MOUNTING_FACET_ID];
    if (mSnap?.templateId) {
      const k = mountKindFromTemplateId(mSnap.templateId);
      if (k === 'ground') chips.push('Ground mount');
      else if (k === 'roof') chips.push('Rooftop mount');
    }
    const bSnap = p.estimate.selections[BUSINESS_MODEL_FACET_ID];
    if (bSnap?.templateId) {
      const t = templatesById.get(bSnap.templateId);
      if (t) chips.push(facetPickerPrimaryLabel(BUSINESS_MODEL_FACET_ID, t));
    }
    const monSnap = p.estimate.selections[MONITORING_FACET_ID];
    if (monSnap?.templateId) {
      const t = templatesById.get(monSnap.templateId);
      if (t) chips.push(facetPickerPrimaryLabel(MONITORING_FACET_ID, t));
    }
    chips.push(formatPlantCapacityKW(p.estimate.targetCapacityKW));
    if (p.estimate.finance?.enabled) chips.push('Finance on');
    if (p.estimate.location?.label) chips.push(p.estimate.location.label);

    if (chips.length === 0) {
      return (
        <span className="font-label-sm text-on-surface-variant">
          No selections yet
        </span>
      );
    }
    return (
      <div className="flex flex-wrap gap-xs">
        {chips.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="inline-flex items-center rounded-full border border-outline-variant/50 bg-surface-container-low px-md py-0.5 font-label-sm text-label-sm text-on-surface"
          >
            {label}
          </span>
        ))}
      </div>
    );
  }, [p.estimate, templatesById]);

  const versionStale = useMemo(() => {
    return Object.values(p.estimate.selections).some((snap) => {
      if (!snap?.templateId) return false;
      const tpl = templatesById.get(snap.templateId);
      return !!tpl && snap.selectedVersion !== tpl.version;
    });
  }, [p.estimate.selections, templatesById]);

  const { display, totals } = useMemo(
    () =>
      applyLineOverrides(
        p.estimate.materialized,
        p.estimate.lineOverrides,
        p.estimate.targetCapacityKW
      ),
    [
      p.estimate.materialized,
      p.estimate.lineOverrides,
      p.estimate.targetCapacityKW,
    ]
  );

  const capex = capexBreakdown(display);
  const loanAmount = p.estimate.finance?.enabled
    ? loanAmountForEstimate(capex.total, p.estimate.finance.financing)
    : 0;
  const equity = Math.max(0, capex.total - loanAmount);

  const guard = useCallback(
    (fn: () => void) => {
      if (hasAnyLineOverride(p.estimate.lineOverrides)) {
        const ok = window.confirm(OVERRIDE_RESET_PROMPT);
        if (!ok) return;
      }
      fn();
    },
    [p.estimate.lineOverrides]
  );

  const guardedChangeTarget = useCallback(
    (kw: number) => guard(() => p.onChangeTarget(kw)),
    [guard, p]
  );
  const guardedSelectionsChange = useCallback(
    (s: EstimateFacetSelections) => guard(() => p.onSelectionsChange(s)),
    [guard, p]
  );
  const guardedLineOptionsChange = useCallback(
    (templateId: string, lineIds: string[]) =>
      guard(() => p.onLineOptionsChange(templateId, lineIds)),
    [guard, p]
  );
  const guardedResync = useCallback(() => guard(() => p.onResync()), [guard, p]);

  const staleBanner =
    versionStale ? (
      <div className="rounded-lg border border-tertiary/40 bg-tertiary/5 p-md flex flex-col gap-md mb-sm">
        <span className="font-body-sm text-body-sm text-on-surface">
          Template versions changed since this estimate was saved — re-sync when
          ready.
        </span>
        <Button variant="outline" onClick={guardedResync} className="self-start">
          Re-sync to latest
        </Button>
      </div>
    ) : null;

  const facetShared = {
    facets: p.facets,
    templates: p.templates,
    catalogItems: p.catalogItems,
    selections: p.estimate.selections,
    selectedOptionsPerTemplate: p.estimate.selectedOptionsPerTemplate,
    templatesById,
    voltageTpl,
    onSelectionsChange: guardedSelectionsChange,
    onLineOptionsChange: guardedLineOptionsChange,
  };

  const configurationContent = (
    <div className="flex flex-col gap-sm">
      <FacetSection facetId={VOLTAGE_CLASS_FACET_ID} {...facetShared} />
      <FacetSection facetId={MOUNTING_FACET_ID} {...facetShared} />
      <FacetSection facetId={BUSINESS_MODEL_FACET_ID} {...facetShared} />
      <FacetSection facetId={MONITORING_FACET_ID} {...facetShared} />
    </div>
  );

  const capacityContent = (
    <div className="flex flex-col gap-md">
      <TargetCapacitySection
        estimate={p.estimate}
        templatesById={templatesById}
        onChangeTarget={guardedChangeTarget}
      />
      <FinanceSection
        finance={p.estimate.finance}
        onEnable={() => p.onEnableFinance()}
        onUpdate={p.onUpdateFinance}
      />
      <SiteLocationSection
        location={p.estimate.location}
        onChange={p.onSetLocation}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-lg">
      <Link
        to="/"
        className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
      >
        ← All estimates
      </Link>

      <div className="flex flex-col md:flex-row md:items-stretch gap-lg">
        <EstimateSidebar
          nameEditor={
            <ProjectNameEditor
              value={p.estimate.name}
              onChange={p.onChangeName}
            />
          }
          projectSubtitle={projectSubtitle}
          summary={appliedFilterSummary}
          notices={staleBanner}
          configurationContent={configurationContent}
          capacityContent={wideLayout ? capacityContent : null}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-lg">
          <div className="md:hidden flex flex-col gap-md rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-card overflow-hidden">
            <div className="flex items-start gap-md">
              <div className="h-11 w-11 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary shrink-0">
                <Icon name="solar_power" className="text-xl" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <ProjectNameEditor
                  value={p.estimate.name}
                  onChange={p.onChangeName}
                />
                {projectSubtitle && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    {projectSubtitle}
                  </span>
                )}
              </div>
            </div>
            <div className="border-b border-outline-variant/20 pb-md">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">
                Active setup
              </p>
              {appliedFilterSummary}
            </div>
            <div className="max-h-[min(70dvh,36rem)] overflow-y-auto -mx-px">
              <EstimateFilterAccordions
                notices={staleBanner}
                configurationContent={configurationContent}
                capacityContent={wideLayout ? null : capacityContent}
              />
            </div>
          </div>

          <EstimateActionsBar
            title="Project Estimate"
            subtitle="Detailed cost breakdown and BOM configuration."
            onExport={p.onExport}
            onSave={p.onSave}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-lg">
            <EstimateKpiStrip
              mainBomSubtotal={totals.mainBomSubtotal}
              mainBomGst={totals.mainBomGst}
              otherScopeSubtotal={totals.otherScopeSubtotal}
              otherScopeGst={totals.otherScopeGst}
            />
            <EstimateCard total={totals.grandTotal} />
          </div>

          {p.estimate.finance?.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-md">
              <MiniStat
                label="Per kW"
                value={`₹ ${formatINR(totals.perKwRate)}`}
                accent
              />
              <MiniStat label="Equity" value={`₹ ${formatINR(equity)}`} />
              <MiniStat label="Loan" value={`₹ ${formatINR(loanAmount)}`} />
              <MiniStat
                label="Target"
                value={formatPlantCapacityKW(p.estimate.targetCapacityKW)}
              />
            </div>
          )}

          <EditableBomTable
            display={display}
            materialized={p.estimate.materialized}
            overrides={p.estimate.lineOverrides}
            onLineOverride={p.onLineOverride}
            onClearLineOverride={p.onClearLineOverride}
            onClearAllOverrides={p.onClearAllOverrides}
          />
        </div>
      </div>
    </div>
  );
}

function ProjectNameEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== value) onChange(next);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="font-headline-md text-headline-md text-primary bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
      aria-label="Estimate name"
    />
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`font-data-display text-data-display ${
          accent ? 'text-primary' : 'text-on-surface'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

type FacetSectionProps = {
  facetId: string;
  facets: TemplateFacet[];
  templates: ScenarioTemplate[];
  catalogItems: MaterialCatalogItem[];
  selections: EstimateFacetSelections;
  selectedOptionsPerTemplate: Estimate['selectedOptionsPerTemplate'];
  templatesById: Map<string, ScenarioTemplate>;
  voltageTpl: ScenarioTemplate | undefined;
  onSelectionsChange: (s: EstimateFacetSelections) => void;
  onLineOptionsChange: (templateId: string, lineIds: string[]) => void;
};

const MOUNT_CHOICES: { kind: MountKind; label: string }[] = [
  { kind: 'ground', label: 'Ground mount' },
  { kind: 'roof', label: 'Rooftop mount' },
];

const facetChoiceRowButtonClass =
  'flex w-full min-h-touch-target items-center justify-between gap-lg rounded-lg px-sm -mx-sm py-base text-left transition-colors hover:bg-surface-container-low/40';

function FacetSection({
  facetId,
  facets,
  templates,
  catalogItems,
  selections,
  selectedOptionsPerTemplate,
  templatesById,
  voltageTpl,
  onSelectionsChange,
  onLineOptionsChange,
}: FacetSectionProps) {
  const facet = facets.find((f) => f.id === facetId);
  const accent = facetStripAccent(facetId);

  const selectedTemplate = useMemo(() => {
    const snap = selections[facetId];
    return snap?.templateId ? templatesById.get(snap.templateId) : undefined;
  }, [selections, facetId, templatesById]);

  const optionalRows = useMemo(() => {
    if (!selectedTemplate) return [];
    const cata = new Map(catalogItems.map((c) => [c.id, c]));
    return selectedTemplate.lines
      .filter((l) => l.isOptional || l.scalingType === 'optional')
      .map((line) => ({
        tpl: selectedTemplate,
        line,
        label: cata.get(line.catalogItemId)?.name ?? line.catalogItemId,
      }));
  }, [selectedTemplate, catalogItems]);

  if (!facet) {
    return (
      <p className="font-body-md text-on-surface-variant">
        Facet not configured.
      </p>
    );
  }

  const sel = selections[facet.id];

  const mountResolved = MOUNT_CHOICES.map(({ kind, label }) => ({
    kind,
    label,
    snap: resolveMountSnapshot(kind, voltageTpl, templatesById),
  }));
  const mountAllResolved = mountResolved.every((m) => m.snap);

  return (
    <div className="flex flex-col gap-sm">
      <FormSection
        title={facet.name}
        subtitle={facet.description}
      >
        <div className="flex flex-col gap-sm">
        {facet.id === MOUNTING_FACET_ID ? (
          mountAllResolved ? (
            <FacetSegmentedControl
              facetId={MOUNTING_FACET_ID}
              ariaLabel={facet.name}
              options={mountResolved.map(({ kind, label, snap }) => ({
                id: kind,
                label,
                selected: sel?.templateId === snap!.templateId,
                onSelect: () =>
                  onSelectionsChange({
                    ...selections,
                    [MOUNTING_FACET_ID]: snap!,
                  }),
              }))}
            />
          ) : (
            <div className="flex flex-col gap-sm" role="group" aria-label={facet.name}>
              {mountResolved.map(({ kind, label, snap }) => {
                if (!snap) {
                  return (
                    <div
                      key={kind}
                      className="flex min-h-touch-target items-center rounded-lg border border-dashed border-outline-variant px-sm py-base text-body-sm text-on-surface-variant"
                    >
                      {label}: missing
                    </div>
                  );
                }
                const selected = sel?.templateId === snap.templateId;
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onSelectionsChange({
                        ...selections,
                        [MOUNTING_FACET_ID]: snap,
                      })
                    }
                    className={facetChoiceRowButtonClass}
                  >
                    <span
                      className="min-w-0 flex-1 truncate font-body-md text-body-md font-normal text-on-surface pr-base"
                      title={label}
                    >
                      {label}
                    </span>
                    <span
                      className="flex w-6 shrink-0 items-center justify-end"
                      aria-hidden
                    >
                      {selected ? (
                        <Icon
                          name="check_circle"
                          className={accent.checkTone}
                          filled
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <FacetButtonRow
            facet={facet}
            templates={templates}
            selections={selections}
            onSelect={(snap) =>
              onSelectionsChange({
                ...selections,
                [facet.id]: snap,
              })
            }
          />
        )}
        </div>
      </FormSection>

      {optionalRows.length > 0 && (
        <FormSection
          title="Optional lines"
          subtitle={`Toggle add-ons specific to ${selectedTemplate?.name ?? 'the selected template'}.`}
        >
          <div className="flex flex-col gap-sm">
            {optionalRows.map(({ tpl, line, label }) => {
              const ids: string[] =
                selectedOptionsPerTemplate[tpl.id]?.lineIds ?? [];
              const on = new Set(ids).has(line.id);
              const toggleLine = () => {
                const set = new Set(ids);
                if (set.has(line.id)) set.delete(line.id);
                else set.add(line.id);
                onLineOptionsChange(tpl.id, [...set]);
              };
              return (
                <div
                  key={`${tpl.id}_${line.id}`}
                  className={facetChoiceRowButtonClass}
                >
                  <span
                    className="min-w-0 flex-1 truncate font-body-md text-body-md font-normal text-on-surface pr-base"
                    title={label}
                  >
                    {label}
                  </span>
                  <Switch checked={on} onChange={toggleLine} label={label} />
                </div>
              );
            })}
          </div>
        </FormSection>
      )}
    </div>
  );
}

function FacetButtonRow({
  facet,
  templates,
  selections,
  onSelect,
}: {
  facet: TemplateFacet;
  templates: ScenarioTemplate[];
  selections: EstimateFacetSelections;
  onSelect: (snap: { templateId: string; selectedVersion: string }) => void;
}) {
  const sel = selections[facet.id];
  const choices = templates.filter(
    (t) => t.status === 'active' && t.facetId === facet.id
  );

  if (choices.length === 0) {
    return (
      <p className="font-body-md text-on-surface-variant">
        No active templates for this facet.
      </p>
    );
  }

  return (
    <FacetSegmentedControl
      facetId={facet.id}
      ariaLabel={facet.name}
      options={choices.map((tpl) => ({
        id: tpl.id,
        label: facetPickerPrimaryLabel(facet.id, tpl),
        selected: sel?.templateId === tpl.id,
        onSelect: () =>
          onSelect({ templateId: tpl.id, selectedVersion: tpl.version }),
      }))}
    />
  );
}

function TargetCapacitySection({
  estimate,
  templatesById,
  onChangeTarget,
}: {
  estimate: Estimate;
  templatesById: Map<string, ScenarioTemplate>;
  onChangeTarget: (kw: number) => void;
}) {
  const chosenTemplates = Object.values(estimate.selections)
    .map((snap) => (snap?.templateId ? templatesById.get(snap.templateId) : undefined))
    .filter((t): t is ScenarioTemplate => !!t);

  const minSlider =
    chosenTemplates.length > 0
      ? Math.max(
          50,
          Math.round(
            Math.max(...chosenTemplates.map((t) => t.baseCapacityKW * 0.5))
          )
        )
      : 50;
  const maxSlider =
    chosenTemplates.length > 0
      ? Math.round(
          Math.min(
            ...chosenTemplates.map((t) =>
              Math.max(t.baseCapacityKW * 2, t.baseCapacityKW + 200)
            )
          )
        )
      : 4000;

  return (
    <div
      className="flex flex-col gap-sm"
      role="group"
      aria-label="Target capacity"
    >
      <div className="flex justify-between items-center gap-md min-w-0">
        <span className="font-body-md text-body-md font-semibold text-on-surface truncate">
          Target capacity
        </span>
        <span className="font-data-display text-body-lg text-primary font-semibold whitespace-nowrap shrink-0">
          {formatPlantCapacityKW(estimate.targetCapacityKW)}
        </span>
      </div>
      <Slider
        id="target_kw"
        ariaLabel="Target capacity"
        value={estimate.targetCapacityKW}
        onChange={(n) => onChangeTarget(Math.round(n))}
        min={minSlider}
        max={maxSlider}
        step={10}
        variant="plain"
        variantChrome="minimal"
        showBounds={false}
        formatValue={formatPlantCapacityKW}
        minMaxFormat={formatPlantCapacityKW}
      />
    </div>
  );
}

function FinanceSection({
  finance,
  onEnable,
  onUpdate,
}: {
  finance: FinanceLayer | undefined;
  onEnable: () => void;
  onUpdate: (patch: Partial<FinanceLayer>) => void;
}) {
  useEffect(() => {
    if (!finance?.enabled) {
      onEnable();
    }
  }, [finance?.enabled, onEnable]);

  const enabled = finance?.enabled ?? false;

  return (
    <FormSection title="Finance modeling">
      {enabled && finance && (
        <div className="grid grid-cols-1 gap-md">
          <Slider
            id="finance_lifespan"
            label="Lifespan"
            value={finance.basics.lifespanYears}
            onChange={(n) =>
              onUpdate({
                basics: { ...finance.basics, lifespanYears: Math.round(n) },
              })
            }
            min={5}
            max={40}
            step={1}
            variant="years"
          />
          <Slider
            id="finance_cuf"
            label="CUF"
            value={finance.basics.cufPct}
            onChange={(n) => onUpdate({ basics: { ...finance.basics, cufPct: n } })}
            min={5}
            max={40}
            step={0.5}
            variant="percent"
          />
          <Slider
            id="finance_infl"
            label="Inflation"
            value={finance.basics.inflationPct}
            onChange={(n) =>
              onUpdate({ basics: { ...finance.basics, inflationPct: n } })
            }
            min={0}
            max={15}
            step={0.5}
            variant="percent"
          />
          <Slider
            id="finance_ppa"
            label="PPA Rate"
            value={finance.revenue.ppaRate}
            onChange={(n) =>
              onUpdate({ revenue: { ...finance.revenue, ppaRate: n } })
            }
            min={1}
            max={10}
            step={0.05}
            variant="plain"
            suffix="₹/kWh"
          />
          <Slider
            id="finance_om"
            label="O&M (% of CAPEX)"
            value={finance.om.percentOfCapex}
            onChange={(n) =>
              onUpdate({
                om: { ...finance.om, percentOfCapex: n },
              })
            }
            min={0}
            max={5}
            step={0.05}
            variant="percent"
          />
          <Slider
            id="finance_fin"
            label="% Financed"
            value={finance.financing.financedPct}
            onChange={(n) =>
              onUpdate({
                financing: { ...finance.financing, financedPct: n },
              })
            }
            min={0}
            max={100}
            step={1}
            variant="percent"
          />
          <Slider
            id="finance_int"
            label="Interest"
            value={finance.financing.interestPct}
            onChange={(n) =>
              onUpdate({
                financing: { ...finance.financing, interestPct: n },
              })
            }
            min={0}
            max={20}
            step={0.1}
            variant="percent"
          />
          <Slider
            id="finance_term"
            label="Loan Term"
            value={finance.financing.termYears}
            onChange={(n) =>
              onUpdate({
                financing: { ...finance.financing, termYears: Math.round(n) },
              })
            }
            min={1}
            max={25}
            step={1}
            variant="years"
          />
        </div>
      )}
    </FormSection>
  );
}
