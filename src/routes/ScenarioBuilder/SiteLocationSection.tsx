import { useCallback, useMemo } from 'react';
import { lazy, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { CityCombobox } from '@/components/irradiance/CityCombobox';
import {
  optimizeTilt,
  simulateYield,
  snapToNearestCity,
} from '@/lib/irradiance';
import {
  ROOF_ALBEDO_LABELS,
  ROOF_ALBEDO_TYPES,
  ROOF_ALBEDO_VALUES,
  SOILING_ENVIRONMENTS,
  SOILING_LABELS,
  TILT_PURPOSES,
  TILT_PURPOSE_LABELS,
} from '@/types';
import type {
  RoofAlbedoType,
  ScenarioLocation,
  SoilingEnvironment,
  TiltPurpose,
} from '@/types';
import { FormSection } from './FormSection';

// Leaflet pulls a chunky CSS bundle and hits `window`; lazy so the rest of
// the builder can render without it on first paint.
const LocationPicker = lazy(() =>
  import('@/components/irradiance/LocationPicker').then((m) => ({
    default: m.LocationPicker,
  }))
);
const CoordsInput = lazy(() =>
  import('@/components/irradiance/LocationPicker').then((m) => ({
    default: m.CoordsInput,
  }))
);
const SnapIndicator = lazy(() =>
  import('@/components/irradiance/LocationPicker').then((m) => ({
    default: m.SnapIndicator,
  }))
);

type Props = {
  /** Currently pinned location (or `undefined` if none). */
  location: ScenarioLocation | undefined;
  onChange: (location: ScenarioLocation | undefined) => void;
};

const DEFAULT_LOCATION = (lat: number, lng: number, label: string, cellId?: string): ScenarioLocation => ({
  lat,
  lng,
  label,
  cellId,
  tiltDeg: Math.min(35, Math.max(5, Math.round(Math.abs(lat)))),
  azimuthDeg: 180,
  tiltPurpose: 'annual',
  soilingEnv: 'urban',
  albedo: ROOF_ALBEDO_VALUES.cool_roof,
  albedoType: 'cool_roof',
  urbanShading: false,
});

export function SiteLocationSection({ location, onChange }: Props) {

  const yieldPreview = useMemo(() => {
    if (!location) return null;
    const snap = snapToNearestCity(location.lat, location.lng);
    if (!snap) return null;
    return {
      snap,
      result: simulateYield({ location, record: snap.record }),
    };
  }, [location]);

  const setLocation = useCallback(
    (next: ScenarioLocation | undefined) => onChange(next),
    [onChange]
  );

  const onPin = useCallback(
    (lat: number, lng: number, label?: string, cellId?: string) => {
      const snap = snapToNearestCity(lat, lng);
      const resolvedLabel = label ?? snap?.record.name ?? 'Pinned location';
      const resolvedCellId = cellId ?? snap?.record.id;
      if (!location) {
        setLocation(DEFAULT_LOCATION(lat, lng, resolvedLabel, resolvedCellId));
      } else {
        setLocation({
          ...location,
          lat,
          lng,
          label: resolvedLabel,
          cellId: resolvedCellId,
        });
      }
    },
    [location, setLocation]
  );

  function patch<K extends keyof ScenarioLocation>(key: K, value: ScenarioLocation[K]) {
    if (!location) return;
    setLocation({ ...location, [key]: value });
  }

  function applyOptimalTilt() {
    if (!location || !yieldPreview) return;
    const opt = optimizeTilt(
      {
        monthlyGHI: yieldPreview.snap.record.monthly.ghi,
        latDeg: yieldPreview.snap.record.lat,
        azimuthDeg: location.azimuthDeg,
        albedo: location.albedo,
      },
      location.tiltPurpose
    );
    setLocation({ ...location, tiltDeg: opt.tiltDeg });
  }

  return (
    <FormSection
      title="Site location"
      subtitle="Pin a site to drive yield from real NSRDB India irradiance instead of a flat CUF."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        <div className="flex flex-col gap-sm">
          <Suspense
            fallback={
              <div className="h-[320px] rounded-xl border border-outline-variant/40 bg-surface-container-low/40 flex items-center justify-center text-on-surface-variant">
                Loading map…
              </div>
            }
          >
            <LocationPicker
              lat={location?.lat}
              lng={location?.lng}
              onChange={(la, ln) => onPin(la, ln)}
            />
          </Suspense>
          <Suspense fallback={null}>
            <SnapIndicator location={location ?? null} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="grid grid-cols-1 gap-sm">
            <CityCombobox
              value={location?.cellId}
              onPick={(la, ln, name, id) => onPin(la, ln, name, id)}
            />
            <Suspense fallback={null}>
              <CoordsInput
                lat={location?.lat}
                lng={location?.lng}
                onChange={(la, ln) => onPin(la, ln)}
              />
            </Suspense>
          </div>

          {location && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm pt-sm border-t border-outline-variant/30">
                <Slider
                  id="loc_tilt"
                  label="Tilt"
                  value={location.tiltDeg}
                  onChange={(n) => patch('tiltDeg', Math.round(n))}
                  min={0}
                  max={45}
                  step={1}
                  variant="plain"
                  suffix="°"
                />
                <Slider
                  id="loc_az"
                  label="Azimuth"
                  value={location.azimuthDeg}
                  onChange={(n) => patch('azimuthDeg', Math.round(n))}
                  min={90}
                  max={270}
                  step={5}
                  variant="plain"
                  suffix="°"
                  hint="180° = due south. India is in the northern hemisphere; south-facing is canonical."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <SegmentedRow
                  label="Optimize tilt for"
                  value={location.tiltPurpose}
                  options={TILT_PURPOSES}
                  getLabel={(v) => TILT_PURPOSE_LABELS[v as TiltPurpose]}
                  onChange={(v) => patch('tiltPurpose', v as TiltPurpose)}
                  trailing={
                    <button
                      type="button"
                      onClick={applyOptimalTilt}
                      className="px-3 h-9 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm hover:opacity-90"
                    >
                      Apply optimum
                    </button>
                  }
                />
                <SegmentedRow
                  label="Soiling environment"
                  value={location.soilingEnv}
                  options={SOILING_ENVIRONMENTS}
                  getLabel={(v) => SOILING_LABELS[v as SoilingEnvironment]}
                  onChange={(v) => patch('soilingEnv', v as SoilingEnvironment)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Roof / ground albedo
                  </span>
                  <select
                    value={location.albedoType}
                    onChange={(e) => {
                      const t = e.target.value as RoofAlbedoType;
                      setLocation({
                        ...location,
                        albedoType: t,
                        albedo: ROOF_ALBEDO_VALUES[t],
                      });
                    }}
                    className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
                  >
                    {ROOF_ALBEDO_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ROOF_ALBEDO_LABELS[t]} (ρ = {ROOF_ALBEDO_VALUES[t].toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Cool roofs are India's high-albedo default; switch only if the
                    site really has dark/concrete/green ground.
                  </span>
                </label>
                <label className="flex items-start gap-sm pt-md">
                  <Switch
                    checked={location.urbanShading}
                    onChange={(v) => patch('urbanShading', v)}
                    label="Urban shading nearby"
                  />
                  <span className="font-body-md text-body-md text-on-surface">
                    Urban shading nearby
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">
                      Tall buildings, parapet walls, or trees reduce yield up to
                      15% — flag here so the warning shows on Results.
                    </span>
                  </span>
                </label>
              </div>

              {yieldPreview && (
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-sm flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-sm">
                    <Icon name="auto_graph" className="text-primary text-[22px]" />
                    <div>
                      <p className="font-body-md text-body-md text-on-surface">
                        Implied yield:{' '}
                        <span className="font-semibold">
                          {yieldPreview.result.annualSpecificYield.toFixed(0)}{' '}
                          kWh/kWp/yr
                        </span>{' '}
                        · CUF{' '}
                        <span className="font-semibold">
                          {yieldPreview.result.impliedCufPct.toFixed(1)}%
                        </span>
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        Snapped to {yieldPreview.snap.record.name}, computed
                        from monthly GHI + tilt + losses.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(undefined)}
                    className="px-3 h-9 rounded-full border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-variant"
                  >
                    Clear pin
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FormSection>
  );
}

type SegmentedRowProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  getLabel: (v: T) => string;
  onChange: (v: T) => void;
  trailing?: React.ReactNode;
};

function SegmentedRow<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
  trailing,
}: SegmentedRowProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 h-9 rounded-full font-label-sm text-label-sm border transition-colors ${
              opt === value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-variant'
            }`}
          >
            {getLabel(opt)}
          </button>
        ))}
        {trailing}
      </div>
    </div>
  );
}
