import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

/**
 * Step 10: Backend Polish Test Suite
 *
 * Verifies request rate limiting on /auth/*, database reachability health checks,
 * strict body validation rejecting unknown fields, and route parameter UUID validation.
 */
describe('Backend Polish & Security Controls (Step 10)', () => {
  let nusratToken: string;

  beforeAll(async () => {
    const nusratRes = await request(app)
      .post('/auth/login')
      .send({ email: 'nusrat@tinchaka.dev', password: 'tinchaka123' });
    nusratToken = nusratRes.body.token;
  });

  afterAll(async () => {
    delete process.env.TEST_RATE_LIMIT;
    await prisma.$disconnect();
  });

  // 1. Rate limiter: 11 rapid POSTs to /auth/login -> first 10 return 401, 11th returns 429 RATE_LIMITED
  it('1. Rate limiter: allows 10 failed login attempts, rejects 11th with 429 RATE_LIMITED', async () => {
    // Explicitly enable rate limiting in test environment for this test case
    process.env.TEST_RATE_LIMIT = 'true';

    try {
      const results: number[] = [];

      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: 'nusrat@tinchaka.dev', password: 'wrongpassword' });
        results.push(res.status);
        if (i === 10) {
          expect(res.status).toBe(429);
          expect(res.body.error.code).toBe('RATE_LIMITED');
        }
      }

      // First 10 attempts returned 401 INVALID_CREDENTIALS
      expect(results.slice(0, 10).every((status) => status === 401)).toBe(true);
      // 11th attempt returned 429 Too Many Requests
      expect(results[10]).toBe(429);
    } finally {
      delete process.env.TEST_RATE_LIMIT;
    }
  });

  // 2. Health check: GET /health -> 200 { status: 'ok', db: 'up' }
  it('2. Health check: reports API and PostgreSQL database reachability', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  // 3. Validation: POST /ride-requests with body containing extra unknown field -> 400 VALIDATION_ERROR
  it('3. Strict body validation: rejects unexpected unknown fields with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/ride-requests')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
        unrecognized_extra_property: 'malicious_or_accidental_payload',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('unrecognized_extra_property');
  });

  // 4. Param validation: GET /ride-requests/not-a-uuid -> 400 VALIDATION_ERROR, not 500
  it('4. Param validation: malformed UUID parameter returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/ride-requests/not-a-uuid')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain("Invalid UUID format for parameter 'id'");
  });
});
