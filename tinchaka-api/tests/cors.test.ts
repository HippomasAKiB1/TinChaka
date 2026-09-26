import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';

describe('CORS Middleware & Preflight Controls (Step 11.1)', () => {
  afterAll(async () => {
    delete process.env.TEST_RATE_LIMIT;
    await prisma.$disconnect();
  });

  // Case 1: OPTIONS /auth/login with Origin: http://localhost:3000 and Access-Control-Request-Method: POST
  // -> response has header access-control-allow-origin
  // -> response does NOT have RateLimit-Limit header (preflight is skipped by the limiter)
  it('1. OPTIONS /auth/login returns access-control-allow-origin and skips rate limiting', async () => {
    process.env.TEST_RATE_LIMIT = 'true';
    try {
      const res = await request(app)
        .options('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers).toHaveProperty('access-control-allow-origin');
      expect(res.headers).not.toHaveProperty('ratelimit-limit');
    } finally {
      delete process.env.TEST_RATE_LIMIT;
    }
  });

  // Case 2: GET /health with Origin: http://localhost:3000
  // -> response has access-control-allow-origin header
  it('2. GET /health returns access-control-allow-origin header', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('access-control-allow-origin');
  });
});
