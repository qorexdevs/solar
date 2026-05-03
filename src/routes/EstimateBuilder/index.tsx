import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { CostBreakdownPanel } from '@/components/builder/CostBreakdownPanel';
import { EstimateCard } from '@/components/builder/EstimateCard';
import { capexBreakdown, loanAmountForEstimate } from '@/lib/calc';
import { defaultFinanceLayer, recomputeMaterialization } from '@/lib/estimate';
import { formatINR, formatPlantCapacityKW } from '@/lib/format';
import { useEstimateStore } from '@/store/estimates';
import { useTemplateStore } from '@/store/templates';
import {
  PROJECT_TYPE_LABELS,
  SYNC_TYPE_LABELS,
  type FinanceLayer,
  type ScenarioTemplate,
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

  const templates = useTemplateStore((s) => s.templates);
  const estimate = useEstimateStore((s) =>
    id ? s.estimates.find((e) => e.id === id) : undefined
  );

  const createFromTemplate = useEstimateStore((s) => s.createFromTemplate);
  const update = useEstimateStore((s) => s.update);
  const setName = useEstimateStore((s) => s.setName);
  const setTargetCapacity = useEstimateStore((s) => s.setTargetCapacity);
  const setSelectedOptions = useEstimateStore((s) => s.setSelectedOptions);
  const setLocation = useEstimateStore((s) => s.setLocation);
  const enableFinance = useEstimateStore((s) => s.enableFinance);
  const disableFinance = useEstimateStore((s) => s.disableFinance);
  const updateFinance = useEstimateStore((s) => s.updateFinance);
  const setRecent = useEstimateStore((s) => s.setRecent);

  const [pickerTemplateId, setPickerTemplateId] = useState<string | null>(null);

  // ----- Mode: new — show template picker first ----------------------------
  if (mode === 'new') {
    return (
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-sm">
          <h1 className="font-headline-xl text-headline-xl text-primary">
            New estimate
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Pick a scenario template, set a target capacity, and the system
            scales the BOM and produces totals.
          </p>
        </div>
        <TemplatePicker
          templates={templates}
          selectedId={pickerTemplateId}
          onSelect={setPickerTemplateId}
        />
        <div className="flex justify-end gap-sm">
          <Link
            to="/"
            className="px-md py-sm text-on-surface-variant hover:text-primary"
          >
            Cancel
          </Link>
          <Button
            variant="primary"
            disabled={!pickerTemplateId}
            iconRight={<Icon name="arrow_forward" />}
            onClick={() => {
              const template = templates.find((t) => t.id === pickerTemplateId);
              if (!template) return;
              const est = createFromTemplate({ template });
              setRecent(est.id);
              navigate(`/estimates/${est.id}/edit`);
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ----- Mode: edit --------------------------------------------------------
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

  const template = templates.find((t) => t.id === estimate.templateId);

  return (
    <EditView
      template={template}
      estimateId={estimate.id}
      name={estimate.name}
      targetKW={estimate.targetCapacityKW}
      selectedMain={estimate.selectedOptions.mainBomLineIds}
      selectedScope={estimate.selectedOptions.otherScopeIds}
      finance={estimate.finance}
      hasLocation={!!estimate.location}
      onChangeName={(n) => setName(estimate.id, n)}
      onChangeTarget={(n) => setTargetCapacity(estimate.id, n)}
      onChangeOptions={(opts) => setSelectedOptions(estimate.id, opts)}
      onEnableFinance={(p) => enableFinance(estimate.id, p)}
      onDisableFinance={() => disableFinance(estimate.id)}
      onUpdateFinance={(p) => updateFinance(estimate.id, p)}
      onSetLocation={(loc) => setLocation(estimate.id, loc)}
      onResync={() => {
        if (!template) return;
        update(estimate.id, (e) => recomputeMaterialization(e, template));
      }}
      onSave={() => {
        setRecent(estimate.id);
        navigate(`/estimates/${estimate.id}`);
      }}
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Edit view                                                                 */
/* ------------------------------------------------------------------------ */

type EditProps = {
  template: ScenarioTemplate | undefined;
  estimateId: string;
  name: string;
  targetKW: number;
  selectedMain: string[];
  selectedScope: string[];
  finance: FinanceLayer | undefined;
  hasLocation: boolean;
  onChangeName: (n: string) => void;
  onChangeTarget: (kw: number) => void;
  onChangeOptions: (opts: {
    mainBomLineIds: string[];
    otherScopeIds: string[];
  }) => void;
  onEnableFinance: (patch?: Partial<FinanceLayer>) => void;
  onDisableFinance: () => void;
  onUpdateFinance: (patch: Partial<FinanceLayer>) => void;
  onSetLocation: (loc: import('@/types').ScenarioLocation | undefined) => void;
  onResync: () => void;
  onSave: () => void;
};

function EditView(p: EditProps) {
  const estimate = useEstimateStore((s) =>
    s.estimates.find((e) => e.id === p.estimateId)
  );

  if (!estimate || !p.template) {
    return (
      <div className="rounded border border-error/40 bg-error/5 p-md text-on-surface">
        <p>
          Template{' '}
          <code className="text-primary">{estimate?.templateId ?? ''}</code>{' '}
          no longer exists. Re-link to a template to continue editing.
        </p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to estimates
        </Link>
      </div>
    );
  }

  const { template } = p;

  const includedMain = useMemo(() => new Set(p.selectedMain), [p.selectedMain]);
  const includedScope = useMemo(
    () => new Set(p.selectedScope),
    [p.selectedScope]
  );

  function toggleMain(id: string) {
    const next = new Set(includedMain);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    p.onChangeOptions({
      mainBomLineIds: [...next],
      otherScopeIds: p.selectedScope,
    });
  }

  function toggleScope(id: string) {
    const next = new Set(includedScope);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    p.onChangeOptions({
      mainBomLineIds: p.selectedMain,
      otherScopeIds: [...next],
    });
  }

  const optionalMain = template.mainBom.filter(
    (l) => l.isOptional || l.scalingType === 'optional'
  );
  const optionalScope = template.otherScope.filter(
    (s) => s.isOptional || s.scalingType === 'optional'
  );

  const capex = capexBreakdown(estimate.materialized);
  const loanAmount = estimate.finance?.enabled
    ? loanAmountForEstimate(capex.total, estimate.finance.financing)
    : 0;
  const equity = Math.max(0, capex.total - loanAmount);

  const baseTarget = template.baseCapacityKW;
  const minSlider = Math.max(50, Math.round(baseTarget * 0.1));
  const maxSlider = Math.max(baseTarget * 2, baseTarget + 200);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <Link to="/" className="text-body-sm text-on-surface-variant hover:text-primary">
          ← All estimates
        </Link>
        <input
          value={p.name}
          onChange={(e) => p.onChangeName(e.target.value)}
          className="font-headline-xl text-headline-xl text-primary bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
        />
        <p className="font-body-md text-body-md text-on-surface-variant">
          Built from{' '}
          <Link to={`/templates/${template.id}`} className="text-primary hover:underline">
            {template.name}
          </Link>{' '}
          (v{template.version}, base {formatPlantCapacityKW(baseTarget)},{' '}
          {SYNC_TYPE_LABELS[template.syncType]},{' '}
          {PROJECT_TYPE_LABELS[template.projectType]})
        </p>
        {estimate.selectedVersion !== template.version && (
          <div className="rounded border border-tertiary/40 bg-tertiary/5 p-sm flex items-center justify-between gap-sm">
            <span className="text-body-sm">
              This estimate was built against template version{' '}
              <strong>{estimate.selectedVersion}</strong>; the template is now{' '}
              <strong>v{template.version}</strong>.
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
                estimate.totals.otherScopeSubtotal +
                  estimate.totals.otherScopeGst
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
              value={p.targetKW}
              onChange={(n) => p.onChangeTarget(Math.round(n))}
              min={minSlider}
              max={maxSlider}
              step={10}
              variant="plain"
              formatValue={formatPlantCapacityKW}
              minMaxFormat={formatPlantCapacityKW}
              hint={`Template base is ${formatPlantCapacityKW(baseTarget)}. Linear lines scale pro-rata; step lines re-bucket.`}
            />
          </FormSection>

          {optionalMain.length > 0 && (
            <FormSection
              title="Optional Main BOM lines"
              subtitle={`${optionalMain.length} optional line(s). Toggle on to include.`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                {optionalMain.map((line) => (
                  <label
                    key={line.id}
                    className="flex items-center gap-sm rounded border border-outline-variant px-sm py-2 hover:bg-surface-container-low cursor-pointer"
                  >
                    <Switch
                      checked={includedMain.has(line.id)}
                      onChange={() => toggleMain(line.id)}
                      label={line.itemName}
                    />
                    <div className="flex-1">
                      <div className="font-body-md text-body-md">{line.itemName}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        ₹ {formatINR(line.baseQuantity * line.rate)} base
                        {line.isOptional && ' · optional'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </FormSection>
          )}

          {optionalScope.length > 0 && (
            <FormSection
              title="Optional Other Scope items"
              subtitle="Customer-add-on items priced as a single amount."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                {optionalScope.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-sm rounded border border-outline-variant px-sm py-2 hover:bg-surface-container-low cursor-pointer"
                  >
                    <Switch
                      checked={includedScope.has(item.id)}
                      onChange={() => toggleScope(item.id)}
                      label={item.scopeName}
                    />
                    <div className="flex-1">
                      <div className="font-body-md text-body-md">{item.scopeName}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        ₹ {formatINR(item.baseAmount)} base · {item.scalingType}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </FormSection>
          )}

          <FormSection
            title="Cost breakdown"
            subtitle="Live preview at the current target capacity. Lines hidden by sync gating are shown grey."
            collapsible
            open={true}
          >
            <CostBreakdownPanel materialized={estimate.materialized} />
          </FormSection>

          {/* Finance toggle ---------------------------------------------- */}
          <FinanceSection
            finance={p.finance}
            onEnable={() => p.onEnableFinance({ ...defaultFinanceLayer(true) })}
            onDisable={p.onDisableFinance}
            onUpdate={p.onUpdateFinance}
          />

          {p.finance?.enabled && (
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

/* ------------------------------------------------------------------------ */
/* Finance section                                                           */
/* ------------------------------------------------------------------------ */

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
      subtitle="Optional layer: enables IRR / NPV / cash flows / PPA / yield-from-irradiance for this estimate."
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
