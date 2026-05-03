import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { KpiCard } from '@/components/ui/KpiCard';
import { IrradianceCharts } from '@/components/irradiance/IrradianceCharts';
import { snapToNearestCity } from '@/lib/irradiance';
import type { Estimate, YieldResult } from '@/types';

type Props = {
  estimate: Estimate;
  yieldResult: YieldResult;
};

export function IrradianceSection({ estimate, yieldResult }: Props) {
  const snap = useMemo(
    () =>
      estimate.location
        ? snapToNearestCity(estimate.location.lat, estimate.location.lng)
        : null,
    [estimate.location]
  );
  if (!estimate.location || !snap) return null;

  const annualPOAkWhYr = yieldResult.annualPOA;
  const annualGHI = snap.record.annual.ghi;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-end justify-between gap-sm">
        <div>
          <p className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">
            Site irradiance &amp; yield
          </p>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">
            {estimate.location.label ?? snap.record.name}
          </h3>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            {estimate.location.lat.toFixed(3)}, {estimate.location.lng.toFixed(3)} ·
            tilt {estimate.location.tiltDeg}° · azimuth{' '}
            {estimate.location.azimuthDeg}° · {snap.record.climate_zone} climate
          </p>
        </div>
      </div>

      {estimate.location.urbanShading && (
        <div className="rounded-xl border border-error/40 bg-error/5 p-md flex items-start gap-sm">
          <Icon name="warning" className="text-error text-[22px] shrink-0" />
          <div>
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-semibold">Urban shading flagged.</span>{' '}
              Surrounding obstructions can shave 5–15% off the simulated yield.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm">
        <KpiCard
          accent="primary"
          icon="wb_sunny"
          label="Annual GHI"
          value={`${annualGHI.toFixed(0)} kWh/m²`}
          hint={`±${snap.record.annual.stdev.toFixed(0)} 10-yr stdev`}
        />
        <KpiCard
          accent="tertiary"
          icon="solar_power"
          label="Annual POA"
          value={`${annualPOAkWhYr.toFixed(0)} kWh/m²`}
          hint={`Tilt ${estimate.location.tiltDeg}° · azimuth ${estimate.location.azimuthDeg}°`}
        />
        <KpiCard
          accent="secondary"
          icon="bolt"
          label="Specific yield"
          value={`${yieldResult.annualSpecificYield.toFixed(0)} kWh/kWp`}
          hint="AC at meter, post all losses"
        />
        <KpiCard
          accent="outline"
          icon="speed"
          label="Implied CUF"
          value={`${yieldResult.impliedCufPct.toFixed(1)}%`}
          hint={`Monsoon CV ±${yieldResult.monsoonUncertainty.cvPct.toFixed(1)}%`}
        />
      </div>

      <IrradianceCharts yieldResult={yieldResult} record={snap.record} />
    </div>
  );
}
