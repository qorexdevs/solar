import { describe, expect, it } from 'vitest';
import { createScenario } from './factory';
import { DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE, DEFAULT_CATALOG_ID } from '../catalog';

describe('createScenario uses BOM × catalog derivation', () => {
  it('scales panel quantity (kW) with plant size', () => {
    const s = createScenario({ basics: { sizeMW: 2 } });
    expect(s.materials.panels.quantity).toBe(2000);
  });

  it('initializes om.percentOfCapex from the catalog defaults for the project type', () => {
    const utility = createScenario({ projectType: 'utility' });
    expect(utility.om.percentOfCapex).toBe(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.utility.omPercentOfCapex
    );
    const residential = createScenario({ projectType: 'residential' });
    expect(residential.om.percentOfCapex).toBe(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.residential.omPercentOfCapex
    );
  });

  it('inherits CUF and lifespan from catalog defaults per project type', () => {
    const c = createScenario({ projectType: 'commercial' });
    expect(c.basics.cufPct).toBe(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.commercial.cufPct
    );
    expect(c.basics.lifespanYears).toBe(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.commercial.lifespanYears
    );
  });

  it('still respects om override in init', () => {
    const s = createScenario({
      basics: { sizeMW: 1 },
      om: { percentOfCapex: 1.7, overrides: [] },
    });
    expect(s.om.percentOfCapex).toBe(1.7);
  });

  it('records the catalog version it was derived from', () => {
    const s = createScenario({ basics: { sizeMW: 1 } });
    expect(s.catalogVersionId).toBe(DEFAULT_CATALOG_ID);
  });

  it('starts with no manual overrides', () => {
    const s = createScenario();
    expect(s.manualOverrides).toEqual({});
  });

  it('utility vs residential yield different inverter counts', () => {
    const utility = createScenario({
      basics: { sizeMW: 2 },
      projectType: 'utility',
    });
    const residential = createScenario({
      basics: { sizeMW: 2 },
      projectType: 'residential',
    });
    expect(utility.materials.inverters.quantity).toBe(10);
    expect(residential.materials.inverters.quantity).toBe(20);
    expect(residential.materials.transformers.quantity).toBe(0);
  });
});
