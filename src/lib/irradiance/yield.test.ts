import { describe, expect, it } from 'vitest';
import type { ScenarioLocation } from '@/types';
import { findCityById } from './lookup';
import { simulateYield } from './yield';

function locFor(cityId: string, partial: Partial<ScenarioLocation> = {}): ScenarioLocation {
  const city = findCityById(cityId)!;
  return {
    lat: city.lat,
    lng: city.lng,
    label: city.name,
    cellId: city.id,
    tiltDeg: 25,
    azimuthDeg: 180,
    tiltPurpose: 'annual',
    soilingEnv: 'urban',
    albedo: 0.45,
    albedoType: 'cool_roof',
    urbanShading: false,
    ...partial,
  };
}

describe('simulateYield', () => {
  it('Delhi specific yield lands in 1300–1700 kWh/kWp/yr', () => {
    const record = findCityById('delhi')!;
    const r = simulateYield({ location: locFor('delhi'), record });
    expect(r.annualSpecificYield).toBeGreaterThan(1300);
    expect(r.annualSpecificYield).toBeLessThan(1700);
  });

  it('Bengaluru specific yield lands in the realistic Indian range', () => {
    const record = findCityById('bengaluru')!;
    const r = simulateYield({ location: locFor('bengaluru'), record });
    expect(r.annualSpecificYield).toBeGreaterThan(1300);
    expect(r.annualSpecificYield).toBeLessThan(1700);
  });

  it('emits a 9-step loss waterfall summing to consistent AC at the end', () => {
    const record = findCityById('mumbai')!;
    const r = simulateYield({ location: locFor('mumbai'), record });
    expect(r.lossWaterfall).toHaveLength(9);
    expect(r.lossWaterfall.at(-1)!.kWhPerKWpYr).toBeCloseTo(
      r.annualSpecificYield,
      1
    );
    // First step (GHI baseline) should be the largest energy figure.
    expect(r.lossWaterfall[0].kWhPerKWpYr).toBeGreaterThanOrEqual(
      r.annualSpecificYield
    );
  });

  it('arid soiling produces lower yield than urban', () => {
    const record = findCityById('jaipur')!;
    const urban = simulateYield({
      location: locFor('jaipur', { soilingEnv: 'urban' }),
      record,
    });
    const arid = simulateYield({
      location: locFor('jaipur', { soilingEnv: 'arid' }),
      record,
    });
    expect(arid.annualSpecificYield).toBeLessThan(urban.annualSpecificYield);
  });

  it('returns the dataset provenance', () => {
    const record = findCityById('delhi')!;
    const r = simulateYield({ location: locFor('delhi'), record });
    expect(r.provenance.dataset).toMatch(/starter-seed|NSRDB/i);
    expect(r.provenance.years).toHaveLength(2);
  });

  it('exposes a non-zero monsoon CV', () => {
    const record = findCityById('mumbai')!;
    const r = simulateYield({ location: locFor('mumbai'), record });
    expect(r.monsoonUncertainty.cvPct).toBeGreaterThan(0);
    expect(r.monsoonUncertainty.months).toEqual([5, 6, 7, 8]);
  });

  it('implied CUF ≈ specificYield/8760 × 100', () => {
    const record = findCityById('chennai')!;
    const r = simulateYield({ location: locFor('chennai'), record });
    expect(r.impliedCufPct).toBeCloseTo((r.annualSpecificYield / 8760) * 100, 5);
  });
});
