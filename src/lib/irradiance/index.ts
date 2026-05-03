/**
 * Irradiance public surface.
 *
 * Three layers:
 * - lookup: snap a (lat,lng) to a precomputed cell
 * - solar:  Cooper geometry + Liu-Jordan transposition + thermal model
 * - yield:  full PV simulation orchestrator
 */
export {
  findCityById,
  haversineKm,
  isInIndia,
  listCities,
  snapToNearestCity,
  type SnapResult,
} from './lookup';
export {
  cellTemperatureC,
  declinationDeg,
  erbsDiffuseFractionMonthly,
  extraterrestrialDailyKWhM2,
  liuJordanMonthlyPOA,
  noonZenithDeg,
  optimizeTilt,
  SOLAR_CONSTANTS,
  sunsetHourAngleDeg,
  temperatureDerate,
  type POAComponents,
  type TiltScanInput,
} from './solar';
export {
  DEFAULT_LOSSES,
  resolveRecordForLocation,
  simulateYield,
} from './yield';
