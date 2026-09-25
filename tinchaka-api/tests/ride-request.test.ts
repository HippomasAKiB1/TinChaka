import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * Ride Request Creation & Personal History Tests (Step 6)
 *
 * Cleanup strategy:
 * Records every ride request ID created during this test suite and removes associated
 * ride_status_history and ride_requests rows in afterAll. This ensures the demo DB
 * (tinchaka_db) remains clean without interfering with seeded cast records.
 */
describe('Passenger Ride Request Creation (Step 6)', () => {
  let nusratToken: string;
  let nusratId: string;
  let jashimToken: string;
  const createdRideRequestIds: string[] = [];

  beforeAll(async () => {
    // 1. Authenticate as Nusrat (PASSENGER)
    const nusratLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' });
    expect(nusratLogin.status).toBe(200);
    nusratToken = nusratLogin.body.token;
    nusratId = nusratLogin.body.user.id;

    // 2. Authenticate as Jashim (DRIVER)
    const jashimLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'jashim@tinchaka.dev', password: 'tinchaka123' });
    expect(jashimLogin.status).toBe(200);
    jashimToken = jashimLogin.body.token;
  });

  afterAll(async () => {
    // Clean up created ride requests and audit rows
    if (createdRideRequestIds.length > 0) {
      await prisma.rideStatusHistory.deleteMany({
        where: {
          ride_request_id: { in: createdRideRequestIds },
        },
      });
      await prisma.rideRequest.deleteMany({
        where: {
          id: { in: createdRideRequestIds },
        },
      });
    }
    await prisma.$disconnect();
  });

  // 1. POST /ride-requests with no Authorization header -> 401
  it('1. POST /ride-requests with no Authorization header -> 401', async () => {
    const res = await request(app)
      .post('/ride-requests')
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 2. POST /ride-requests with Jashim's (DRIVER) token -> 403 (role gate)
  it("2. POST /ride-requests with Jashim's (DRIVER) token -> 403", async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Insufficient role');
  });

  // 3. POST /ride-requests with Nusrat's token, valid body -> 201
  it("3. POST /ride-requests with Nusrat's token, valid body (1 seat) -> 201 with estimated fare 7500", async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ride_request');
    const ride = res.body.ride_request;
    createdRideRequestIds.push(ride.id);

    expect(ride.passenger_id).toBe(nusratId);
    expect(ride.pickup_zone).toBe('Banani');
    expect(ride.destination_zone).toBe('Mohakhali');
    expect(ride.seats_requested).toBe(1);
    expect(ride.status).toBe('REQUESTED');
    expect(ride.pool_id).toBeNull();
    expect(ride.estimated_fare_poysha).toBe(7500);
    expect(ride.final_fare_poysha).toBeNull();
  });

  // 4. POST /ride-requests with Nusrat's token, same zones, seats_requested: 3 -> 201
  it("4. POST /ride-requests with Nusrat's token, same zones, 3 seats -> 201", async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 3,
      });

    expect(res.status).toBe(201);
    const ride = res.body.ride_request;
    createdRideRequestIds.push(ride.id);

    expect(ride.estimated_fare_poysha).toBe(7500);
    expect(ride.seats_requested).toBe(3);
  });

  // 5. POST /ride-requests with invalid zone 'Mars' -> 400
  it("5. POST /ride-requests with invalid zone 'Mars' -> 400", async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Mars',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 6. POST /ride-requests with seats_requested: 0 -> 400
  it('6. POST /ride-requests with seats_requested: 0 -> 400', async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 7. POST /ride-requests with seats_requested: 10 -> 400 (max 3)
  it('7. POST /ride-requests with seats_requested: 10 -> 400 (max 3)', async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 8. Verify ride_status_history row exists with from_status null, to_status REQUESTED
  it('8. Verifies ride_status_history audit row created with from_status=null and to_status=REQUESTED', async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Gulshan 1',
        seats_requested: 1,
      });

    expect(res.status).toBe(201);
    const ride = res.body.ride_request;
    createdRideRequestIds.push(ride.id);

    const historyRows = await prisma.rideStatusHistory.findMany({
      where: { ride_request_id: ride.id },
    });

    expect(historyRows).toHaveLength(1);
    expect(historyRows[0].from_status).toBeNull();
    expect(historyRows[0].to_status).toBe('REQUESTED');
    expect(historyRows[0].changed_by_user_id).toBe(nusratId);
  });

  // 9. GET /ride-requests/me with Nusrat's token -> 200
  it("9. GET /ride-requests/me with Nusrat's token -> 200 containing created requests", async () => {
    const res = await request(app)
      .get('/ride-requests/me')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ride_requests');
    expect(Array.isArray(res.body.ride_requests)).toBe(true);

    const retrievedIds = res.body.ride_requests.map((r: { id: string }) => r.id);
    for (const id of createdRideRequestIds) {
      expect(retrievedIds).toContain(id);
    }
  });

  // 10. GET /ride-requests/me with Jashim's token -> 403 (role gate)
  it("10. GET /ride-requests/me with Jashim's (DRIVER) token -> 403", async () => {
    const res = await request(app)
      .get('/ride-requests/me')
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Insufficient role');
  });
});
