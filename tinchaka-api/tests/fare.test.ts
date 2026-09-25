import { ZONES } from '../src/domain/zones';
import { getDistanceKm } from '../src/domain/distance';
import { estimateSoloFare, calculateFinalFare, FARE_CONSTANTS } from '../src/domain/fare';

/**
 * §9 Test #4: Fare Model Verification against docs/architecture.md §5
 *
 * Verifies locked fare constants, symmetry of the distance lookup, worked examples
 * for Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan 1), and integer invariants.
 */
describe('Fare Model (§9 Test #4 — Fare Calculation Invariants)', () => {
  it('verifies locked fare constants match architecture.md §4(d)', () => {
    expect(FARE_CONSTANTS.baseFarePoysha).toBe(3000);
    expect(FARE_CONSTANTS.ratePerKmPoysha).toBe(1500);
    expect(FARE_CONSTANTS.poolDiscountRate).toBe(0.20);
  });

  it('verifies Nusrat worked example (Banani -> Mohakhali, 3 km) per architecture.md §5', () => {
    const km = getDistanceKm('Banani', 'Mohakhali');
    expect(km).toBe(3);

    // Solo estimate: 3000 + (3 * 1500) = 7500 poysha
    const solo = estimateSoloFare('Banani', 'Mohakhali');
    expect(solo).toBe(7500);
    expect(Number.isInteger(solo)).toBe(true);

    // Pooled fare with 2 riders: 3000 + 4500 - 900 = 6600 poysha
    const pooled = calculateFinalFare('Banani', 'Mohakhali', 2);
    expect(pooled).toBe(6600);
    expect(Number.isInteger(pooled)).toBe(true);

    // Solo pool size 1: no discount
    const poolSizeOne = calculateFinalFare('Banani', 'Mohakhali', 1);
    expect(poolSizeOne).toBe(7500);
    expect(Number.isInteger(poolSizeOne)).toBe(true);
  });

  it('verifies Rafiq worked example (Banani -> Gulshan 1, 4 km) per architecture.md §5', () => {
    const km = getDistanceKm('Banani', 'Gulshan 1');
    expect(km).toBe(4);

    // Solo estimate: 3000 + (4 * 1500) = 9000 poysha
    const solo = estimateSoloFare('Banani', 'Gulshan 1');
    expect(solo).toBe(9000);
    expect(Number.isInteger(solo)).toBe(true);

    // Pooled fare with 2 riders: 3000 + 6000 - 1200 = 7800 poysha
    const pooled = calculateFinalFare('Banani', 'Gulshan 1', 2);
    expect(pooled).toBe(7800);
    expect(Number.isInteger(pooled)).toBe(true);

    // Solo pool size 1: no discount
    const poolSizeOne = calculateFinalFare('Banani', 'Gulshan 1', 1);
    expect(poolSizeOne).toBe(9000);
    expect(Number.isInteger(poolSizeOne)).toBe(true);
  });

  it('verifies distance matrix symmetry across all zones (DIST[A][B] === DIST[B][A])', () => {
    for (const a of ZONES) {
      for (const b of ZONES) {
        expect(getDistanceKm(a, b)).toBe(getDistanceKm(b, a));
      }
    }
  });

  it('verifies distance matrix zero-diagonal invariant (DIST[A][A] === 0)', () => {
    for (const z of ZONES) {
      expect(getDistanceKm(z, z)).toBe(0);
    }
  });

  it('verifies all pairwise fares produce non-negative integer return values', () => {
    for (const a of ZONES) {
      for (const b of ZONES) {
        const soloFare = estimateSoloFare(a, b);
        expect(Number.isInteger(soloFare)).toBe(true);
        expect(soloFare).toBeGreaterThanOrEqual(FARE_CONSTANTS.baseFarePoysha);

        for (let poolSize = 1; poolSize <= 3; poolSize++) {
          const finalFare = calculateFinalFare(a, b, poolSize);
          expect(Number.isInteger(finalFare)).toBe(true);
          expect(finalFare).toBeGreaterThanOrEqual(FARE_CONSTANTS.baseFarePoysha);
        }
      }
    }
  });
});
