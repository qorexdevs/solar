import { describe, expect, it } from 'vitest';
import {
  cellTemperatureC,
  declinationDeg,
  erbsDiffuseFractionMonthly,
  extraterrestrialDailyKWhM2,
  liuJordanMonthlyPOA,
  noonZenithDeg,
  optimizeTilt,
  sunsetHourAngleDeg,
  temperatureDerate,
} from './solar';

describe('declination', () => {
  it('summer solstice ≈ +23.45°', () => {
    expect(declinationDeg(173)).toBeGreaterThan(23.0);
    expect(declinationDeg(173)).toBeLessThan(23.5);
  });
  it('winter solstice ≈ −23.45°', () => {
    expect(declinationDeg(355)).toBeLessThan(-23.0);
    expect(declinationDeg(355)).toBeGreaterThan(-23.5);
  });
  it('equinox ≈ 0', () => {
    expect(Math.abs(declinationDeg(81))).toBeLessThan(1.5);
  });
});

describe('noonZenithDeg', () => {
  it('Delhi at summer solstice has zenith ≈ 5.2°', () => {
    const z = noonZenithDeg(28.6, 173);
    expect(z).toBeGreaterThan(4);
    expect(z).toBeLessThan(7);
  });
  it('Bengaluru at equinox has zenith ≈ latitude', () => {
    const z = noonZenithDeg(12.97, 81);
    expect(z).toBeGreaterThan(12);
    expect(z).toBeLessThan(14);
  });
});

describe('sunsetHourAngleDeg', () => {
  it('equator at equinox ≈ 90°', () => {
    expect(sunsetHourAngleDeg(0, 81)).toBeCloseTo(90, 1);
  });
});

describe('extraterrestrialDailyKWhM2', () => {
  it('Delhi June ≈ 11–12 kWh/m²/day', () => {
    const ho = extraterrestrialDailyKWhM2(28.6, 162);
    expect(ho).toBeGreaterThan(10);
    expect(ho).toBeLessThan(13);
  });
});

describe('erbsDiffuseFractionMonthly', () => {
  it('high Kt gives low diffuse fraction', () => {
    expect(erbsDiffuseFractionMonthly(0.7, 90)).toBeLessThan(0.4);
  });
  it('low Kt gives high diffuse fraction', () => {
    expect(erbsDiffuseFractionMonthly(0.3, 90)).toBeGreaterThan(0.6);
  });
});

describe('liuJordanMonthlyPOA', () => {
  it('flat panel POA equals GHI', () => {
    const r = liuJordanMonthlyPOA(5.0, 28.6, 0, 180, 0.2, 5);
    expect(r.poa).toBeCloseTo(5.0, 2);
  });
  it('latitude-tilt south at Delhi June gives a sub-1.05 ratio', () => {
    // June sun is high; tilting hurts a bit.
    const r = liuJordanMonthlyPOA(6.5, 28.6, 28, 180, 0.2, 5);
    expect(r.poa / 6.5).toBeGreaterThan(0.85);
    expect(r.poa / 6.5).toBeLessThan(1.05);
  });
  it('latitude-tilt south at Delhi December lifts POA', () => {
    // December sun is low; tilting helps a lot.
    const r = liuJordanMonthlyPOA(3.8, 28.6, 28, 180, 0.2, 11);
    expect(r.poa / 3.8).toBeGreaterThan(1.2);
  });
});

describe('cellTemperatureC + temperatureDerate', () => {
  it('25°C ambient and 800 W/m² POA hits NOCT exactly', () => {
    expect(cellTemperatureC(25, 800)).toBeCloseTo(50, 5);
  });
  it('temperature derate at STC is 1.0', () => {
    expect(temperatureDerate(25)).toBeCloseTo(1.0, 6);
  });
  it('temperature derate at 50°C is ≈ 0.9125', () => {
    expect(temperatureDerate(50, -0.35)).toBeCloseTo(0.9125, 4);
  });
});

describe('optimizeTilt', () => {
  // Synthetic monthly profile mirroring Delhi's seasonality.
  const ghi = [4.0, 4.8, 5.7, 6.3, 6.5, 5.5, 4.6, 4.4, 5.0, 5.3, 4.5, 3.8];

  it('annual optimum is in the latitude ballpark', () => {
    const r = optimizeTilt(
      { monthlyGHI: ghi, latDeg: 28.6, azimuthDeg: 180, albedo: 0.2 },
      'annual'
    );
    expect(r.tiltDeg).toBeGreaterThan(20);
    expect(r.tiltDeg).toBeLessThan(35);
  });

  it('summer-peak optimum is shallower than annual', () => {
    const annual = optimizeTilt(
      { monthlyGHI: ghi, latDeg: 28.6, azimuthDeg: 180, albedo: 0.2 },
      'annual'
    );
    const summer = optimizeTilt(
      { monthlyGHI: ghi, latDeg: 28.6, azimuthDeg: 180, albedo: 0.2 },
      'summer_peak'
    );
    expect(summer.tiltDeg).toBeLessThanOrEqual(annual.tiltDeg);
  });
});
