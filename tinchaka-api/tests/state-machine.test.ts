import { assertRideRequestTransition, assertPoolTransition } from '../src/domain/stateMachine';
import { AppError } from '../src/types/AppError';
import { RideRequestStatus, PoolStatus } from '@prisma/client';

/**
 * §9 Test #3: Invalid State Transitions Rejected
 *
 * Verifies that the state machine enforces strict, non-reversible lifecycle progression
 * and rejects disallowed transitions (e.g. from COMPLETED or CANCELLED, or cancelling after STARTED).
 */
describe('State Machine Transitions (§9 Test #3)', () => {
  describe('assertRideRequestTransition', () => {
    it('allows valid progressive transitions', () => {
      expect(() => assertRideRequestTransition('REQUESTED', 'MATCHED')).not.toThrow();
      expect(() => assertRideRequestTransition('MATCHED', 'DRIVER_ARRIVED')).not.toThrow();
      expect(() => assertRideRequestTransition('DRIVER_ARRIVED', 'STARTED')).not.toThrow();
      expect(() => assertRideRequestTransition('STARTED', 'COMPLETED')).not.toThrow();
    });

    it('allows cancellation before trip starts', () => {
      expect(() => assertRideRequestTransition('REQUESTED', 'CANCELLED')).not.toThrow();
      expect(() => assertRideRequestTransition('MATCHED', 'CANCELLED')).not.toThrow();
      expect(() => assertRideRequestTransition('DRIVER_ARRIVED', 'CANCELLED')).not.toThrow();
    });

    it('throws 409 INVALID_TRANSITION when attempting COMPLETED -> STARTED', () => {
      expect(() => assertRideRequestTransition('COMPLETED', 'STARTED')).toThrow(AppError);
      try {
        assertRideRequestTransition('COMPLETED', 'STARTED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('throws 409 INVALID_TRANSITION when attempting COMPLETED -> CANCELLED', () => {
      expect(() => assertRideRequestTransition('COMPLETED', 'CANCELLED')).toThrow(AppError);
      try {
        assertRideRequestTransition('COMPLETED', 'CANCELLED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('throws 409 INVALID_TRANSITION when attempting STARTED -> CANCELLED (§9 test 6)', () => {
      expect(() => assertRideRequestTransition('STARTED', 'CANCELLED')).toThrow(AppError);
      try {
        assertRideRequestTransition('STARTED', 'CANCELLED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('throws 409 INVALID_TRANSITION when attempting to transition from CANCELLED to any state', () => {
      const targets: RideRequestStatus[] = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'];
      for (const target of targets) {
        expect(() => assertRideRequestTransition('CANCELLED', target)).toThrow(AppError);
        try {
          assertRideRequestTransition('CANCELLED', target);
        } catch (err) {
          const error = err as AppError;
          expect(error.statusCode).toBe(409);
          expect(error.code).toBe('INVALID_TRANSITION');
        }
      }
    });

    it('throws 409 INVALID_TRANSITION on arbitrary unknown transitions (e.g. REQUESTED -> COMPLETED)', () => {
      expect(() => assertRideRequestTransition('REQUESTED', 'COMPLETED')).toThrow(AppError);
      try {
        assertRideRequestTransition('REQUESTED', 'COMPLETED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });
  });

  describe('assertPoolTransition', () => {
    it('allows valid progressive pool transitions', () => {
      expect(() => assertPoolTransition('MATCHED', 'DRIVER_ARRIVED')).not.toThrow();
      expect(() => assertPoolTransition('DRIVER_ARRIVED', 'STARTED')).not.toThrow();
      expect(() => assertPoolTransition('STARTED', 'COMPLETED')).not.toThrow();
    });

    it('allows pool cancellation before STARTED', () => {
      expect(() => assertPoolTransition('MATCHED', 'CANCELLED')).not.toThrow();
      expect(() => assertPoolTransition('DRIVER_ARRIVED', 'CANCELLED')).not.toThrow();
    });

    it('throws 409 INVALID_TRANSITION when attempting STARTED -> CANCELLED', () => {
      expect(() => assertPoolTransition('STARTED', 'CANCELLED')).toThrow(AppError);
      try {
        assertPoolTransition('STARTED', 'CANCELLED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('throws 409 INVALID_TRANSITION when attempting COMPLETED -> STARTED', () => {
      expect(() => assertPoolTransition('COMPLETED', 'STARTED')).toThrow(AppError);
      try {
        assertPoolTransition('COMPLETED', 'STARTED');
      } catch (err) {
        const error = err as AppError;
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('throws 409 INVALID_TRANSITION when attempting CANCELLED -> any state', () => {
      const targets: PoolStatus[] = ['MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'];
      for (const target of targets) {
        expect(() => assertPoolTransition('CANCELLED', target)).toThrow(AppError);
      }
    });
  });
});
