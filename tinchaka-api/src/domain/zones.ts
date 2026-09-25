// 9 canonical Dhaka transit zones per docs/architecture.md §4(a)
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

export const isZone = (s: string): s is Zone => (ZONES as readonly string[]).includes(s);
