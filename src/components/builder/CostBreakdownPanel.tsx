import { Link } from 'react-router-dom';
import type { LineItem, ManualMaterialOverrides, MaterialKey, Scenario } from '@/types';
import {
  MATERIAL_KEYS,
  MATERIAL_LABELS,
  MATERIAL_UNIT_LABELS,
  PROJECT_TYPE_LABELS,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { uid } from '@/lib/uid';
import { capexBreakdown } from '@/lib/calc';
import { deriveMaterials, resolveCatalog } from '@/lib/catalog';
import { formatINR, formatIndianGroup } from '@/lib/format';
import { useSettingsStore, selectActiveCatalog } from '@/store/settings';

type Props = {
  scenario: Scenario;
  onChange: (next: Scenario) => void;
};

/**
 * Auto-derived cost breakdown panel.
 *
 * Reads BOM + catalog from the settings store, so a scenario's `materials`
 * stays in sync with whatever is currently active. Per-row manual overrides
 * (tracked under `scenario.manualOverrides.materials`) escape the auto-derive
 * loop until the user resets the row.
 */
export function CostBreakdownPanel({ scenario, onChange }: Props) {
  const catalogs = useSettingsStore((s) => s.catalogs);
  const activeCatalogId = useSettingsStore((s) => s.activeCatalogId);
  const activeCatalog = useSettingsStore(selectActiveCatalog);
  const bomByType = useSettingsStore((s) => s.bomByProjectType);

  const referencedCatalog = resolveCatalog(
    catalogs,
    scenario.catalogVersionId,
    activeCatalogId
  );
  const isOnLatestCatalog = referencedCatalog.id === activeCatalog.id;
  const bom = bomByType[scenario.projectType];

  const { materials } = scenario;
  const breakdown = capexBreakdown(materials);
  const materialFlags: ManualMaterialOverrides =
    scenario.manualOverrides?.materials ?? {};

  function setMaterialOverride(
    key: MaterialKey,
    field: 'unitCost' | 'quantity',
    flag: boolean
  ): ManualMaterialOverrides {
    const existing = materialFlags[key] ?? {};
    return { ...materialFlags, [key]: { ...existing, [field]: flag } };
  }

  function updateMaterial(key: MaterialKey, patch: Partial<LineItem>) {
    const fields = (Object.keys(patch) as Array<keyof LineItem>).filter(
      (k) => k === 'unitCost' || k === 'quantity'
    ) as Array<'unitCost' | 'quantity'>;
    let nextFlags: ManualMaterialOverrides = materialFlags;
    for (const f of fields) nextFlags = setMaterialOverride(key, f, true);

    onChange({
      ...scenario,
      materials: { ...materials, [key]: { ...materials[key], ...patch } },
      manualOverrides: { ...scenario.manualOverrides, materials: nextFlags },
    });
  }

  function resetMaterialRow(key: MaterialKey) {
    const stripped: ManualMaterialOverrides = { ...materialFlags };
    delete stripped[key];
    const next = deriveMaterials({
      sizeMW: scenario.basics.sizeMW,
      bom,
      catalog: referencedCatalog,
      previous: materials,
      overrides: { ...scenario.manualOverrides, materials: stripped },
    });
    onChange({
      ...scenario,
      materials: { ...materials, [key]: next[key] },
      manualOverrides: { ...scenario.manualOverrides, materials: stripped },
    });
  }

  function repriceToLatest() {
    if (isOnLatestCatalog) return;
    const ok = window.confirm(
      `Re-price this scenario from "${referencedCatalog.label}" to the latest catalog "${activeCatalog.label}"? Manually overridden rows will keep their values.`
    );
    if (!ok) return;
    const next = deriveMaterials({
      sizeMW: scenario.basics.sizeMW,
      bom,
      catalog: activeCatalog,
      previous: materials,
      overrides: scenario.manualOverrides,
    });
    onChange({ ...scenario, materials: next, catalogVersionId: activeCatalog.id });
  }

  function updateCustom(id: string, patch: Partial<LineItem>) {
    onChange({
      ...scenario,
      materials: {
        ...materials,
        custom: materials.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    });
  }

  function addCustom() {
    onChange({
      ...scenario,
      materials: {
        ...materials,
        custom: [
          ...materials.custom,
          { id: uid('li'), name: 'Custom item', unitCost: 1000, quantity: 1 },
        ],
      },
    });
  }

  function removeCustom(id: string) {
    onChange({
      ...scenario,
      materials: { ...materials, custom: materials.custom.filter((c) => c.id !== id) },
    });
  }

  return (
    <div className="flex flex-col gap-md">
      <header className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            Cost source
          </p>
          <p className="font-body-md text-body-md text-on-surface">
            <strong className="font-semibold">
              {PROJECT_TYPE_LABELS[scenario.projectType]}
            </strong>{' '}
            BOM × <strong className="font-semibold">{referencedCatalog.label}</strong>
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Quantities derive from plant size ({scenario.basics.sizeMW.toFixed(2)} MW) and
            the BOM template. Unit prices come from the catalog.
            {!isOnLatestCatalog && (
              <> A newer catalog "{activeCatalog.label}" is available.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          {!isOnLatestCatalog && (
            <Button
              variant="primary"
              iconLeft={<Icon name="autorenew" />}
              onClick={repriceToLatest}
            >
              Re-price to latest
            </Button>
          )}
          <Link to="/settings">
            <Button variant="ghost" iconLeft={<Icon name="tune" />}>
              Manage catalog
            </Button>
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full text-body-md">
          <thead>
            <tr className="text-left text-on-surface-variant bg-surface-container-low/40 border-b border-outline-variant/30">
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Unit price (₹)</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {MATERIAL_KEYS.map((key) => {
              const item = materials[key];
              const subtotal = breakdown.byKey[key]?.amount ?? 0;
              const flags = materialFlags[key];
              const rule = bom[key];
              const unit = rule?.unit ?? 'lot';
              const isOverridden = !!(flags?.unitCost || flags?.quantity);
              return (
                <MaterialDerivedRow
                  key={key}
                  label={MATERIAL_LABELS[key]}
                  item={item}
                  subtotal={subtotal}
                  unitLabel={MATERIAL_UNIT_LABELS[unit]}
                  flags={flags}
                  isOverridden={isOverridden}
                  onUnitCost={(v) => updateMaterial(key, { unitCost: v })}
                  onQty={(v) => updateMaterial(key, { quantity: v })}
                  onReset={() => resetMaterialRow(key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-outline-variant/40 pt-md flex flex-col gap-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">
            Custom line items
          </h3>
          <Button
            variant="ghost"
            iconLeft={<Icon name="add" />}
            onClick={addCustom}
            size="md"
          >
            Add item
          </Button>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Use these for one-offs that aren't part of the standard BOM (permits, land
          lease, contingency, …).
        </p>
        {materials.custom.length === 0 ? (
          <p className="font-body-md text-on-surface-variant italic">
            No custom items yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-sm">
            {materials.custom.map((item) => (
              <CustomCostRow
                key={item.id}
                item={item}
                subtotal={breakdown.byKey[item.id]?.amount ?? 0}
                onName={(v) => updateCustom(item.id, { name: v })}
                onUnitCost={(v) => updateCustom(item.id, { unitCost: v })}
                onQty={(v) => updateCustom(item.id, { quantity: v })}
                onRemove={() => removeCustom(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-container-low rounded-xl p-md flex justify-between items-center border border-outline-variant/30">
        <span className="font-body-md text-on-surface-variant">Total CAPEX</span>
        <span className="font-data-display text-data-display text-primary">
          {formatINR(breakdown.total)}
        </span>
      </div>
    </div>
  );
}

type DerivedRowProps = {
  label: string;
  item: LineItem;
  subtotal: number;
  unitLabel: string;
  flags: ManualMaterialOverrides[MaterialKey];
  isOverridden: boolean;
  onUnitCost: (n: number) => void;
  onQty: (n: number) => void;
  onReset: () => void;
};

function MaterialDerivedRow({
  label,
  item,
  subtotal,
  unitLabel,
  flags,
  isOverridden,
  onUnitCost,
  onQty,
  onReset,
}: DerivedRowProps) {
  return (
    <tr className="border-b border-outline-variant/20 last:border-b-0 align-top">
      <td className="px-3 py-3">
        <div className="font-body-md text-body-md font-semibold text-on-surface">
          {label}
        </div>
        {isOverridden && (
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">
            <Icon name="edit" className="text-[12px]" />
            Manual
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <input
          type="number"
          inputMode="decimal"
          step={1}
          min={0}
          value={item.quantity}
          onChange={(e) => onQty(Number(e.target.value))}
          className={`h-9 w-28 rounded-md border bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-right ${
            flags?.quantity ? 'border-tertiary' : 'border-outline-variant'
          }`}
        />
        <div className="font-label-sm text-label-sm text-on-surface-variant mt-1">
          {item.quantity
            ? `${formatIndianGroup(Math.round(item.quantity))} ${unitLabel}`
            : '—'}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <input
          type="number"
          inputMode="decimal"
          step={100}
          min={0}
          value={item.unitCost}
          onChange={(e) => onUnitCost(Number(e.target.value))}
          className={`h-9 w-32 rounded-md border bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-right ${
            flags?.unitCost ? 'border-tertiary' : 'border-outline-variant'
          }`}
        />
      </td>
      <td className="px-3 py-3 text-right font-data-display text-on-surface">
        {formatINR(subtotal)}
      </td>
      <td className="px-3 py-3 text-right">
        {isOverridden ? (
          <button
            type="button"
            onClick={onReset}
            className="text-primary font-label-sm text-label-sm flex items-center gap-1 ml-auto"
          >
            <Icon name="restart_alt" className="text-[16px]" />
            Reset
          </button>
        ) : (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Auto
          </span>
        )}
      </td>
    </tr>
  );
}

type CustomRowProps = {
  item: LineItem;
  subtotal: number;
  onName: (v: string) => void;
  onUnitCost: (n: number) => void;
  onQty: (n: number) => void;
  onRemove: () => void;
};

function CustomCostRow({
  item,
  subtotal,
  onName,
  onUnitCost,
  onQty,
  onRemove,
}: CustomRowProps) {
  return (
    <div className="bg-surface-container-low/40 p-sm rounded-lg border border-outline-variant/30 flex flex-col gap-sm">
      <div className="flex items-end justify-between gap-sm">
        <div className="flex flex-col gap-xs flex-1 min-w-0">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">
            Item name
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onName(e.target.value)}
            className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
          />
        </div>
        <div className="text-right shrink-0">
          <span className="font-label-sm text-label-sm text-on-surface-variant block">
            Subtotal
          </span>
          <span className="font-body-md text-body-md font-semibold text-on-surface">
            {formatINR(subtotal)}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="h-touch-target w-touch-target inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container shrink-0"
        >
          <Icon name="delete" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Unit cost (₹)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            value={item.unitCost}
            onChange={(e) => onUnitCost(Number(e.target.value))}
            className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md text-right"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Quantity
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={item.quantity}
            onChange={(e) => onQty(Number(e.target.value))}
            className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md text-right"
          />
        </label>
      </div>
    </div>
  );
}
