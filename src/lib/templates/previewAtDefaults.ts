import {
  composeEstimate,
  defaultSelectedOptionsFromSelections,
} from '@/lib/composer';
import type { MaterialCatalogItem, ScenarioTemplate, TemplateFacet } from '@/types';
import { defaultSelectionsFromFacets } from '@/lib/estimate';

/**
 * Compose this template alongside default picks for every other facet —
 * previews what shows up once an estimator confirms the picker defaults.
 */
export function totalsAtDefaultSelections(args: {
  template: ScenarioTemplate;
  facets: TemplateFacet[];
  allTemplates: ScenarioTemplate[];
  catalogItems: MaterialCatalogItem[];
}) {
  const { template, facets, allTemplates, catalogItems } = args;
  const templatesById = new Map(allTemplates.map((t) => [t.id, t]));

  try {
    const selections = defaultSelectionsFromFacets(facets, templatesById);
    selections[template.facetId] = {
      templateId: template.id,
      selectedVersion: template.version,
    };

    const selectedOptionsPerTemplate =
      defaultSelectedOptionsFromSelections(selections, templatesById);

    const { totals } = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      targetCapacityKW: template.baseCapacityKW,
      catalogItems,
      templates: allTemplates,
    });
    return totals;
  } catch {
    return null;
  }
}
