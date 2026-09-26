// Mirrors tinchaka-api/src/domain/zones.ts — kept in sync manually for MVP.
export const ZONES = [
  'Banani',
  'Mohakhali',
  'Gulshan 1',
  'Gulshan 2',
  'Farmgate',
  'Dhanmondi',
  'Bashundhara',
  'Mirpur',
  'Uttara',
] as const;

export type Zone = typeof ZONES[number];

export function isZone(val: unknown): val is Zone {
  return typeof val === 'string' && ZONES.includes(val as Zone);
}
