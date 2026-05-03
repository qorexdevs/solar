import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { CostBreakdownPanel } from '@/components/builder/CostBreakdownPanel';
import { EstimateCard } from '@/components/builder/EstimateCard';
import { capexBreakdown, loanAmountForEstimate } from '@/lib/calc';
import {
  defaultFinanceLayer,
  recomputeMaterialization,
} from '@/lib/estimate';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import { useCatalogStore } from '@/store/catalog';
import { selectFacetsSorted, useFacetStore } from '@/store/facets';
import type {
  ComposeMode,
  EstimateFacetSelections,
  FinanceLayer,
  ScenarioTemplate,
  ScenarioLocation,
  TemplateFacet,
} from '@/types';
import { FormSection } from '../ScenarioBuilder/FormSection';
import { SiteLocationSection } from '../ScenarioBuilder/SiteLocationSection';
import { Stat } from '../ScenarioBuilder/Stat';
import { TemplatePicker } from './TemplatePicker';

type Mode = 'new' | 'edit';
type Props = { mode: Mode };

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
  const setComposeOverride = useEstimateStore((s) => s.setComposeOverride);
  const setLocation = useEstimateStore((s) => s.setLocation);
  const enableFinance = useEstimateStore((s) => s.enableFinance);
  const disableFinance = useEstimateStore((s) => s.disableFinance);
  const updateFinance = useEstimateStore((s) => s.updateFinance);
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
        <div className="rounded-lg border border-error/40 bg-error/5 p-md text-body-sm text-on-surface">
          <p className="font-semibold mb-2">{newEstimateBootstrapError}</p>
          <Link to="/" className="text-primary hover:underline">
            ← Back to estimates
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-md py-xl text-on-surface-variant">
        <Icon name="sync" className="text-4xl animate-spin text-primary" ariaLabel="Loading" />
        <p className="font-body-lg text-body-lg">Creating your estimate…</p>
        <Link to="/" className="text-body-sm hover:text-primary">
          Cancel
        </Link>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md text-on-surface-variant">
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
    const tpl = snap?.templateId ? templatesById.get(snap.templateId) : undefined;
    return { facet: f, snap, tpl };
  });

  const resolvedActive = resolved.filter(
    (
      r
    ): r is {
      facet: TemplateFacet;
      snap: { templateId: string; selectedVersion: string };
      tpl: ScenarioTemplate;
    } => !!(r.snap && r.snap.templateId && r.tpl)
  );

  const missing = resolved.filter((r) => {
    if (!r.facet.required && !r.snap?.templateId) return false;
    if (r.facet.required && !r.snap?.templateId) return true;
    return !!(r.snap?.templateId && !r.tpl);
  });

  if (missing.length > 0) {
    return (
      <div className="rounded border border-error/40 bg-error/5 p-md text-on-surface">
        <p className="font-semibold mb-2">Incomplete or stale selections</p>
        <ul className="list-disc pl-5 text-body-sm mb-4">
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
    <EditView
      estimate={estimate}
      facets={facets}
      resolvedActive={resolvedActive}
      templates={templates}
      catalogItems={catalogItems}
      onChangeName={(n) => setName(estimate.id, n)}
      onChangeTarget={(n) => setTargetCapacity(estimate.id, n)}
      onSelectionsChange={(s) => setSelections(estimate.id, s)}
      onLineOptionsChange={(tid, lids) =>
        setLineOptionsForTemplate(estimate.id, tid, lids)
      }
      onComposeModeChange={(cid, mode) =>
        setComposeOverride(estimate.id, cid, mode)
      }
      onEnableFinance={(p) => enableFinance(estimate.id, p)}
      onDisableFinance={() => disableFinance(estimate.id)}
      onUpdateFinance={(p) => updateFinance(estimate.id, p)}
      onSetLocation={(loc) => setLocation(estimate.id, loc)}
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
    />
  );
}

