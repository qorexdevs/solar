import type {
  BOMTemplate,
  Materials,
  PriceCatalog,
  Scenario,
  ScenarioBasics,
  ScenarioFinancing,
  ScenarioOM,
  ScenarioRevenue,
  ProjectType,
} from '@/types';
import {
  DEFAULT_BOM_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_ID,
  deriveMaterials,
  getCatalogDefaults,
  makeSeedCatalog,
} from '../catalog';
import { uid } from '../uid';

const DEFAULT_SIZE_MW = 1.5;
const DEFAULT_PPA_RATE = 3.5;

function defaultBasicsFor(catalog: PriceCatalog, type: ProjectType): ScenarioBasics {
  const d = getCatalogDefaults(catalog, type);
  return {
    sizeMW: DEFAULT_SIZE_MW,
    lifespanYears: d.lifespanYears,
    cufPct: d.cufPct,
    degradationPct: d.degradationPct,
    inflationPct: d.inflationPct,
    discountPct: d.discountPct,
  };
}

function defaultRevenueFor(catalog: PriceCatalog, type: ProjectType): ScenarioRevenue {
  const d = getCatalogDefaults(catalog, type);
  return {
    ppaRate: DEFAULT_PPA_RATE,
    ppaEscalationPct: d.ppaEscalationPct,
  };
}

function defaultOMFor(catalog: PriceCatalog, type: ProjectType): ScenarioOM {
  const d = getCatalogDefaults(catalog, type);
  return {
    percentOfCapex: d.omPercentOfCapex,
    overrides: [],
  };
}

function defaultFinancing(): ScenarioFinancing {
  return {
    financedPct: 70,
    interestPct: 9.5,
    termYears: 12,
    gracePeriodYears: 1,
  };
}

export type ScenarioInit = {
  name?: string;
  projectType?: Scenario['projectType'];
  status?: Scenario['status'];
  basics?: Partial<ScenarioBasics>;
  revenue?: Partial<ScenarioRevenue>;
  om?: Partial<ScenarioOM>;
  financing?: Partial<ScenarioFinancing>;
  materials?: Partial<Materials>;
  /** When provided, materials are derived from this catalog × BOM × sizeMW. */
  catalog?: PriceCatalog;
  /** Project-type → BOM map. Defaults to the engineering presets. */
  bomByProjectType?: Record<ProjectType, BOMTemplate>;
  catalogVersionId?: string;
};

export function createScenario(init: ScenarioInit = {}): Scenario {
  const now = Date.now();
  const projectType = init.projectType ?? 'utility';
  const bomByType = init.bomByProjectType ?? DEFAULT_BOM_BY_PROJECT_TYPE;
  const catalog = init.catalog ?? makeSeedCatalog();
  const basics: ScenarioBasics = {
    ...defaultBasicsFor(catalog, projectType),
    ...init.basics,
  };
  const derivedMaterials = deriveMaterials({
    sizeMW: basics.sizeMW,
    bom: bomByType[projectType],
    catalog,
  });
  return {
    id: uid('scn'),
    name: init.name ?? 'Untitled Scenario',
    status: init.status ?? 'draft',
    projectType,
    createdAt: now,
    updatedAt: now,
    basics,
    materials: { ...derivedMaterials, ...init.materials },
    revenue: { ...defaultRevenueFor(catalog, projectType), ...init.revenue },
    om: { ...defaultOMFor(catalog, projectType), ...init.om },
    financing: { ...defaultFinancing(), ...init.financing },
    catalogVersionId: init.catalogVersionId ?? catalog.id,
    manualOverrides: {},
  };
}

export function duplicateScenario(scenario: Scenario): Scenario {
  const now = Date.now();
  return {
    ...structuredClone(scenario),
    id: uid('scn'),
    name: `${scenario.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function seedScenarios(): Scenario[] {
  const catalog = makeSeedCatalog();
  return [
    createScenario({
      name: 'Rajasthan Utility',
      projectType: 'utility',
      status: 'feasible',
      basics: { sizeMW: 2.0 },
      revenue: { ppaRate: 3.2 },
      financing: {
        financedPct: 70,
        interestPct: 9.0,
        termYears: 12,
        gracePeriodYears: 1,
      },
      catalog,
      catalogVersionId: DEFAULT_CATALOG_ID,
    }),
    createScenario({
      name: 'Gujarat C&I Rooftop',
      projectType: 'commercial',
      status: 'draft',
      basics: { sizeMW: 0.5 },
      revenue: { ppaRate: 4.2 },
      financing: {
        financedPct: 60,
        interestPct: 10.0,
        termYears: 10,
        gracePeriodYears: 0,
      },
      catalog,
      catalogVersionId: DEFAULT_CATALOG_ID,
    }),
    createScenario({
      name: 'Karnataka Hybrid',
      projectType: 'hybrid',
      status: 'review',
      basics: { sizeMW: 5.0 },
      revenue: { ppaRate: 3.6 },
      financing: {
        financedPct: 75,
        interestPct: 9.5,
        termYears: 15,
        gracePeriodYears: 2,
      },
      catalog,
      catalogVersionId: DEFAULT_CATALOG_ID,
    }),
  ];
}
