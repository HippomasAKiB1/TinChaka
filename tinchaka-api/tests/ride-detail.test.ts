import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * §9 Test #5: Cross-User Access Denied on Every Ownership-Checked Route
 *
 * Verifies that ride detail reads (/ride-requests/:id) and driver pool queries (/pools/me/*)
 * strictly enforce cross-user access barriers, denying unauthorized passengers and drivers with 403 FORBIDDEN.
 */
describe('Ride Detail & History with Cross-User Security (§9 Test #5)', () => {
  let jashimToken: string;
  let nusratToken: string;
  let rafiqToken: string;
  let shirinToken: string;

  let driver2User: { id: string; email: string };
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

    // Register second driver for cross-driver isolation tests
    const driver2Res = await request(app).post('/auth/signup').send({
      name: 'Second Driver',
      email: 'driver2_detail_test@tinchaka.dev',
      password: 'tinchaka123',
      role: 'DRIVER',
    });
    driver2Token = driver2Res.body.token;
    driver2User = driver2Res.body.user;

    // Create a vehicle for the second driver
    await prisma.vehicle.create({
      data: {
        driver_id: driver2User.id,
        name: 'Thunder',
        capacity: 3,
        is_online: true,
      },
    });
  });

  beforeEach(async () => {
    await cleanup();

    // 1. Put Jashim online
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });

    // 2. Nusrat creates Banani -> Mohakhali request
    const nusratReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });
    nusratRideId = nusratReq.body.ride_request.id;

    // 3. Rafiq creates Banani -> Gulshan 1 request
    const rafiqReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Gulshan 1',
        seats_requested: 1,
      });
    rafiqRideId = rafiqReq.body.ride_request.id;

    // 4. Jashim accepts both requests -> active pool with 2 members
    const accept1 = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: nusratRideId });
    poolId = accept1.body.pool.id;

    await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rafiqRideId });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.vehicle.deleteMany({
      where: { driver_id: driver2User.id },
    });
    await prisma.user.deleteMany({
      where: { id: driver2User.id },
    });
    await prisma.$disconnect();
  });

  // 1. Nusrat reads her own ride -> 200 with history array >= 2 rows
  it('1. Nusrat GET /ride-requests/:herOwnRideId -> 200 with audit history', async () => {
    const res = await request(app)
      .get(`/ride-requests/${nusratRideId}`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ride_request.id).toBe(nusratRideId);
    expect(res.body.ride_request.passenger_id).toBeDefined();
    expect(Array.isArray(res.body.ride_request.ride_status_history)).toBe(true);
    expect(res.body.ride_request.ride_status_history.length).toBeGreaterThanOrEqual(2);

    const transitions = res.body.ride_request.ride_status_history.map(
      (h: { from_status: string | null; to_status: string }) => `${h.from_status}->${h.to_status}`
    );
    expect(transitions).toContain('null->REQUESTED');
    expect(transitions).toContain('REQUESTED->MATCHED');
  });

  // 2. Rafiq attempts reading Nusrat's ride -> 403 FORBIDDEN
  it("2. Rafiq GET /ride-requests/:nusratRideId -> 403 FORBIDDEN", async () => {
    const res = await request(app)
      .get(`/ride-requests/${nusratRideId}`)
      .set('Authorization', `Bearer ${rafiqToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 3. Nusrat attempts reading Rafiq's ride -> 403 FORBIDDEN
  it("3. Nusrat GET /ride-requests/:rafiqRideId -> 403 FORBIDDEN", async () => {
    const res = await request(app)
      .get(`/ride-requests/${rafiqRideId}`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 4. Shirin (unrelated passenger) attempts reading Nusrat's ride -> 403 FORBIDDEN
  it("4. Shirin GET /ride-requests/:nusratRideId -> 403 FORBIDDEN", async () => {
    const res = await request(app)
      .get(`/ride-requests/${nusratRideId}`)
      .set('Authorization', `Bearer ${shirinToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 5. Jashim (driver operating the pool) reads Nusrat's ride -> 200 OK
  it("5. Jashim (driver operating pool) GET /ride-requests/:nusratRideId -> 200 OK", async () => {
    const res = await request(app)
      .get(`/ride-requests/${nusratRideId}`)
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ride_request.id).toBe(nusratRideId);
    expect(Array.isArray(res.body.ride_request.ride_status_history)).toBe(true);
  });

  // 6. Jashim attempts reading a ride belonging to another driver's pool -> 403 FORBIDDEN
  it("6. Jashim GET /ride-requests/:someOtherDriversRideId -> 403 FORBIDDEN", async () => {
    // Shirin creates a request and Driver 2 accepts it into Driver 2's pool
    const shirinReq = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });
    const shirinRideId = shirinReq.body.ride_request.id;

    await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({ ride_request_id: shirinRideId });

    // Jashim tries to read Shirin's ride from Driver 2's pool -> 403
    const res = await request(app)
      .get(`/ride-requests/${shirinRideId}`)
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 7. GET /ride-requests/:id without authentication token -> 401
  it('7. GET /ride-requests/:id with no token -> 401', async () => {
    const res = await request(app).get(`/ride-requests/${nusratRideId}`);
    expect(res.status).toBe(401);
  });

  // 8. GET /ride-requests/nonexistent-uuid with token -> 404 (not 403)
  it('8. GET /ride-requests/nonexistent-uuid with any token -> 404', async () => {
    const res = await request(app)
      .get('/ride-requests/nonexistent-uuid')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // 9. Jashim reads his active pool -> 200 with pool aggregate and members
  it('9. GET /pools/me/active as Jashim -> 200 with active pool', async () => {
    const res = await request(app)
      .get('/pools/me/active')
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pool).not.toBeNull();
    expect(res.body.pool.id).toBe(poolId);
    expect(res.body.pool.ride_requests).toHaveLength(2);
  });

  // 10. Nusrat (PASSENGER) attempts GET /pools/me/active -> 403 (role gate)
  it('10. GET /pools/me/active as Nusrat (PASSENGER) -> 403', async () => {
    const res = await request(app)
      .get('/pools/me/active')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 11. Jashim reads his pool history -> 200 containing array of pools
  it('11. GET /pools/me/history as Jashim -> 200 containing pool list', async () => {
    const res = await request(app)
      .get('/pools/me/history')
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pools)).toBe(true);
    expect(res.body.pools.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pools[0].id).toBe(poolId);
  });

  // 12. Nusrat (PASSENGER) attempts GET /pools/me/history -> 403 (role gate)
  it('12. GET /pools/me/history as Nusrat -> 403', async () => {
    const res = await request(app)
      .get('/pools/me/history')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
