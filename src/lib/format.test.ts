import { describe, expect, it } from 'vitest';
import {
  compactINRParts,
  formatINR,
  formatIndianGroup,
  formatKWh,
  formatPercent,
  formatPerKWh,
  formatPlantCapacityKW,
  formatRate,
  formatTonnes,
  formatYears,
} from './format';

describe('formatIndianGroup', () => {
  it('uses Indian digit grouping', () => {
    expect(formatIndianGroup(1000)).toBe('1,000');
    expect(formatIndianGroup(100000)).toBe('1,00,000');
    expect(formatIndianGroup(12345678)).toBe('1,23,45,678');
    expect(formatIndianGroup(999)).toBe('999');
    expect(formatIndianGroup(-12345)).toBe('-12,345');
  });
});

describe('formatINR', () => {
  it('formats below a lakh as full numbers', () => {
    expect(formatINR(50_000)).toBe('50,000');
    expect(formatINR(99_999)).toBe('99,999');
  });
  it('uses lakh for 1L–<1Cr', () => {
    expect(formatINR(8_50_000)).toBe('8.5 L');
    expect(formatINR(85_00_000)).toBe('85 L');
  });
  it('uses crore for ≥1Cr', () => {
    expect(formatINR(1_25_00_000)).toBe('1.25 Cr');
    expect(formatINR(4_00_00_000)).toBe('4 Cr');
  });
  it('handles negatives and zero', () => {
    expect(formatINR(0)).toBe('0');
    expect(formatINR(-12_50_000)).toBe('-12.5 L');
  });
});

describe('compactINRParts', () => {
  it('separates sign, number, unit', () => {
    expect(compactINRParts(2_50_00_000)).toEqual({ sign: '', number: '2.5', unit: 'Cr' });
    expect(compactINRParts(-50_000)).toEqual({ sign: '-', number: '50,000', unit: '' });
  });
});

describe('formatPercent / formatRate / formatYears', () => {
  it('formatPercent', () => {
    expect(formatPercent(15.5)).toBe('15.5%');
    expect(formatPercent(15)).toBe('15%');
  });
  it('formatRate converts fraction to percent', () => {
    expect(formatRate(0.1234)).toBe('12.3%');
  });
  it('formatYears', () => {
    expect(formatYears(6.2)).toBe('6.2 yrs');
    expect(formatYears(null)).toBe('—');
  });
});

describe('formatPerKWh', () => {
  it('keeps two decimals so 2.5 reads as a tariff', () => {
    expect(formatPerKWh(2.5)).toBe('₹2.50/kWh');
    expect(formatPerKWh(3.456)).toBe('₹3.46/kWh');
    expect(formatPerKWh(0)).toBe('₹0.00/kWh');
  });
  it('returns the dash for non-finite rates', () => {
    expect(formatPerKWh(Infinity)).toBe('—');
    expect(formatPerKWh(NaN)).toBe('—');
  });
});

describe('formatPlantCapacityKW', () => {
  it('uses kW with Indian grouping below 1000 kW', () => {
    expect(formatPlantCapacityKW(700)).toBe('700 kW');
    expect(formatPlantCapacityKW(999)).toBe('999 kW');
    expect(formatPlantCapacityKW(1000)).toBe('1 MW');
  });
  it('uses MW from 1000 kW with enough fractional precision', () => {
    expect(formatPlantCapacityKW(1500)).toBe('1.5 MW');
    expect(formatPlantCapacityKW(1001)).toBe('1.001 MW');
    expect(formatPlantCapacityKW(2500)).toBe('2.5 MW');
  });
  it('handles invalid values', () => {
    expect(formatPlantCapacityKW(NaN)).toBe('—');
    expect(formatPlantCapacityKW(-1)).toBe('—');
  });
});

describe('formatKWh / formatTonnes', () => {
  it('formatKWh switches units', () => {
    expect(formatKWh(500)).toBe('500 kWh');
    expect(formatKWh(50_000)).toBe('50 MWh');
    expect(formatKWh(5_000_000)).toBe('5 GWh');
  });
  it('formatTonnes', () => {
    expect(formatTonnes(4200)).toBe('4.2k Tonnes');
    expect(formatTonnes(450)).toBe('450 Tonnes');
  });
});
