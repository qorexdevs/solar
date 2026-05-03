# PRD: Location-Based Solar Irradiance Lookup for India

## Problem

Indian rooftop solar buyers (residential, C&I) need trustworthy site-specific irradiance data to size systems and validate vendor proposals. Existing Indian calculators hide their data sources and present single annual numbers — masking the seasonal and location-specific factors that actually determine yield.

## Goal (POC)

Add a feature to our existing web app where a user enters or pins a location in India and receives full PV energy yield simulation and daily, monthly, and annual irradiance data — with quality, transparency, and engineering nuance that established Indian rooftop tools do not provide.

## Non-Goals

Real-time data, forecasting, polygon queries, bankable resource reports.

## Target User

EPCs, solar consultants, technically-literate residential and commercial buyers who want defensible numbers, not marketing estimates.

## Data Source

**NSRDB India (Meteosat IODC, PSM v3)** via NREL’s `developer.nlr.gov` API — 4 km resolution, 15-minute intervals, free with registration. Single dependable source for the POC.

## Approach

Pre-compute and cache 10-year aggregates per 4 km grid cell across India’s populated regions. Match peer tools on response speed (sub-second) by avoiding live API calls; differentiate on transparency and engineering depth.

## Core Outputs

- Daily GHI climatology (365-day typical year)
- Monthly GHI averages with interannual standard deviation
- Annual GHI with 10-year variance
- Tilted-surface (POA) irradiance for user-specified tilt and azimuth
- Source provenance: dataset, resolution, years included, retrieval date

## Engineering Differentiation (Visible in UI)

The features below set us apart from peer Indian tools and signal domain credibility:

1. **Monsoon uncertainty band** — flag June–September data as higher-uncertainty due to known satellite cloud-detection limitations
1. **Aerosol-aware seasonal display** — show winter (Oct–Feb) GHI dip in IGP cities rather than smoothing it out
1. **Temperature-derate context** — display expected cell-temperature impact alongside irradiance, not just raw kWh/m²
1. **Soiling environment selector** — user picks dust environment (urban/coastal/arid/industrial) to inform downstream derate, rather than a hidden default
1. **Albedo input** — accept roof surface type (default cool-roof high-albedo for India) instead of assuming generic 25%
1. **Tilt-purpose selector** — optimize tilt for annual / summer-peak / monsoon-resilient yield, not just latitude
1. **Urban shading flag** — prompt user to declare nearby obstructions; output a warning if site is in dense urban context
1. **Honest disclaimer** — clearly state this is for indicative sizing, not for project finance

## User Flow

1. User pins location on map or enters lat/long
1. System validates location is in India, snaps to nearest precomputed grid cell
1. User optionally specifies tilt, azimuth, soiling environment, roof albedo
1. System returns irradiance numbers, charts, energy yield (kWh) calculations and the differentiating context above
1. User can export results as PDF/CSV

## Success Metrics (POC)

- Response time under 500 ms for 95% of queries
- Coverage: all India locations served (precomputed for top 200 cities; on-demand for others)
- Accuracy: 10-year mean values within 5% of peer-published estimates for major cities
- Trust: source provenance visible on every result

## Out of Scope for POC

Multi-source cross-validation, financial ROI modeling, custom horizon profiles, hourly time series.

## Future Roadmap

v2 adds Solcast/Solargis premium tier, full PV yield simulation, and shading analysis. v3 adds fleet-mode and cross-validation with multiple sources.