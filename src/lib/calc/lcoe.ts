import type { Estimate } from '@/types';
import { simulateYield, snapToNearestCity } from '@/lib/irradiance';
import { capexBreakdown } from './capex';
import { annualEnergyKWh, annualEnergyKWhFromYield, yearlyEnergy } from './energy';
import { yearlyOM } from './om';

/**
 * Levelized Cost of Energy (LCOE) — the constant ₹/kWh tariff that, applied
 * to lifetime generation, exactly offsets all discounted lifecycle costs.
 *
 *   LCOE = (CAPEX + Σ OM_t / (1+r)^t) / Σ Energy_t / (1+r)^t
 *
 * Returns 0 when the estimate has no finance layer (we can't compute LCOE
 * without lifespan / CUF / discount).
 */
export function lcoeINRPerKWh(estimate: Estimate): number {
  if (!estimate.finance?.enabled) return 0;
  const { basics, om: omCfg } = estimate.finance;
  const sizeMW = estimate.targetCapacityKW / 1000;

  const capex = capexBreakdown(estimate.materialized).total;
  let baseEnergy = annualEnergyKWh(sizeMW, basics.cufPct);
  if (estimate.location) {
    const snap = snapToNearestCity(estimate.location.lat, estimate.location.lng);
    if (snap) {
      const y = simulateYield({ location: estimate.location, record: snap.record });
      baseEnergy = annualEnergyKWhFromYield(sizeMW, y.annualSpecificYield);
    }
  }
  const energy = yearlyEnergy(basics.lifespanYears, baseEnergy, basics.degradationPct);

  const omBaseAnnual = (capex * (omCfg.percentOfCapex ?? 0)) / 100;
  const om = yearlyOM(
    basics.lifespanYears,
    omBaseAnnual,
    basics.inflationPct,
    omCfg.overrides
  );

  const r = basics.discountPct / 100;

  let pvCost = capex;
  let pvEnergy = 0;
  for (let i = 0; i < basics.lifespanYears; i++) {
    const denom = Math.pow(1 + r, i + 1);
    pvCost += om[i] / denom;
    pvEnergy += energy[i] / denom;
  }
  if (pvEnergy === 0) return Infinity;
  return pvCost / pvEnergy;
}
