/** India CEA grid emission factor (kg CO2 per kWh). */
export const CO2_FACTOR_KG_PER_KWH = 0.82;

export function co2Tonnes(energy: number[]): {
  yearly: number[];
  cumulative: number;
} {
  const yearly = energy.map((kwh) => (kwh * CO2_FACTOR_KG_PER_KWH) / 1000);
  const cumulative = yearly.reduce((a, b) => a + b, 0);
  return { yearly, cumulative };
}

/** Tonnes of CO2 a mature tree sequesters in a year. */
export const TONNES_CO2_PER_TREE_YEAR = 0.06;
/** Tonnes of CO2 an average passenger car emits in a year. */
export const TONNES_CO2_PER_CAR_YEAR = 4.6;
/** Tonnes of CO2 per km driven by a petrol car (~120 g/km). */
export const TONNES_CO2_PER_KM = 0.00012;
/** Tonnes of CO2 per smartphone charge (EPA equivalency, ~8.22 g). */
export const TONNES_CO2_PER_PHONE_CHARGE = 0.00000822;

/** Turn offset tonnes into relatable equivalents for the UI. */
export function co2Equivalents(tonnes: number): {
  trees: number;
  cars: number;
  kmDriven: number;
  phonesCharged: number;
} {
  if (!Number.isFinite(tonnes) || tonnes <= 0) {
    return { trees: 0, cars: 0, kmDriven: 0, phonesCharged: 0 };
  }
  return {
    trees: Math.round(tonnes / TONNES_CO2_PER_TREE_YEAR),
    cars: Math.round(tonnes / TONNES_CO2_PER_CAR_YEAR),
    kmDriven: Math.round(tonnes / TONNES_CO2_PER_KM),
    phonesCharged: Math.round(tonnes / TONNES_CO2_PER_PHONE_CHARGE),
  };
}