type EditProps = {
  estimate: import('@/types').Estimate;
  facets: TemplateFacet[];
  resolvedActive: {
    facet: TemplateFacet;
    snap: { templateId: string; selectedVersion: string };
    tpl: ScenarioTemplate;
  }[];
  templates: ScenarioTemplate[];
  catalogItems: import('@/types').MaterialCatalogItem[];
  onChangeName: (n: string) => void;
  onChangeTarget: (kw: number) => void;
  onSelectionsChange: (s: EstimateFacetSelections) => void;
  onLineOptionsChange: (templateId: string, lineIds: string[]) => void;
  onComposeModeChange: (catalogItemId: string, mode: ComposeMode | undefined) => void;
  onEnableFinance: (patch?: Partial<FinanceLayer>) => void;
  onDisableFinance: () => void;
  onUpdateFinance: (patch: Partial<FinanceLayer>) => void;
  onSetLocation: (loc: ScenarioLocation | undefined) => void;
  onResync: () => void;
  onSave: () => void;
};

function EditView(p: EditProps) {
  const { estimate } = p;
  const chosenTemplates = useMemo(
    () => p.resolvedActive.map((r) => r.tpl),
    [p.resolvedActive]
  );

  const minSlider =
    chosenTemplates.length > 0
      ? Math.max(
          50,
          Math.round(Math.max(...chosenTemplates.map((t) => t.baseCapacityKW * 0.5)))
        )
      : 50;
  const maxSlider =
    chosenTemplates.length > 0
      ? Math.round(
          Math.min(
            ...chosenTemplates.map((t) => Math.max(t.baseCapacityKW * 2, t.baseCapacityKW + 200))
          )
        )
      : 4000;

  const versionStale = p.resolvedActive.some(
    (r) => r.snap.selectedVersion !== r.tpl.version
  );

  const optionalRows = useMemo(() => {
    const cata = new Map(p.catalogItems.map((c) => [c.id, c]));
    return chosenTemplates.flatMap((tpl) =>
      tpl.lines
        .filter((l) => l.isOptional || l.scalingType === 'optional')
        .map((line) => ({
          tpl,
          line,
          label: cata.get(line.catalogItemId)?.name ?? line.catalogItemId,
        }))
    );
  }, [chosenTemplates, p.catalogItems]);

  const capex = capexBreakdown(estimate.materialized);
  const loanAmount = estimate.finance?.enabled
    ? loanAmountForEstimate(capex.total, estimate.finance.financing)
    : 0;
  const equity = Math.max(0, capex.total - loanAmount);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <Link to="/" className="text-body-sm text-on-surface-variant hover:text-primary">
          ← All estimates
        </Link>
        <input
          value={estimate.name}
          onChange={(e) => p.onChangeName(e.target.value)}
          className="font-headline-xl text-headline-xl text-primary bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
        />

        <TemplatePicker
          facets={p.facets}
          templates={p.templates}
          catalogItems={p.catalogItems}
          selections={estimate.selections}
          onSelectionsChange={p.onSelectionsChange}
          showPreviewStrip={false}
        />

        {versionStale && (
          <div className="rounded border border-tertiary/40 bg-tertiary/5 p-sm flex items-center justify-between gap-sm flex-wrap">
            <span className="text-body-sm">
              Template versions changed since this estimate was saved — re-sync when ready.
            </span>
            <Button variant="outline" onClick={p.onResync}>
              Re-sync to latest
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-stretch gap-md">
        <div className="md:flex-1 md:min-w-0 md:max-w-md">
          <EstimateCard total={estimate.totals.grandTotal} />
        </div>
        <div className="rounded-xl bg-surface-container-low p-md border border-outline-variant/30 md:flex-1 md:min-w-0 flex flex-col justify-center">
          <div
            className={`grid gap-x-md gap-y-3 ${
              estimate.finance?.enabled
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            <Stat
              label="Per kW rate"
              value={`₹ ${formatINR(estimate.totals.perKwRate)}`}
              accent
            />
            <Stat
              label="Main BOM"
              value={`₹ ${formatINR(estimate.totals.mainBomSubtotal)}`}
            />
            <Stat
              label="Main GST"
              value={`₹ ${formatINR(estimate.totals.mainBomGst)}`}
            />
            <Stat
              label="Other Scope"
              value={`₹ ${formatINR(
                estimate.totals.otherScopeSubtotal + estimate.totals.otherScopeGst
              )}`}
            />
            {estimate.finance?.enabled && (
              <>
                <Stat label="Equity" value={`₹ ${formatINR(equity)}`} />
                <Stat label="Loan" value={`₹ ${formatINR(loanAmount)}`} />
              </>
            )}
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-lg bg-surface-container-lowest rounded-2xl p-md lg:p-lg shadow-card-xl border border-outline-variant/30">
        <FormSection title="Target capacity">
          <Slider
            id="target_kw"
            label="Target capacity"
            value={estimate.targetCapacityKW}
            onChange={(n) => p.onChangeTarget(Math.round(n))}
            min={minSlider}
            max={maxSlider}
            step={10}
            variant="plain"
            formatValue={formatPlantCapacityKW}
            minMaxFormat={formatPlantCapacityKW}
            hint="Composer scales each selected template independently against its calibrated base kW."
          />
        </FormSection>

        {optionalRows.length > 0 && (
          <FormSection title="Optional lines" subtitle="Namespaced per template.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              {optionalRows.map(({ tpl, line, label }) => {
                const ids: string[] =
                  estimate.selectedOptionsPerTemplate[tpl.id]?.lineIds ?? [];
                const on = new Set(ids).has(line.id);
                const toggleLine = () => {
                  const set = new Set(ids);
                  if (set.has(line.id)) set.delete(line.id);
                  else set.add(line.id);
                  p.onLineOptionsChange(tpl.id, [...set]);
                };
                return (
                  <label
                    key={`${tpl.id}_${line.id}`}
                    className="flex items-center gap-sm rounded border border-outline-variant px-sm py-2 hover:bg-surface-container-low cursor-pointer"
                  >
                    <Switch checked={on} onChange={toggleLine} label={label} />
                    <div className="flex-1 min-w-0">
                      <div className="font-body-md text-body-md truncate">{label}</div>
                      <div className="text-body-sm text-on-surface-variant truncate">
                        {tpl.name}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </FormSection>
        )}

        <FormSection title="Cost breakdown" collapsible open>
          <CostBreakdownPanel
            materialized={estimate.materialized}
            composeOverrides={estimate.composeOverrides}
            onComposeModeChange={p.onComposeModeChange}
          />
        </FormSection>

        <FinanceSection
          finance={estimate.finance}
          onEnable={() => p.onEnableFinance({ ...defaultFinanceLayer(true) })}
          onDisable={p.onDisableFinance}
          onUpdate={p.onUpdateFinance}
        />

        {estimate.finance?.enabled && (
          <SiteLocationSection
            location={estimate.location}
            onChange={p.onSetLocation}
          />
        )}

        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-sm pt-md border-t border-outline-variant/30 mt-sm">
          <Button
            variant="primary"
            size="lg"
            onClick={p.onSave}
            iconRight={<Icon name="check" />}
            fullWidth
            className="md:w-auto"
          >
            View results
          </Button>
        </div>
      </section>
    </div>
  );
}

function FinanceSection({
  finance,
  onEnable,
  onDisable,
  onUpdate,
}: {
  finance: FinanceLayer | undefined;
  onEnable: () => void;
  onDisable: () => void;
  onUpdate: (patch: Partial<FinanceLayer>) => void;
}) {
  const enabled = finance?.enabled ?? false;

  return (
    <FormSection
      title="Finance modeling"
      subtitle="Optional layer: IRR / NPV / cashflows / irradiance-linked yield."
    >
      <label className="flex items-center gap-sm cursor-pointer">
        <Switch
          checked={enabled}
          onChange={(v) => (v ? onEnable() : onDisable())}
          label="Enable finance modeling"
        />
        <span className="font-body-md text-body-md">
          {enabled ? 'Finance modeling is on' : 'Finance modeling is off'}
        </span>
      </label>

      {enabled && finance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm pt-sm">
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
            onChange={(n) =>
              onUpdate({ basics: { ...finance.basics, cufPct: n } })
            }
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
