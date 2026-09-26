import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * §9 Test #1: Pool Capacity & Fare Invariant Tests
 *
 * Verifies capacity bounds (max 3), zone matching, driver availability checks,
 * and two-stage dynamic pooled fare recalculation when riders join an active pool.
 */
describe('Pool Capacity & Pooling Logic (§9 Test #1)', () => {
  let jashimToken: string;
  let nusratToken: string;
  let rafiqToken: string;
  let shirinToken: string;

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
    // Cache auth tokens for story cast
    const jashimLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'jashim@tinchaka.dev', password: 'tinchaka123' });
    jashimToken = jashimLogin.body.token;

    const nusratLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' });
    nusratToken = nusratLogin.body.token;

    const rafiqLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'rafiq@tinchaka.dev', password: 'tinchaka123' });
    rafiqToken = rafiqLogin.body.token;

    const shirinLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'shirin@tinchaka.dev', password: 'tinchaka123' });
    shirinToken = shirinLogin.body.token;
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // 1. Capacity Unit: Add 1 seat -> 200, Add 2 seats -> 200 (total 3), Add 1 more -> 409 CAPACITY_EXCEEDED
  it('1. Capacity unit: respects vehicle capacity 3, rejects exceeding seat request with 409', async () => {
    // Put driver online
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // Rider 1 requests 1 seat
    const r1 = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    expect(r1.status).toBe(201);
    const ride1Id = r1.body.ride_request.id;

    // Rider 2 requests 2 seats
    const r2 = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 2 });
    expect(r2.status).toBe(201);
    const ride2Id = r2.body.ride_request.id;

    // Rider 3 requests 1 seat
    const r3 = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    expect(r3.status).toBe(201);
    const ride3Id = r3.body.ride_request.id;

    // Driver accepts Rider 1 (1 seat, total 1/3)
    const accept1 = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: ride1Id });
    expect(accept1.status).toBe(200);

    // Driver accepts Rider 2 (2 seats, total 3/3)
    const accept2 = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: ride2Id });
    expect(accept2.status).toBe(200);

    // Driver attempts to accept Rider 3 (1 seat -> total 4 > 3 capacity) -> 409
    const accept3 = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: ride3Id });
    expect(accept3.status).toBe(409);
    expect(accept3.body.error.code).toBe('CAPACITY_EXCEEDED');
    expect(accept3.body.error.message).toBe('Not enough seats remaining');
  });

  // 2. Zone mismatch: pool in Banani, attempt to accept request in Mohakhali -> 409 ZONE_MISMATCH
  it('2. Zone mismatch: rejects candidate request whose pickup_zone differs from active pool', async () => {
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // Initial rider in Banani
    const bananiRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    const bananiRideId = bananiRes.body.ride_request.id;

    // Accept Banani rider -> establishes Banani as the active pool pickup zone
    await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: bananiRideId });

    // Candidate rider in Mohakhali
    const mohakhaliRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({ pickup_zone: 'Mohakhali', destination_zone: 'Banani', seats_requested: 1 });
    const mohakhaliRideId = mohakhaliRes.body.ride_request.id;

    // Driver attempts to accept Mohakhali rider into Banani pool -> 409
    const mismatchRes = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: mohakhaliRideId });

    expect(mismatchRes.status).toBe(409);
    expect(mismatchRes.body.error.code).toBe('ZONE_MISMATCH');
    expect(mismatchRes.body.error.message).toBe('Request is in a different pickup zone');
  });

  // 3. Offline driver: Jashim offline -> accept -> 409 DRIVER_OFFLINE
  it('3. Offline driver: rejects accept when driver vehicle is offline with 409 DRIVER_OFFLINE', async () => {
    // Explicitly set offline
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: false });

    const rideRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    const rideId = rideRes.body.ride_request.id;

    const acceptRes = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rideId });

    expect(acceptRes.status).toBe(409);
    expect(acceptRes.body.error.code).toBe('DRIVER_OFFLINE');
  });

  // 4. Two-stage fare display: 1 rider = solo fare (7500); 2nd joins -> recalculates Nusrat=6600, Rafiq=7800
  it('4. Two-stage fare display: recalculates all member fares with 20% discount when pool reaches 2 riders', async () => {
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // Nusrat: Banani -> Mohakhali (3 km, solo = 7500)
    const nusratReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    const nusratRideId = nusratReq.body.ride_request.id;

    // Jashim accepts Nusrat (pool size = 1)
    const acceptNusrat = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: nusratRideId });

    expect(acceptNusrat.status).toBe(200);

    // Verify Nusrat's initial fare equals solo estimate (7500) since pool size is 1
    const nusratDbSingle = await prisma.rideRequest.findUniqueOrThrow({
      where: { id: nusratRideId },
    });
    expect(nusratDbSingle.final_fare_poysha).toBe(7500);

    // Rafiq: Banani -> Gulshan 1 (4 km, solo = 9000)
    const rafiqReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Gulshan 1', seats_requested: 1 });
    const rafiqRideId = rafiqReq.body.ride_request.id;

    // Jashim accepts Rafiq (pool size = 2)
    const acceptRafiq = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rafiqRideId });

    expect(acceptRafiq.status).toBe(200);

    // Direct DB query: verify BOTH rows updated to pooled discount fares
    const nusratDbPooled = await prisma.rideRequest.findUniqueOrThrow({
      where: { id: nusratRideId },
    });
    const rafiqDbPooled = await prisma.rideRequest.findUniqueOrThrow({
      where: { id: rafiqRideId },
    });

    // Nusrat: 3000 + 4500 - 900 = 6600 poysha
    expect(nusratDbPooled.final_fare_poysha).toBe(6600);
    // Rafiq: 3000 + 6000 - 1200 = 7800 poysha
    expect(rafiqDbPooled.final_fare_poysha).toBe(7800);
  });
});
