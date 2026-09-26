import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

describe('Passenger Pool Visibility & Fare Privacy (§7 step 6)', () => {
  let nusratToken: string;
  let rafiqToken: string;
  let jashimToken: string;
  let shirinToken: string;

  beforeAll(async () => {
    const nusratLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' });
    nusratToken = nusratLogin.body.token;

    const rafiqLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'rafiq@tinchaka.dev', password: 'tinchaka123' });
    rafiqToken = rafiqLogin.body.token;

    const jashimLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'jashim@tinchaka.dev', password: 'tinchaka123' });
    jashimToken = jashimLogin.body.token;

    const shirinLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'shirin@tinchaka.dev', password: 'tinchaka123' });
    shirinToken = shirinLogin.body.token;

    // Ensure Jashim's vehicle is online
    await request(app)
      .patch('/vehicles/me/online')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ is_online: true });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Case 1: Nusrat creates ride, Jashim accepts, Rafiq joins pool
  // - GET /ride-requests/me as Nusrat -> response includes pool_members with both Nusrat and Rafiq's names
  // - pool_members sub-object MUST NOT contain any fare fields
  it('1. Nusrat sees pool members (Nusrat & Rafiq) without exposing another member fare', async () => {
    // Nusrat creates ride
    const nusratRideRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });
    expect(nusratRideRes.status).toBe(201);
    const nusratRideId = nusratRideRes.body.ride_request.id;

    // Jashim accepts Nusrat's ride (creates pool)
    const acceptNusratRes = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: nusratRideId });
    expect(acceptNusratRes.status).toBe(200);

    // Rafiq creates ride in same zone
    const rafiqRideRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${rafiqToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Gulshan 1',
        seats_requested: 1,
      });
    expect(rafiqRideRes.status).toBe(201);
    const rafiqRideId = rafiqRideRes.body.ride_request.id;

    // Jashim accepts Rafiq's ride (joins pool)
    const acceptRafiqRes = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: rafiqRideId });
    expect(acceptRafiqRes.status).toBe(200);

    // Nusrat fetches her rides
    const listRes = await request(app)
      .get('/ride-requests/me')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(listRes.status).toBe(200);
    const targetRide = listRes.body.ride_requests.find((r: any) => r.id === nusratRideId);
    expect(targetRide).toBeDefined();
    expect(targetRide.pool_members).toBeDefined();
    expect(Array.isArray(targetRide.pool_members)).toBe(true);
    expect(targetRide.pool_members.length).toBe(2);

    const memberNames = targetRide.pool_members.map((m: any) => m.name);
    expect(memberNames).toContain('Nusrat');
    expect(memberNames).toContain('Rafiq');

    // Strict privacy assertion: NO fare fields exposed in pool_members sub-objects
    for (const member of targetRide.pool_members) {
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('seats_requested');
      expect(member).not.toHaveProperty('estimated_fare_poysha');
      expect(member).not.toHaveProperty('final_fare_poysha');
      expect(member).not.toHaveProperty('fare');
    }
  });

  // Case 2: Solo request (no pool): pool_members is null
  it('2. Solo request without an assigned pool has pool_members: null', async () => {
    const soloRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({
        pickup_zone: 'Dhanmondi',
        destination_zone: 'Farmgate',
        seats_requested: 1,
      });
    expect(soloRes.status).toBe(201);
    const soloId = soloRes.body.ride_request.id;

    const listRes = await request(app)
      .get('/ride-requests/me')
      .set('Authorization', `Bearer ${shirinToken}`);

    expect(listRes.status).toBe(200);
    const targetRide = listRes.body.ride_requests.find((r: any) => r.id === soloId);
    expect(targetRide).toBeDefined();
    expect(targetRide.pool_id).toBeNull();
    expect(targetRide.pool_members).toBeNull();
  });

  // Case 3: Cancelled member is excluded from pool_members
  it('3. Cancelled member is excluded from pool_members', async () => {
    // Shirin requests ride in Banani
    const shirinRideRes = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
      });
    expect(shirinRideRes.status).toBe(201);
    const shirinRideId = shirinRideRes.body.ride_request.id;

    // Jashim accepts Shirin into the pool
    const acceptShirinRes = await request(app)
      .post('/pools/accept')
      .set('Authorization', `Bearer ${jashimToken}`)
      .send({ ride_request_id: shirinRideId });
    expect(acceptShirinRes.status).toBe(200);

    // Shirin cancels her ride
    const cancelRes = await request(app)
      .patch(`/ride-requests/${shirinRideId}/cancel`)
      .set('Authorization', `Bearer ${shirinToken}`);
    expect(cancelRes.status).toBe(200);

    // Nusrat inspects her ride again
    const listRes = await request(app)
      .get('/ride-requests/me')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(listRes.status).toBe(200);
    const activeRide = listRes.body.ride_requests.find((r: any) => r.status === 'MATCHED');
    expect(activeRide).toBeDefined();
    const activeMemberNames = activeRide.pool_members.map((m: any) => m.name);
    // Shirin must NOT appear in pool_members because she cancelled
    expect(activeMemberNames).not.toContain('Shirin');
  });
});
