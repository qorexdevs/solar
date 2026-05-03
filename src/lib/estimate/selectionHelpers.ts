import type {
  Estimate,
  EstimateFacetSelections,
  ScenarioTemplate,
} from '@/types';
import { VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';

/** Template chosen for voltage class facet (finance / irradiance anchors). */
export function getVoltageClassTemplate(
  estimate: Estimate,
  templates: ScenarioTemplate[]
): ScenarioTemplate | undefined {
  const sel = estimate.selections[VOLTAGE_CLASS_FACET_ID];
  if (!sel?.templateId) return undefined;
  return templates.find((t) => t.id === sel.templateId);
}

export function selectionsVersionStale(
  estimate: Estimate,
  templatesById: Map<string, ScenarioTemplate>
): boolean {
  for (const snap of Object.values(estimate.selections)) {
    if (!snap?.templateId) continue;
    const tpl = templatesById.get(snap.templateId);
    if (tpl && tpl.version !== snap.selectedVersion) return true;
  }
  return false;
}

export function summarizeSelections(summary: EstimateFacetSelections): string {
  return JSON.stringify(summary);
}
