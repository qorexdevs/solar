/**
 * Irradiance / yield-simulation types.
 *
 * The energy engine flips from a flat `cufPct` to a real GHI → POA → AC
 * chain whenever a `Scenario.location` is present; everything in here is
 * the contract those modules speak.
 */

export type SoilingEnvironment = 'urban' | 'coastal' | 'arid' | 'industrial';

export const SOILING_ENVIRONMENTS: readonly SoilingEnvironment[] = [
  'urban',
  'coastal',
  'arid',
  'industrial',
];

export const SOILING_LABELS: Record<SoilingEnvironment, string> = {
  urban: 'Urban',
  coastal: 'Coastal',
  arid: 'Arid / desert',
  industrial: 'Industrial',
};

/** Annualised soiling derate applied to POA before DC conversion. */
export const SOILING_DERATE_PCT: Record<SoilingEnvironment, number> = {
  urban: 5,
  coastal: 4,
  arid: 8,
  industrial: 7,
};

export type RoofAlbedoType =
  | 'cool_roof'
  | 'concrete'
  | 'metal_dark'
  | 'green'
  | 'gravel';

export const ROOF_ALBEDO_TYPES: readonly RoofAlbedoType[] = [
  'cool_roof',
  'concrete',
  'metal_dark',
  'green',
  'gravel',
];

export const ROOF_ALBEDO_LABELS: Record<RoofAlbedoType, string> = {
  cool_roof: 'Cool roof / white coating',
  concrete: 'Concrete / aged white',
  metal_dark: 'Dark metal sheet',
  green: 'Green / vegetated',
  gravel: 'Gravel / ballast',
};

/** Default reflectance per surface type. India default is cool-roof. */
export const ROOF_ALBEDO_VALUES: Record<RoofAlbedoType, number> = {
  cool_roof: 0.45,
  concrete: 0.30,
  metal_dark: 0.15,
  green: 0.20,
  gravel: 0.18,
};

export type TiltPurpose = 'annual' | 'summer_peak' | 'monsoon_resilient';

export const TILT_PURPOSES: readonly TiltPurpose[] = [
  'annual',
  'summer_peak',
  'monsoon_resilient',
];

export const TILT_PURPOSE_LABELS: Record<TiltPurpose, string> = {
  annual: 'Annual yield',
  summer_peak: 'Summer peak',
  monsoon_resilient: 'Monsoon resilience',
};

/** Stamped onto every Scenario that has been pinned to a location. */
export type ScenarioLocation = {
  lat: number;
  lng: number;
  /** Human label — usually the snapped city name. */
  label?: string;
  /** Snapped grid/city id for reproducibility. */
  cellId?: string;
  tiltDeg: number;
  azimuthDeg: number;
  tiltPurpose: TiltPurpose;
  soilingEnv: SoilingEnvironment;
  /** 0..1, derived from `albedoType` unless user overrides. */
  albedo: number;
  albedoType: RoofAlbedoType;
  urbanShading: boolean;
};

/** Provenance block carried from cities.json into every yield result. */
export type IrradianceProvenance = {
  dataset: string;
  resolution_km: number;
  years: [number, number];
  retrieved_at: string;
  note?: string;
};

/**
 * Per-cell record loaded from src/data/irradiance/cities.json. The 365-day
 * `daily_typical_year` is optional in the starter dataset; the loader
 * synthesises it from monthly means when missing.
 */
export type IrradianceRecord = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  elevation_m: number;
  climate_zone: string;
  monthly: {
    /** kWh/m²/day, 12 months, Jan→Dec. */
    ghi: number[];
    /** kWh/m²/day. Optional — Erbs split is used when absent. */
    dni?: number[];
    /** kWh/m²/day. Optional — Erbs split is used when absent. */
    dhi?: number[];
    /** °C, monthly mean ambient. */
    tAmbC: number[];
    /** kWh/m²/day, inter-annual stdev per month. */
    stdev: number[];
  };
  /** kWh/m²/day, 365 entries; synthesised from monthly when omitted. */
  daily_typical_year?: number[];
  annual: {
    /** kWh/m²/yr (sum of monthly × days). */
    ghi: number;
    /** kWh/m²/yr inter-annual stdev. */
    stdev: number;
    p10: number;
    p90: number;
  };
  source: IrradianceProvenance;
};

/** Bundle shape stored in cities.json. */
export type IrradianceBundle = {
  cities: IrradianceRecord[];
  source: IrradianceProvenance;
};

/** Inputs to `simulateYield`. */
export type YieldInput = {
  location: ScenarioLocation;
  /** Required: the resolved record (cell). The caller does the snap. */
  record: IrradianceRecord;
  /** kW peak DC. Used to scale per-kWp specific yield to absolute kWh. */
  systemKWp?: number;
  /** Power coefficient %/°C (negative number). Default −0.35. */
  tempCoefficientPctPerC?: number;
  /** Annualised AC-side losses (DC cabling, mismatch, inverter, availability). */
  losses?: Partial<{
    soilingPct: number;
    dcLossPct: number;
    mismatchPct: number;
    inverterEffPct: number;
    availabilityPct: number;
  }>;
};

export type LossWaterfallStep = {
  /** Stable id used for chart keys. */
  id:
    | 'ghi'
    | 'poa'
    | 'soiling'
    | 'dc_loss'
    | 'mismatch'
    | 'inverter'
    | 'temperature'
    | 'availability'
    | 'ac';
  label: string;
  /** Specific energy at this step (kWh/kWp/yr) — falling staircase. */
  kWhPerKWpYr: number;
  /** Drop from previous step (kWh/kWp/yr); 0 for the first step. */
  deltaKWhPerKWpYr: number;
  /** Drop expressed as % of GHI-equivalent baseline. */
  deltaPct: number;
};

export type MonsoonUncertainty = {
  /** 0-indexed months considered uncertain (May–Sep ≡ 4..8). */
  months: number[];
  /** Inter-annual coefficient of variation across those months, %. */
  cvPct: number;
};

/** Output of `simulateYield`. */
export type YieldResult = {
  /** kWh/m²/day, monthly mean. */
  monthlyGHI: number[];
  /** kWh/m²/day, monthly POA after tilt+azimuth+albedo. */
  monthlyPOA: number[];
  /** kWh/kWp, monthly AC energy yield per kWp installed. */
  monthlyACkWhPerKWp: number[];
  /** kWh/m²/day for 365 typical-year days. */
  dailyTypicalYear: number[];
  /** kWh/kWp/yr — the canonical specific yield. */
  annualSpecificYield: number;
  /** kWh/m²/yr POA, summed from monthly × days. */
  annualPOA: number;
  /** Equivalent CUF % the engine uses when scaling sizeMW × 8760h. */
  impliedCufPct: number;
  /** Falling staircase of energy losses; first step is GHI-equivalent. */
  lossWaterfall: LossWaterfallStep[];
  /** Recommended tilt the optimizer would have picked, given purpose. */
  optimalTiltDeg: number;
  /** Honest band on monsoon-month satellite estimates. */
  monsoonUncertainty: MonsoonUncertainty;
  /** Source dataset block — surfaced verbatim in UI. */
  provenance: IrradianceProvenance;
  /** Distance (km) from the user pin to the snapped cell. */
  snapDistanceKm: number;
};
