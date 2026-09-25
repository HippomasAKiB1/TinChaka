import { Zone } from './zones';
import { getDistanceKm } from './distance';

// Fare constants locked per docs/architecture.md §4(c)(d) scaled 100x per PRD.md §17
export const FARE_CONSTANTS = {
  baseFarePoysha: 3000,      // 30 Taka
  ratePerKmPoysha: 1500,     // 15 Taka/km
  poolDiscountRate: 0.20,    // 20% of distanceCharge
} as const;

export function estimateSoloFare(pickup: Zone, destination: Zone): number {
  const km = getDistanceKm(pickup, destination);
  const distanceCharge = km * FARE_CONSTANTS.ratePerKmPoysha;
  return FARE_CONSTANTS.baseFarePoysha + distanceCharge;
}

export function calculateFinalFare(pickup: Zone, destination: Zone, poolSize: number): number {
  const km = getDistanceKm(pickup, destination);
  const distanceCharge = km * FARE_CONSTANTS.ratePerKmPoysha;
  const discount = poolSize >= 2
    ? Math.floor(distanceCharge * FARE_CONSTANTS.poolDiscountRate)
    : 0;
  return FARE_CONSTANTS.baseFarePoysha + distanceCharge - discount;
}
