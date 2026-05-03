import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { snapToNearestCity } from '@/lib/irradiance';
import type { ScenarioLocation } from '@/types';

// Leaflet's default marker icon paths break under bundlers; rebind to the
// CDN-hosted PNGs once at module load so every <Marker> renders correctly.
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const INDIA_CENTER: [number, number] = [22.0, 79.0];
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.5, 68.0],
  [37.6, 97.5],
];

type Props = {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
  /** Stretch the map to fill its container; defaults to 320 px tall. */
  heightPx?: number;
};

function PinHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRecenter({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 6), { duration: 0.4 });
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({ lat, lng, onChange, heightPx = 320 }: Props) {
  return (
    <div
      className="relative rounded-xl overflow-hidden border border-outline-variant"
      style={{ height: heightPx }}
    >
      <MapContainer
        center={lat !== undefined && lng !== undefined ? [lat, lng] : INDIA_CENTER}
        zoom={lat !== undefined ? 6 : 5}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.7}
        minZoom={4}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PinHandler onChange={onChange} />
        <MapRecenter lat={lat} lng={lng} />
        {lat !== undefined && lng !== undefined && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (ev) => {
                const m = ev.target as L.Marker;
                const p = m.getLatLng();
                onChange(p.lat, p.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

type CoordsInputProps = {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
};

export function CoordsInput({ lat, lng, onChange }: CoordsInputProps) {
  const [latStr, setLatStr] = useState(lat !== undefined ? String(lat) : '');
  const [lngStr, setLngStr] = useState(lng !== undefined ? String(lng) : '');

  useEffect(() => {
    if (lat !== undefined) setLatStr(String(Number(lat.toFixed(4))));
  }, [lat]);
  useEffect(() => {
    if (lng !== undefined) setLngStr(String(Number(lng.toFixed(4))));
  }, [lng]);

  function commit() {
    const la = parseFloat(latStr);
    const ln = parseFloat(lngStr);
    if (Number.isFinite(la) && Number.isFinite(ln)) onChange(la, ln);
  }

  return (
    <div className="grid grid-cols-2 gap-sm">
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold">
          Latitude
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.0001"
          value={latStr}
          onChange={(e) => setLatStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="28.6139"
          className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold">
          Longitude
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.0001"
          value={lngStr}
          onChange={(e) => setLngStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="77.2090"
          className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
        />
      </label>
    </div>
  );
}

type SnapPillProps = {
  location: Pick<ScenarioLocation, 'lat' | 'lng'> | null;
};

export function SnapIndicator({ location }: SnapPillProps) {
  const snap = useMemo(
    () => (location ? snapToNearestCity(location.lat, location.lng) : null),
    [location]
  );
  if (!location) {
    return (
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        No location pinned. Click the map or pick a city to size from real
        irradiance data.
      </p>
    );
  }
  if (!snap) {
    return (
      <p className="font-label-sm text-label-sm text-error">
        Pin is outside the precomputed India coverage. Drop it inside India or
        pick a city from the list.
      </p>
    );
  }
  const km = snap.distanceKm;
  return (
    <p className="font-label-sm text-label-sm text-on-surface-variant">
      Snapped to{' '}
      <span className="text-on-surface font-semibold">{snap.record.name}</span>{' '}
      ({snap.record.state}) ·{' '}
      {km < 1 ? '< 1 km' : `${km.toFixed(0)} km away`} · annual GHI{' '}
      <span className="text-on-surface font-semibold">
        {snap.record.annual.ghi.toFixed(0)} kWh/m²/yr
      </span>
    </p>
  );
}
