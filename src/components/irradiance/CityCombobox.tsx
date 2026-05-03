import { useId, useMemo } from 'react';
import { listCities } from '@/lib/irradiance';

type Props = {
  value?: string; // city id
  onPick: (lat: number, lng: number, label: string, cellId: string) => void;
};

export function CityCombobox({ value, onPick }: Props) {
  const cities = useMemo(() => {
    return [...listCities()].sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const id = useId();
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
        Pick a city
      </span>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const city = cities.find((c) => c.id === e.target.value);
          if (city) onPick(city.lat, city.lng, city.name, city.id);
        }}
        className="h-touch-target rounded-lg border-outline-variant bg-surface-bright text-on-surface focus:border-secondary focus:ring-secondary font-body-md text-body-md"
        id={id}
      >
        <option value="" disabled>
          Choose a precomputed cell…
        </option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.state}
          </option>
        ))}
      </select>
    </label>
  );
}
