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
