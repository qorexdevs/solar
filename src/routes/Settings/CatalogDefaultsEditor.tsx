import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE } from '@/lib/catalog';
import { PROJECT_TYPE_LABELS } from '@/types';
import type { CatalogDefaults, PriceCatalog, ProjectType } from '@/types';

const DEFAULT_FIELD_CONFIG: ReadonlyArray<{
  key: keyof CatalogDefaults;
  label: string;
  suffix: string;
  step: number;
}> = [
  { key: 'lifespanYears', label: 'Lifespan', suffix: 'years', step: 1 },
  { key: 'degradationPct', label: 'Panel degradation', suffix: '% / yr', step: 0.05 },
  { key: 'inflationPct', label: 'Inflation', suffix: '%', step: 0.1 },
  { key: 'discountPct', label: 'Discount rate', suffix: '%', step: 0.1 },
  { key: 'cufPct', label: 'Capacity Utilization Factor', suffix: '%', step: 0.5 },
  { key: 'ppaEscalationPct', label: 'PPA escalation', suffix: '% / yr', step: 0.1 },
  { key: 'omPercentOfCapex', label: 'O&M', suffix: '% of CAPEX', step: 0.05 },
];

type Props = {
  catalog: PriceCatalog;
  onChange: (type: ProjectType, patch: Partial<CatalogDefaults>) => void;
  onResetType: (type: ProjectType) => void;
};

export function CatalogDefaultsEditor({ catalog, onChange, onResetType }: Props) {
  const types = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];
  const [type, setType] = useState<ProjectType>('utility');
  const defaults =
    catalog.defaults?.[type] ?? DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE[type];

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 h-9 rounded-full font-label-sm text-label-sm border transition-colors ${
              t === type
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-variant'
            }`}
          >
            {PROJECT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        {DEFAULT_FIELD_CONFIG.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {field.label}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={field.step}
                value={defaults[field.key]}
                onChange={(e) =>
                  onChange(type, {
                    [field.key]: Number(e.target.value),
                  } as Partial<CatalogDefaults>)
                }
                className="h-touch-target w-32 rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md text-right"
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {field.suffix}
              </span>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-sm border-t border-outline-variant/30">
        <Button
          variant="ghost"
          iconLeft={<Icon name="restart_alt" />}
          onClick={() => onResetType(type)}
        >
          Reset {PROJECT_TYPE_LABELS[type]} to industry baseline
        </Button>
      </div>
    </div>
  );
}
