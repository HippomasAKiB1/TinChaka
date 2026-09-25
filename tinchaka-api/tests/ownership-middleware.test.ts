import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { signAccessToken } from '../src/services/jwt.service';
import { requireAuth } from '../src/middleware/requireAuth';
import { requireRole } from '../src/middleware/requireRole';
import { requireOwnership } from '../src/middleware/requireOwnership';
import { errorHandler } from '../src/middleware/errorHandler';

/**
 * Ownership & Role Middleware Tests (Step 5B — §6 step 5, §9 test 5)
 *
 * These tests exercise requireAuth, requireRole, and requireOwnership against
 * a test-only Express app with an in-memory fake resource store. No test routes
 * are added to src/app.ts — this app is scoped entirely to the test file.
 */

// Stable fake user IDs (not in DB — middleware doesn't touch DB)
const nusratId = '00000000-0000-4000-a000-000000000001';
const rafiqId  = '00000000-0000-4000-a000-000000000002';
const jashimId = '00000000-0000-4000-a000-000000000003';

// Fake resource store
const rides = new Map<string, { ownerId: string }>();
rides.set('ride-A', { ownerId: nusratId });
rides.set('ride-B', { ownerId: rafiqId });

// Build test-only Express app
const app = express();
app.use(express.json());

// Auth stub so we can mint real tokens inside tests
app.post('/_test/login-as', async (req, res) => {
  const { userId, role } = req.body;
  const token = signAccessToken({ userId, role });
  res.json({ token });
});

// Protected detail route — the middleware under test
app.get(
  '/_test/rides/:id',
  requireAuth,
  requireOwnership(async (req) => {
    const ride = rides.get(req.params.id);
    return ride ? ride.ownerId : null;
  }),
  (req, res) => res.json({ ok: true, id: req.params.id }),
);

// Role-protected route
app.get(
  '/_test/driver-only',
  requireAuth,
  requireRole('DRIVER'),
  (req, res) => res.json({ ok: true }),
);

// Error handler for the test app
app.use(errorHandler);

// Helper: mint a token for a given userId and role
function mintToken(userId: string, role: 'PASSENGER' | 'DRIVER'): string {
  return signAccessToken({ userId, role });
}

describe('Ownership & Role Middleware (Step 5B)', () => {
  const nusratToken = mintToken(nusratId, 'PASSENGER');
  const rafiqToken  = mintToken(rafiqId, 'PASSENGER');
  const jashimToken = mintToken(jashimId, 'DRIVER');

  // 1. Owner accesses own resource → 200
  it('1. GET /_test/rides/ride-A with Nusrat token → 200', async () => {
    const res = await request(app)
      .get('/_test/rides/ride-A')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 'ride-A' });
  });

  // 2. Cross-user access → 403
  it('2. GET /_test/rides/ride-A with Rafiq token → 403 (cross-user)', async () => {
    const res = await request(app)
      .get('/_test/rides/ride-A')
      .set('Authorization', `Bearer ${rafiqToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 3. Owner accesses own resource → 200
  it('3. GET /_test/rides/ride-B with Rafiq token → 200', async () => {
    const res = await request(app)
      .get('/_test/rides/ride-B')
      .set('Authorization', `Bearer ${rafiqToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 'ride-B' });
  });

  // 4. Cross-user access → 403
  it('4. GET /_test/rides/ride-B with Nusrat token → 403 (cross-user)', async () => {
    const res = await request(app)
      .get('/_test/rides/ride-B')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 5. Nonexistent resource with valid token → 403 (same as cross-user, no existence leak)
  it('5. GET /_test/rides/nonexistent with valid token → 403', async () => {
    const res = await request(app)
      .get('/_test/rides/nonexistent')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 6. No Authorization header → 401
  it('6. GET /_test/rides/ride-A with no Authorization header → 401', async () => {
    const res = await request(app).get('/_test/rides/ride-A');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Missing or malformed Authorization header');
  });

  // 7. Malformed Bearer token → 401
  it('7. GET /_test/rides/ride-A with "Bearer garbage" → 401', async () => {
    const res = await request(app)
      .get('/_test/rides/ride-A')
      .set('Authorization', 'Bearer garbage');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  // 8. Token signed with a different secret → 401
  it('8. GET /_test/rides/ride-A with token signed with wrong secret → 401', async () => {
    const badToken = jwt.sign(
      { userId: nusratId, role: 'PASSENGER' },
      'completely-wrong-secret',
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/_test/rides/ride-A')
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 9. PASSENGER accessing DRIVER-only route → 403
  it('9. GET /_test/driver-only with Nusrat (PASSENGER) token → 403', async () => {
    const res = await request(app)
      .get('/_test/driver-only')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Insufficient role');
  });

  // 10. DRIVER accessing DRIVER-only route → 200
  it('10. GET /_test/driver-only with Jashim (DRIVER) token → 200', async () => {
    const res = await request(app)
      .get('/_test/driver-only')
      .set('Authorization', `Bearer ${jashimToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
