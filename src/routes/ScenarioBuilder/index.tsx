import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CostBreakdownPanel } from '@/components/builder/CostBreakdownPanel';
import { EstimateCard } from '@/components/builder/EstimateCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { capexBreakdown, loanAmountForScenario } from '@/lib/calc';
import { applyCatalogDefaults, deriveMaterials, resolveCatalog } from '@/lib/catalog';
import { formatINR } from '@/lib/format';
import { createScenario } from '@/lib/scenario';
import { useScenarioStore } from '@/store/scenarios';
import { selectActiveCatalog, useSettingsStore } from '@/store/settings';
import { CATALOG_DEFAULT_FIELDS, PROJECT_TYPE_LABELS } from '@/types';
import type { CatalogDefaultField, ProjectType, Scenario } from '@/types';
import { FormSection } from './FormSection';
import { Stat } from './Stat';
import { markDefaultsTouched } from './helpers';

type Mode = 'new' | 'edit';

type Props = { mode: Mode };

export function ScenarioBuilder({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const existing = useScenarioStore((s) =>
    id ? s.scenarios.find((sc) => sc.id === id) : undefined
  );
  const update = useScenarioStore((s) => s.update);
  const addToStore = useScenarioStore((s) => s.add);
  const setRecent = useScenarioStore((s) => s.setRecent);

  const bomByType = useSettingsStore((s) => s.bomByProjectType);
  const catalogs = useSettingsStore((s) => s.catalogs);
  const activeCatalogId = useSettingsStore((s) => s.activeCatalogId);
  const activeCatalog = useSettingsStore(selectActiveCatalog);

  const initial = useMemo<Scenario>(() => {
    if (mode === 'edit' && existing) return existing;
    return createScenario({
      catalog: activeCatalog,
      bomByProjectType: bomByType,
      catalogVersionId: activeCatalogId,
    });
  }, [mode, existing, activeCatalog, activeCatalogId, bomByType]);

  const [draft, setDraft] = useState<Scenario>(initial);
  const [costsOpen, setCostsOpen] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && existing) {
      // Editing an existing scenario freezes its catalog-default fields so
      // they don't get blown away by re-deriving on type change.
      const flags = existing.manualOverrides?.defaults ?? {};
      const allFlagged = CATALOG_DEFAULT_FIELDS.every((f) => flags[f] === true);
      setDraft(
        allFlagged
          ? existing
          : {
              ...existing,
              manualOverrides: {
                ...existing.manualOverrides,
                defaults: Object.fromEntries(
                  CATALOG_DEFAULT_FIELDS.map((f) => [f, true])
                ) as Record<CatalogDefaultField, boolean>,
              },
            }
      );
    }
  }, [mode, existing]);

  const capex = capexBreakdown(draft.materials);
  const loanAmount = loanAmountForScenario(capex.total, draft.financing);
  const equity = Math.max(0, capex.total - loanAmount);
  const omYear1 = (capex.total * (draft.om.percentOfCapex ?? 0)) / 100;

  const setName = useCallback((name: string) => {
    setDraft((d) => ({ ...d, name }));
  }, []);

  const setProjectType = useCallback(
    (newType: ProjectType) => {
      setDraft((d) => {
        if (d.projectType === newType) return d;
        const catalog = resolveCatalog(catalogs, d.catalogVersionId, activeCatalogId);
        const withDefaults = applyCatalogDefaults(
          { ...d, projectType: newType },
          catalog,
          newType
        );
        const newMaterials = deriveMaterials({
          sizeMW: withDefaults.basics.sizeMW,
          bom: bomByType[newType],
          catalog,
          previous: withDefaults.materials,
          overrides: withDefaults.manualOverrides,
        });
        return { ...withDefaults, materials: newMaterials };
      });
    },
    [bomByType, catalogs, activeCatalogId]
  );

  const setSizeMW = useCallback(
    (sizeMW: number) => {
      setDraft((d) => {
        if (d.basics.sizeMW === sizeMW) return d;
        const catalog = resolveCatalog(catalogs, d.catalogVersionId, activeCatalogId);
        const newMaterials = deriveMaterials({
          sizeMW,
          bom: bomByType[d.projectType],
          catalog,
          previous: d.materials,
          overrides: d.manualOverrides,
        });
        return {
          ...d,
          basics: { ...d.basics, sizeMW },
          materials: newMaterials,
        };
      });
    },
    [bomByType, catalogs, activeCatalogId]
  );

  const setPpaRate = useCallback((ppaRate: number) => {
    setDraft((d) => ({ ...d, revenue: { ...d.revenue, ppaRate } }));
  }, []);

  const setFinanced = useCallback((financedPct: number) => {
    setDraft((d) => ({
      ...d,
      financing: { ...d.financing, financedPct },
    }));
  }, []);

  const setInterest = useCallback((interestPct: number) => {
    setDraft((d) => ({
      ...d,
      financing: { ...d.financing, interestPct },
    }));
  }, []);

  const setTermYears = useCallback((termYears: number) => {
    setDraft((d) => {
      const tt = Math.max(1, Math.round(termYears));
      const grace = Math.min(d.financing.gracePeriodYears, tt);
      return {
        ...d,
        financing: {
          ...d.financing,
          termYears: tt,
          gracePeriodYears: grace,
        },
      };
    });
  }, []);

  const setGrace = useCallback((gracePeriodYears: number) => {
    setDraft((d) => ({
      ...d,
      financing: {
        ...d.financing,
        gracePeriodYears: Math.max(
          0,
          Math.min(d.financing.termYears, Math.round(gracePeriodYears))
        ),
      },
    }));
  }, []);

  const onCostBreakdownChange = useCallback((next: Scenario) => {
    setDraft(next);
  }, []);

  function onSave() {
    if (mode === 'new') {
      const saved = addToStore({
        name: draft.name,
        projectType: draft.projectType,
        status: draft.status,
        basics: draft.basics,
        revenue: draft.revenue,
        om: draft.om,
        financing: draft.financing,
        materials: draft.materials,
        catalog: activeCatalog,
        catalogVersionId: draft.catalogVersionId,
        bomByProjectType: bomByType,
      });
      // The store's `add` rebuilds via createScenario; preserve our authored
      // draft (materials + manualOverrides + frozen defaults).
      update(saved.id, (s) => ({
        ...s,
        basics: draft.basics,
        revenue: draft.revenue,
        om: draft.om,
        materials: draft.materials,
        manualOverrides: markDefaultsTouched(draft, ...CATALOG_DEFAULT_FIELDS)
          .manualOverrides,
        catalogVersionId: draft.catalogVersionId,
      }));
      setRecent(saved.id);
      navigate(`/scenarios/${saved.id}`);
    } else {
      const persisted = markDefaultsTouched(draft, ...CATALOG_DEFAULT_FIELDS);
      update(persisted.id, () => persisted);
      setRecent(persisted.id);
      navigate(`/scenarios/${persisted.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <h1 className="font-headline-xl text-headline-xl text-primary">
          {mode === 'new' ? 'New Scenario' : 'Edit Scenario'}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Tweak project size, PPA rate and financing — everything else flows from your
          active price catalog. Costs auto-derive from BOM × catalog and stay editable in
          the breakdown below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-md items-start">
        <aside className="lg:col-span-1 flex flex-col gap-md lg:sticky lg:top-24">
          <EstimateCard total={capex.total} />
          <div className="rounded-xl bg-surface-container-low p-md border border-outline-variant/30 flex flex-col gap-2">
            <Stat label="Equity (you fund)" value={formatINR(equity)} />
            <Stat label="Loan" value={formatINR(loanAmount)} />
            <Stat label="Year-1 O&M" value={formatINR(omYear1)} accent />
          </div>
        </aside>

        <section className="lg:col-span-3 flex flex-col gap-lg bg-surface-container-lowest rounded-2xl p-md lg:p-lg shadow-card-xl border border-outline-variant/30">
          <FormSection title="Scenario">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Scenario name
                </span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bangalore Tech Park Solar"
                  className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Project type
                </span>
                <select
                  value={draft.projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
                >
                  {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((k) => (
                    <option key={k} value={k}>
                      {PROJECT_TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Changing this re-applies catalog defaults (lifespan, CUF, O&amp;M %, …)
                  for the new type.
                </span>
              </label>
            </div>
          </FormSection>

          <FormSection title="Project sizing">
            <Slider
              id="plant_size"
              label="Plant Size"
              value={draft.basics.sizeMW}
              onChange={setSizeMW}
              min={0.05}
              max={10}
              step={0.05}
              variant="mw"
              hint="Material quantities scale with plant size via your BOM template."
            />
          </FormSection>

          <FormSection title="Revenue">
            <Slider
              id="ppa_rate"
              label="PPA Rate"
              value={draft.revenue.ppaRate}
              onChange={setPpaRate}
              min={1}
              max={10}
              step={0.05}
              variant="plain"
              suffix="₹/kWh"
              tooltip={{
                label: 'PPA',
                content:
                  'Power Purchase Agreement rate: the fixed rupees per kWh you sell electricity at. India C&I typically ₹3–5/kWh.',
              }}
              hint={`PPA escalation (${draft.revenue.ppaEscalationPct}% / yr) is sourced from the active catalog defaults.`}
            />
          </FormSection>

          <FormSection title="Financing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              <Slider
                id="financed_pct"
                label="% of Project Cost Financed"
                value={draft.financing.financedPct}
                onChange={setFinanced}
                min={0}
                max={100}
                step={1}
                variant="percent"
                hint={`Implied loan: ${formatINR(loanAmount)}`}
              />
              <Slider
                id="interest_pct"
                label="Interest Rate"
                value={draft.financing.interestPct}
                onChange={setInterest}
                min={0}
                max={20}
                step={0.1}
                variant="percent"
              />
              <Slider
                id="term_years"
                label="Loan Term"
                value={draft.financing.termYears}
                onChange={setTermYears}
                min={1}
                max={25}
                step={1}
                variant="years"
              />
              <Slider
                id="grace_years"
                label="Grace Period"
                value={draft.financing.gracePeriodYears}
                onChange={setGrace}
                min={0}
                max={Math.max(0, draft.financing.termYears)}
                step={1}
                variant="years"
                tooltip={{
                  label: 'Grace Period',
                  content:
                    'Years before principal repayment starts. Only interest accrues during this time.',
                }}
              />
            </div>
          </FormSection>

          <FormSection
            title="Cost breakdown"
            subtitle={`Auto-derived from ${PROJECT_TYPE_LABELS[draft.projectType]} BOM × ${draft.catalogVersionId === activeCatalog.id ? 'active' : 'frozen'} catalog. Override individual rows or add custom items.`}
            collapsible
            open={costsOpen}
            onToggle={() => setCostsOpen((v) => !v)}
          >
            <CostBreakdownPanel scenario={draft} onChange={onCostBreakdownChange} />
          </FormSection>

          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-sm pt-md border-t border-outline-variant/30 mt-sm">
            <Button
              variant="primary"
              size="lg"
              onClick={onSave}
              iconRight={<Icon name="check" />}
              fullWidth
              className="md:w-auto"
            >
              {mode === 'new' ? 'Save & view results' : 'Save changes'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
