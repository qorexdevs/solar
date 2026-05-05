import { useCallback, useMemo, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { composeEstimate } from '@/lib/composer';
import {
  defaultSelectionsFromFacets,
  facetPickerPrimaryLabel,
  remapMountingAfterSelectionsUpdate,
  resolveMountSnapshot,
  type MountKind,
} from '@/lib/estimate';
import { facetOptionButtonClass, facetStripAccent } from '@/lib/facets';
import { formatINR } from '@/lib/format';
import { MOUNTING_FACET_ID, VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';
import type {
  EstimateFacetSelections,
  MaterialCatalogItem,
  ScenarioTemplate,
  TemplateFacet,
} from '@/types';

export type DraftSelections = EstimateFacetSelections;

type Props = {
  facets: TemplateFacet[];
  templates: ScenarioTemplate[];
  catalogItems: MaterialCatalogItem[];
  selections: DraftSelections;
  onSelectionsChange: (next: DraftSelections) => void;
  /** When false (e.g. edit screen with EstimateCard), hide duplicate grand total strip. Default true */
  showPreviewStrip?: boolean;
};

const MOUNT_CHOICES: { kind: MountKind; label: string }[] = [
  { kind: 'ground', label: 'Ground mount' },
  { kind: 'roof', label: 'Rooftop mount' },
];

/**
 * Multi-facet template picker — one mutually-exclusive choice per facet.
 * Mounting is two semantic pills (Ground / Rooftop) wired to HT/LT seed pairs.
 */
export function TemplatePicker({
  facets,
  templates,
  catalogItems,
  selections,
  onSelectionsChange,
  showPreviewStrip = true,
}: Props) {
  const sortedFacets = useMemo(
    () => [...facets].sort((a, b) => a.sequence - b.sequence),
    [facets]
  );

  const templatesById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  );

  const hydrated = selections;

  const commit = useCallback(
    (next: DraftSelections) => {
      onSelectionsChange(remapMountingAfterSelectionsUpdate(hydrated, next, templatesById));
    },
    [hydrated, onSelectionsChange, templatesById]
  );

  const previewTotal = useMemo(() => {
    if (!showPreviewStrip) return 0;
    try {
      const { totals } = composeEstimate({
        facets: sortedFacets,
        selections: hydrated,
        selectedOptionsPerTemplate: {},
        targetCapacityKW: resolveTargetKw(hydrated, templatesById),
        catalogItems,
        templates,
      });
      return totals.grandTotal;
    } catch {
      return 0;
    }
  }, [hydrated, sortedFacets, catalogItems, templates, templatesById, showPreviewStrip]);

  const requiredMet = sortedFacets
    .filter((f) => f.required)
    .every((f) => !!hydrated[f.id]?.templateId);

  if (templates.filter((t) => t.status === 'active').length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-outline bg-surface-container-low p-2xl text-center">
        <Icon name="info" className="text-4xl text-on-surface-variant" />
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
          No active templates yet. Open Templates to mark templates Active first.
        </p>
      </div>
    );
  }

  const voltageTpl = (() => {
    const vid = hydrated[VOLTAGE_CLASS_FACET_ID]?.templateId;
    return vid ? templatesById.get(vid) : undefined;
  })();

  return (
    <div className="flex flex-col gap-lg">
      <div className="-mx-xs flex flex-nowrap gap-x-xl overflow-x-auto px-xs pb-xs items-start">
        {sortedFacets.map((facet) => {
          const accent = facetStripAccent(facet.id);

          const facetHeader = (
            <div
              className={`font-body-md font-semibold ${accent.labelTone} leading-snug`}
            >
              <span>{facet.name}</span>
              {facet.required ? (
                <span className="text-error ml-px" aria-hidden>
                  *
                </span>
              ) : (
                <span className="text-body-sm font-normal text-on-surface-variant ml-0.5">
                  (optional)
                </span>
              )}
            </div>
          );

          const columnShell = (children: ReactNode) => (
            <div
              key={facet.id}
              className="flex w-[12rem] max-w-[min(12rem,85vw)] shrink-0 flex-col gap-xs"
            >
              {facetHeader}
              {children}
            </div>
          );

          if (facet.id === MOUNTING_FACET_ID) {
            const mountSel = hydrated[facet.id]?.templateId;
            return columnShell(
              <div className="flex flex-col gap-xs" role="group" aria-label={facet.name}>
                {MOUNT_CHOICES.map(({ kind, label }) => {
                  const snap = resolveMountSnapshot(kind, voltageTpl, templatesById);
                  if (!snap) {
                    return (
                      <div
                        key={kind}
                        className="w-full max-w-[12rem] rounded-full border border-dashed border-outline-variant px-md py-xs text-body-sm text-on-surface-variant"
                      >
                        {label}: missing
                      </div>
                    );
                  }
                  const selected = mountSel === snap.templateId;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        commit({
                          ...hydrated,
                          [MOUNTING_FACET_ID]: snap,
                        })
                      }
                      className={facetOptionButtonClass(facet.id, selected)}
                    >
                      <span>{label}</span>
                      {selected && (
                        <Icon
                          name="check_circle"
                          className={`shrink-0 ${accent.checkTone}`}
                          filled
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          }

          const choices = templates.filter(
            (t) => t.status === 'active' && t.facetId === facet.id
          );
          const sel = hydrated[facet.id];

          if (choices.length === 0) {
            return columnShell(
              <p className="text-body-sm text-on-surface-variant">No active templates.</p>
            );
          }

          return columnShell(
            <div className="flex flex-col gap-xs" role="group" aria-label={facet.name}>
              {choices.map((tpl) => {
                const selected = sel?.templateId === tpl.id;
                const title = facetPickerPrimaryLabel(facet.id, tpl);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      commit({
                        ...hydrated,
                        [facet.id]: {
                          templateId: tpl.id,
                          selectedVersion: tpl.version,
                        },
                      })
                    }
                    className={facetOptionButtonClass(facet.id, selected)}
                  >
                    <span>{title}</span>
                    {selected && (
                      <Icon
                        name="check_circle"
                        className={`shrink-0 ${accent.checkTone}`}
                        filled
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {showPreviewStrip && (
        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-lg border border-outline-variant shadow-card">
          <span className="font-body-md text-on-surface-variant">Grand total preview</span>
          <span className="font-headline-md text-headline-md text-primary">
            ₹ {formatINR(previewTotal)}
            {!requiredMet && (
              <span className="text-body-sm font-normal text-on-surface-variant ml-1">
                (finish required facets)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** For builder “new estimate” UX */
export function initialDraftSelections(
  facets: TemplateFacet[],
  templates: ScenarioTemplate[]
): DraftSelections {
  const map = new Map(templates.map((t) => [t.id, t]));
  return defaultSelectionsFromFacets(facets, map);
}

function resolveTargetKw(
  selections: DraftSelections,
  templatesById: Map<string, ScenarioTemplate>
): number {
  const volt = selections[VOLTAGE_CLASS_FACET_ID];
  if (volt?.templateId) {
    const t = templatesById.get(volt.templateId);
    if (t) return t.baseCapacityKW;
  }
  const first = Object.values(selections).find((s) => s?.templateId);
  return first ? templatesById.get(first.templateId)?.baseCapacityKW ?? 1000 : 1000;
}
