import {
  BUSINESS_MODEL_VALUES,
  MATERIAL_FACET_LABELS,
  MATERIAL_FACET_VALUE_LABELS,
  MONITORING_VALUES,
  MOUNTING_VALUES,
  VOLTAGE_CLASS_VALUES,
  type BusinessModelValue,
  type MaterialFacetTags,
  type MonitoringValue,
  type MountingValue,
  type VoltageClassValue,
} from '@/types';

type Props = {
  value: MaterialFacetTags;
  onChange: (next: MaterialFacetTags) => void;
};

/**
 * Multi-select chip groups for the four catalog facets. AND across facets,
 * OR within. An empty selection means "no constraint on that facet".
 */
export function FacetFilterBar({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-md">
      <FacetGroup<MountingValue>
        label={MATERIAL_FACET_LABELS.mounting}
        options={MOUNTING_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.mounting}
        selected={value.mounting ?? []}
        onChange={(next) => onChange({ ...value, mounting: next })}
      />
      <FacetGroup<VoltageClassValue>
        label={MATERIAL_FACET_LABELS.voltageClass}
        options={VOLTAGE_CLASS_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.voltageClass}
        selected={value.voltageClass ?? []}
        onChange={(next) => onChange({ ...value, voltageClass: next })}
      />
      <FacetGroup<BusinessModelValue>
        label={MATERIAL_FACET_LABELS.businessModel}
        options={BUSINESS_MODEL_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.businessModel}
        selected={value.businessModel ?? []}
        onChange={(next) => onChange({ ...value, businessModel: next })}
      />
      <FacetGroup<MonitoringValue>
        label={MATERIAL_FACET_LABELS.monitoring}
        options={MONITORING_VALUES}
        labels={MATERIAL_FACET_VALUE_LABELS.monitoring}
        selected={value.monitoring ?? []}
        onChange={(next) => onChange({ ...value, monitoring: next })}
      />
    </div>
  );
}

function FacetGroup<T extends string>({
  label,
  options,
  labels,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(opt: T) {
    const has = selected.includes(opt);
    const next = has ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm border transition-colors ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
