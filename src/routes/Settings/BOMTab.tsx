import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSettingsStore } from '@/store/settings';
import { MATERIAL_KEYS, PROJECT_TYPE_LABELS } from '@/types';
import type { ProjectType } from '@/types';
import { BOMRow } from './BOMRow';

export function BOMTab() {
  const bomByType = useSettingsStore((s) => s.bomByProjectType);
  const updateRule = useSettingsStore((s) => s.updateBOMRule);
  const resetBOM = useSettingsStore((s) => s.resetBOM);
  const [type, setType] = useState<ProjectType>('utility');

  const types = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];

  const bom = bomByType[type];

  return (
    <div className="flex flex-col gap-md">
      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col gap-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Project type
            </p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              {PROJECT_TYPE_LABELS[type]}
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Quantity-per-MW rules used to scale a scenario's materials with plant size.
            </p>
          </div>
          <div className="flex gap-sm">
            <Button
              variant="ghost"
              iconLeft={<Icon name="restart_alt" />}
              onClick={() => resetBOM(type)}
            >
              Reset to defaults
            </Button>
          </div>
        </div>

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

        <div className="overflow-x-auto">
          <table className="w-full text-body-md">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
                <th className="py-2 pr-2">Material</th>
                <th className="py-2 pr-2">Unit</th>
                <th className="py-2 pr-2 text-right">Per MW</th>
                <th className="py-2 pr-2">Scale</th>
              </tr>
            </thead>
            <tbody>
              {MATERIAL_KEYS.map((key) => (
                <BOMRow
                  key={key}
                  materialKey={key}
                  rule={bom[key]}
                  onChange={(patch) => updateRule(type, key, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          <strong>Linear</strong>: quantity = perMW × plant size. <strong>Fixed</strong>:
          quantity stays at perMW regardless of size.
        </p>
      </section>
    </div>
  );
}
