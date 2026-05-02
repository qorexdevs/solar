import type { Materials } from '@/types';
import { MATERIAL_KEYS } from '@/types';

export type CapexBreakdown = {
  byKey: Record<string, { name: string; amount: number }>;
  total: number;
};

export function capexBreakdown(materials: Materials): CapexBreakdown {
  const byKey: CapexBreakdown['byKey'] = {};
  let total = 0;

  for (const key of MATERIAL_KEYS) {
    const item = materials[key];
    const amount = (item.unitCost ?? 0) * (item.quantity ?? 0);
    byKey[key] = { name: item.name, amount };
    total += amount;
  }
  for (const item of materials.custom) {
    const amount = (item.unitCost ?? 0) * (item.quantity ?? 0);
    byKey[item.id] = { name: item.name, amount };
    total += amount;
  }
  return { byKey, total };
}
