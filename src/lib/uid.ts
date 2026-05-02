/**
 * Generate a short, prefixed unique id.
 *
 * Uses `crypto.randomUUID()` when available (modern browsers + Node ≥ 14.17),
 * with a Math.random() fallback for older environments.
 */
export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
