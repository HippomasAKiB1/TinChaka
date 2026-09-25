import { Zone } from './zones';
import { AppError } from '../types/AppError';

// Full pairwise integer road km distance lookup matrix for 9 Dhaka transit zones per docs/architecture.md §4(b)
const DISTANCE_MATRIX: Record<Zone, Record<Zone, number>> = {
  Banani: {
    Banani: 0,
    Mohakhali: 3,
    'Gulshan 1': 4,
    'Gulshan 2': 2,
    Farmgate: 6,
    Dhanmondi: 9,
    Bashundhara: 7,
    Mirpur: 8,
    Uttara: 12,
  },
  Mohakhali: {
    Banani: 3,
    Mohakhali: 0,
    'Gulshan 1': 3,
    'Gulshan 2': 4,
    Farmgate: 4,
    Dhanmondi: 7,
    Bashundhara: 9,
    Mirpur: 7,
    Uttara: 14,
  },
  'Gulshan 1': {
    Banani: 4,
    Mohakhali: 3,
    'Gulshan 1': 0,
    'Gulshan 2': 2,
    Farmgate: 5,
    Dhanmondi: 8,
    Bashundhara: 8,
    Mirpur: 9,
    Uttara: 13,
  },
  'Gulshan 2': {
    Banani: 2,
    Mohakhali: 4,
    'Gulshan 1': 2,
    'Gulshan 2': 0,
    Farmgate: 7,
    Dhanmondi: 10,
    Bashundhara: 6,
    Mirpur: 10,
    Uttara: 11,
  },
  Farmgate: {
    Banani: 6,
    Mohakhali: 4,
    'Gulshan 1': 5,
    'Gulshan 2': 7,
    Farmgate: 0,
    Dhanmondi: 4,
    Bashundhara: 12,
    Mirpur: 6,
    Uttara: 15,
  },
  Dhanmondi: {
    Banani: 9,
    Mohakhali: 7,
    'Gulshan 1': 8,
    'Gulshan 2': 10,
    Farmgate: 4,
    Dhanmondi: 0,
    Bashundhara: 15,
    Mirpur: 8,
    Uttara: 18,
  },
  Bashundhara: {
    Banani: 7,
    Mohakhali: 9,
    'Gulshan 1': 8,
    'Gulshan 2': 6,
    Farmgate: 12,
    Dhanmondi: 15,
    Bashundhara: 0,
    Mirpur: 14,
    Uttara: 9,
  },
  Mirpur: {
    Banani: 8,
    Mohakhali: 7,
    'Gulshan 1': 9,
    'Gulshan 2': 10,
    Farmgate: 6,
    Dhanmondi: 8,
    Bashundhara: 14,
    Mirpur: 0,
    Uttara: 12,
  },
  Uttara: {
    Banani: 12,
    Mohakhali: 14,
    'Gulshan 1': 13,
    'Gulshan 2': 11,
    Farmgate: 15,
    Dhanmondi: 18,
    Bashundhara: 9,
    Mirpur: 12,
    Uttara: 0,
  },
};

export function getDistanceKm(from: Zone, to: Zone): number {
  const row = DISTANCE_MATRIX[from];
  if (!row) {
    throw new AppError(500, 'Unknown from zone', 'ZONE_LOOKUP_FAIL');
  }
  const distance = row[to];
  if (distance === undefined) {
    throw new AppError(500, 'Unknown to zone', 'ZONE_LOOKUP_FAIL');
  }
  return distance;
}
