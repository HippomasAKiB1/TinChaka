import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * §9 Test #3 & Test #6: Ride Lifecycle & Cancellation Cutoff Tests
 *
 * Verifies the full ride state machine progression (arrived -> started -> completed),
 * payment settlement generation, cancellation rules before and after STARTED cutoff,
 * single-member fare rebalancing upon cancellation, and cross-user authorization barriers.
 */
describe('Ride Lifecycle & Cancellation (§9 Test #3 & #6)', () => {
  let jashimToken: string;
  let nusratToken: string;
  let rafiqToken: string;
  let shirinToken: string;
  let driver2Token: string;

  let poolId: string;
  let nusratRideId: string;
  let rafiqRideId: string;

  async function cleanup(): Promise<void> {
    await prisma.rideStatusHistory.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.rideRequest.deleteMany({});
    await prisma.pool.deleteMany({});
    await prisma.vehicle.updateMany({
      data: { is_online: false },
    });
  }

  beforeAll(async () => {
    // Authenticate story cast
    const [jashim, nusrat, rafiq, shirin] = await Promise.all([
      request(app).post('/auth/login').send({ email: 'jashim@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'rafiq@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'shirin@tinchaka.dev', password: 'tinchaka123' }),
    ]);

    jashimToken = jashim.body.token;
    nusratToken = nusrat.body.token;
    rafiqToken = rafiq.body.token;
    shirinToken = shirin.body.token;

    // Register a second driver for cross-user tests
    const driver2Res = await request(app).post('/auth/signup').send({
      name: 'Second Driver',
      email: 'driver2_lifecycle@tinchaka.dev',
      password: 'tinchaka123',
      role: 'DRIVER',
    });
    driver2Token = driver2Res.body.token;
  });

  beforeEach(async () => {
    await cleanup();

    // 1. Put Jashim online
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // 2. Nusrat requests Banani -> Mohakhali (3km, solo estimate 7500)
    const nusratReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });
    nusratRideId = nusratReq.body.ride_request.id;

    // 3. Rafiq requests Banani -> Gulshan 1 (4km, solo estimate 9000)
    const rafiqReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Gulshan 1',
        seats_requested: 1,
      });
    rafiqRideId = rafiqReq.body.ride_request.id;

    // 4. Jashim accepts Nusrat, creating the pool
    const accept1 = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: nusratRideId });
    poolId = accept1.body.pool.id;

    // 5. Jashim accepts Rafiq into the same pool
    await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rafiqRideId });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.user.deleteMany({
      where: { email: 'driver2_lifecycle@tinchaka.dev' },
    });
    await prisma.$disconnect();
  });

  // 1. Full happy path: arrived → started → complete
  it('1. Happy path: arrived -> started -> complete creates payments and full audit history', async () => {
    // a) Driver arrived
    const arrivedRes = await request(app)
      .patch(`/pools/${poolId}/arrived`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.pool.status).toBe('DRIVER_ARRIVED');

    // b) Trip started
    const startRes = await request(app)
      .patch(`/pools/${poolId}/start`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.pool.status).toBe('STARTED');
    expect(startRes.body.pool.started_at).not.toBeNull();

    // c) Trip complete
    const completeRes = await request(app)
      .patch(`/pools/${poolId}/complete`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.pool.status).toBe('COMPLETED');
    expect(completeRes.body.pool.completed_at).not.toBeNull();

    // Verify DB state
    const poolInDb = await prisma.pool.findUniqueOrThrow({
      where: { id: poolId },
      include: { ride_requests: true },
    });
    expect(poolInDb.status).toBe('COMPLETED');
    expect(poolInDb.ride_requests).toHaveLength(2);
    expect(poolInDb.ride_requests.every((r) => r.status === 'COMPLETED')).toBe(true);

    // Verify settlement payments (amount = final_fare_poysha, method = CASH, status = PENDING)
    const payments = await prisma.payment.findMany({
      where: {
        ride_request_id: { in: [nusratRideId, rafiqRideId] },
      },
    });
    expect(payments).toHaveLength(2);

    const nusratPayment = payments.find((p) => p.ride_request_id === nusratRideId)!;
    expect(nusratPayment.amount_poysha).toBe(6600); // 3000 + 4500 - 900
    expect(nusratPayment.method).toBe('CASH');
    expect(nusratPayment.status).toBe('PENDING');

    const rafiqPayment = payments.find((p) => p.ride_request_id === rafiqRideId)!;
    expect(rafiqPayment.amount_poysha).toBe(7800); // 3000 + 6000 - 1200
    expect(rafiqPayment.method).toBe('CASH');
    expect(rafiqPayment.status).toBe('PENDING');

    // Verify audit trail per member (4 lifecycle transitions: REQUESTED->MATCHED, MATCHED->DRIVER_ARRIVED, DRIVER_ARRIVED->STARTED, STARTED->COMPLETED)
    for (const memberId of [nusratRideId, rafiqRideId]) {
      const history = await prisma.rideStatusHistory.findMany({
        where: { ride_request_id: memberId, from_status: { not: null } },
        orderBy: { changed_at: 'asc' },
      });
      expect(history).toHaveLength(4);
      expect(history.map((h) => `${h.from_status}->${h.to_status}`)).toEqual([
        'REQUESTED->MATCHED',
        'MATCHED->DRIVER_ARRIVED',
        'DRIVER_ARRIVED->STARTED',
        'STARTED->COMPLETED',
      ]);
    }
  });

  // 2. §9 test 6: cancel blocked after STARTED
  it('2. §9 test 6: cancellation blocked once pool is STARTED for both passengers and driver', async () => {
    // Advance to DRIVER_ARRIVED then STARTED
    await request(app)
      .patch(`/pools/${poolId}/arrived`)
      .set('Authorization', `Bearer ${jashimToken}`);
    await request(app)
      .patch(`/pools/${poolId}/start`)
      .set('Authorization', `Bearer ${jashimToken}`);

    // Nusrat attempts cancellation -> 409 INVALID_TRANSITION
    const nusratCancel = await request(app)
      .patch(`/ride-requests/${nusratRideId}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);
    expect(nusratCancel.status).toBe(409);
    expect(nusratCancel.body.error.code).toBe('INVALID_TRANSITION');

    // Rafiq attempts cancellation -> 409 INVALID_TRANSITION
    const rafiqCancel = await request(app)
      .patch(`/ride-requests/${rafiqRideId}/cancel`)
      .set('Authorization', `Bearer ${rafiqToken}`);
    expect(rafiqCancel.status).toBe(409);
    expect(rafiqCancel.body.error.code).toBe('INVALID_TRANSITION');

    // Driver attempts to cancel started pool -> 409 INVALID_TRANSITION
    const poolCancel = await request(app)
      .patch(`/pools/${poolId}/cancel`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(poolCancel.status).toBe(409);
    expect(poolCancel.body.error.code).toBe('INVALID_TRANSITION');
  });

  // 3. Cancel allowed before STARTED: Nusrat cancels, Rafiq reverts to solo estimate
  it('3. Cancel allowed before STARTED: cancels request and reverts remaining member to solo fare', async () => {
    // Advance pool to DRIVER_ARRIVED
    await request(app)
      .patch(`/pools/${poolId}/arrived`)
      .set('Authorization', `Bearer ${jashimToken}`);

    // Nusrat cancels -> 200 OK
    const cancelRes = await request(app)
      .patch(`/ride-requests/${nusratRideId}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.ride_request.status).toBe('CANCELLED');

    // Verify Nusrat's status in DB
    const dbNusrat = await prisma.rideRequest.findUniqueOrThrow({ where: { id: nusratRideId } });
    expect(dbNusrat.status).toBe('CANCELLED');

    // Verify Rafiq reverts to solo estimate (9000 poysha)
    const dbRafiq = await prisma.rideRequest.findUniqueOrThrow({ where: { id: rafiqRideId } });
    expect(dbRafiq.status).toBe('DRIVER_ARRIVED');
    expect(dbRafiq.final_fare_poysha).toBe(9000); // 3000 base + 4km * 1500 solo
  });

  // 4. Cross-user forbidden: unrelated passenger or driver cannot mutate resource
  it('4. Cross-user access denied: returns 403 FORBIDDEN', async () => {
    // Shirin (unrelated passenger) tries to cancel Nusrat's ride -> 403
    const shirinCancel = await request(app)
      .patch(`/ride-requests/${nusratRideId}/cancel`)
      .set('Authorization', `Bearer ${shirinToken}`);
    expect(shirinCancel.status).toBe(403);
    expect(shirinCancel.body.error.code).toBe('FORBIDDEN');

    // Second driver tries to mutate Jashim's pool -> 403
    const driver2Start = await request(app)
      .patch(`/pools/${poolId}/start`)
      .set('Authorization', `Bearer ${driver2Token}`);
    expect(driver2Start.status).toBe(403);
    expect(driver2Start.body.error.code).toBe('FORBIDDEN');
  });

  // 5. Driver cancels pool before STARTED: both members cancelled, audit history logged
  it('5. Driver cancels pool before STARTED: cancels all active members and pool aggregate', async () => {
    // Jashim cancels pool at MATCHED state
    const poolCancel = await request(app)
      .patch(`/pools/${poolId}/cancel`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(poolCancel.status).toBe(200);
    expect(poolCancel.body.pool.status).toBe('CANCELLED');

    // Both members should now be CANCELLED
    const [dbNusrat, dbRafiq, dbPool] = await Promise.all([
      prisma.rideRequest.findUniqueOrThrow({ where: { id: nusratRideId } }),
      prisma.rideRequest.findUniqueOrThrow({ where: { id: rafiqRideId } }),
      prisma.pool.findUniqueOrThrow({ where: { id: poolId } }),
    ]);

    expect(dbNusrat.status).toBe('CANCELLED');
    expect(dbRafiq.status).toBe('CANCELLED');
    expect(dbPool.status).toBe('CANCELLED');

    // Audit rows exist for both members
    const nusratHistory = await prisma.rideStatusHistory.findFirst({
      where: { ride_request_id: nusratRideId, to_status: 'CANCELLED' },
    });
    expect(nusratHistory).not.toBeNull();
    expect(nusratHistory!.from_status).toBe('MATCHED');
  });

  // 6. Invalid transition attempt: skipping steps is rejected
  it('6. Invalid transition: skipping lifecycle states returns 409 INVALID_TRANSITION', async () => {
    // Attempt MATCHED -> COMPLETED directly (skipping DRIVER_ARRIVED and STARTED)
    const invalidRes = await request(app)
      .patch(`/pools/${poolId}/complete`)
      .set('Authorization', `Bearer ${jashimToken}`);
    expect(invalidRes.status).toBe(409);
    expect(invalidRes.body.error.code).toBe('INVALID_TRANSITION');
  });
});
