import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * §9 Test #2: Concurrency & Last-Seat Race Test
 *
 * Simulates two concurrent accept calls racing for the last available seat in a pool.
 * Under PostgreSQL SELECT ... FOR UPDATE row-level locking within the transaction,
 * exactly one accept must succeed with 200 and the other must be rejected with 409 CAPACITY_EXCEEDED.
 * Total occupied seats in the pool must never exceed the vehicle capacity (3).
 */
describe('Concurrency & Last-Seat Race (§9 Test #2)', () => {
  let jashimToken: string;
  let nusratToken: string;
  let rafiqToken: string;
  let shirinToken: string;
  let karimToken: string;

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
    // Authenticate driver and passengers
    const [jashim, nusrat, rafiq, shirin, karim] = await Promise.all([
      request(app).post('/auth/login').send({ email: 'jashim@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'rafiq@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'shirin@tinchaka.dev', password: 'tinchaka123' }),
      request(app).post('/auth/login').send({ email: 'karim@tinchaka.dev', password: 'tinchaka123' }),
    ]);

    jashimToken = jashim.body.token;
    nusratToken = nusrat.body.token;
    rafiqToken = rafiq.body.token;
    shirinToken = shirin.body.token;
    karimToken = karim.body.token;
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('runs last-seat race between two requests: exactly one receives 200 and one receives 409', async () => {
    // 1. Set driver online
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // 2. Create 4 ride requests: A (Nusrat), B (Rafiq), C (Shirin), D (Karim) - 1 seat each, Banani -> Mohakhali
    const [resA, resB, resC, resD] = await Promise.all([
      request(app).post('/ride-requests').set('Authorization', `Bearer ${nusratToken}`).send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      }),
      request(app).post('/ride-requests').set('Authorization', `Bearer ${rafiqToken}`).send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      }),
      request(app).post('/ride-requests').set('Authorization', `Bearer ${shirinToken}`).send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      }),
      request(app).post('/ride-requests').set('Authorization', `Bearer ${karimToken}`).send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      }),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(resC.status).toBe(201);
    expect(resD.status).toBe(201);

    const rideA = resA.body.ride_request.id;
    const rideB = resB.body.ride_request.id;
    const rideC = resC.body.ride_request.id;
    const rideD = resD.body.ride_request.id;

    // 3. Driver accepts A -> pool created, 1 seat used (1/3)
    const acceptA = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rideA });
    expect(acceptA.status).toBe(200);

    // 4. Driver accepts B -> 2 seats used (2/3), exactly 1 seat remaining
    const acceptB = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rideB });
    expect(acceptB.status).toBe(200);
    const poolId = acceptB.body.pool.id;

    // 5. THE RACE: Concurrently fire accept for C and D competing for the 1 remaining seat
    const [r1, r2] = await Promise.all([
      request(app)
        .post('/pools/accept')
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ ride_request_id: rideC }),
      request(app)
        .post('/pools/accept')
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ ride_request_id: rideD }),
    ]);

    const statuses = [r1.status, r2.status];

    // Assertion 1: Exactly one status is 200 and one is 409
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);

    // Assertion 2: The rejected one returns CAPACITY_EXCEEDED error code
    const rejected = r1.status === 409 ? r1 : r2;
    expect(rejected.body.error.code).toBe('CAPACITY_EXCEEDED');

    // Assertion 3: Direct DB query for total occupied seats in the pool <= 3
    const sumResult = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(seats_requested), 0)::int as total
      FROM ride_requests
      WHERE pool_id = ${poolId}::uuid
        AND status::text IN ('MATCHED', 'DRIVER_ARRIVED', 'STARTED')
    `;

    const totalSeatsInPool = sumResult[0]?.total ?? 0;
    expect(totalSeatsInPool).toBe(3);

    // Assertion 4: Only one of C or D is linked to the pool; the loser remains REQUESTED with pool_id null
    const [dbC, dbD] = await Promise.all([
      prisma.rideRequest.findUniqueOrThrow({ where: { id: rideC } }),
      prisma.rideRequest.findUniqueOrThrow({ where: { id: rideD } }),
    ]);

    const winner = dbC.pool_id === poolId ? dbC : dbD;
    const loser = dbC.pool_id === poolId ? dbD : dbC;

    expect(winner.status).toBe('MATCHED');
    expect(winner.pool_id).toBe(poolId);

    expect(loser.status).toBe('REQUESTED');
    expect(loser.pool_id).toBeNull();
  });
});
