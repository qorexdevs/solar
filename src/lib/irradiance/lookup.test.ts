import { describe, expect, it } from 'vitest';
import {
  findCityById,
  haversineKm,
  isInIndia,
  listCities,
  snapToNearestCity,
} from './lookup';

describe('haversineKm', () => {
  it('zero distance for same point', () => {
    expect(haversineKm(28.6, 77.2, 28.6, 77.2)).toBeCloseTo(0, 3);
  });

  it('Delhi → Mumbai is roughly 1150 km', () => {
    const d = haversineKm(28.6139, 77.209, 19.076, 72.8777);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });
});

describe('isInIndia', () => {
  it('accepts Delhi', () => {
    expect(isInIndia(28.6139, 77.209)).toBe(true);
  });
  it('rejects New York', () => {
    expect(isInIndia(40.7128, -74.006)).toBe(false);
  });
  it('rejects Pacific Ocean', () => {
    expect(isInIndia(0, 180)).toBe(false);
  });
});

describe('snapToNearestCity', () => {
  it('snaps a point near Mumbai to Mumbai', () => {
    const res = snapToNearestCity(19.0, 72.8);
    expect(res).not.toBeNull();
    expect(res!.record.id).toBe('mumbai');
    expect(res!.distanceKm).toBeLessThan(20);
  });

  it('snaps central Karnataka to Bengaluru', () => {
    const res = snapToNearestCity(12.97, 77.59);
    expect(res).not.toBeNull();
    expect(res!.record.id).toBe('bengaluru');
  });

  it('returns null for points far outside any cell', () => {
    expect(snapToNearestCity(0, -50)).toBeNull();
  });
});

describe('findCityById / listCities', () => {
  it('lists at least the seed 12 cities', () => {
    expect(listCities().length).toBeGreaterThanOrEqual(12);
  });

  it('finds Delhi by id', () => {
    const c = findCityById('delhi');
    expect(c).not.toBeNull();
    expect(c!.name).toBe('Delhi');
  });

  it('returns null for unknown ids', () => {
    expect(findCityById('atlantis')).toBeNull();
  });
});
