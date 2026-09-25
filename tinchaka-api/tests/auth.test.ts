import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { verifyAccessToken } from '../src/services/jwt.service';

/**
 * Database Isolation Strategy Decision:
 * We use the active development/test PostgreSQL instance and isolate test data using an
 * 'auth_test_' email prefix. Before and after the test suite runs, all records with this
 * prefix are cleaned up. This avoids connection pool contention and shadow database
 * lifecycle overhead on an 8 GB host, while keeping seeded production/demo cast intact.
 */
const TEST_EMAIL_PREFIX = 'auth_test_';

async function cleanupTestUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: TEST_EMAIL_PREFIX,
      },
    },
  });
}

describe('Authentication Primitives (Step 5A)', () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  // 1. POST /auth/signup happy path
  it('1. POST /auth/signup happy path → 201, returns token + user without password_hash', async () => {
    const signupData = {
      name: 'Auth Test User',
      email: `${TEST_EMAIL_PREFIX}happy@tinchaka.dev`,
      password: 'tinchaka123',
      role: 'PASSENGER',
    };

    const res = await request(app).post('/auth/signup').send(signupData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toMatchObject({
      name: signupData.name,
      email: signupData.email,
      role: signupData.role,
    });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('created_at');
    // Ensure password_hash is NEVER leaked in response
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  // 2. POST /auth/signup duplicate email
  it('2. POST /auth/signup duplicate email → 409', async () => {
    const duplicateData = {
      name: 'Duplicate User',
      email: `${TEST_EMAIL_PREFIX}duplicate@tinchaka.dev`,
      password: 'tinchaka123',
      role: 'PASSENGER',
    };

    const firstRes = await request(app).post('/auth/signup').send(duplicateData);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post('/auth/signup').send(duplicateData);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body).toHaveProperty('error');
    expect(secondRes.body.error).toMatchObject({
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Email already registered',
    });
  });

  // 3. POST /auth/signup invalid body
  it('3. POST /auth/signup invalid body (missing email, short password) → 400', async () => {
    const invalidData = {
      name: 'Invalid User',
      // missing email
      password: 'short', // < 8 characters
      role: 'INVALID_ROLE',
    };

    const res = await request(app).post('/auth/signup').send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 4. POST /auth/login happy path
  it('4. POST /auth/login happy path → 200, returns token + user', async () => {
    const userData = {
      name: 'Login Test User',
      email: `${TEST_EMAIL_PREFIX}login@tinchaka.dev`,
      password: 'tinchaka123',
      role: 'DRIVER',
    };

    await request(app).post('/auth/signup').send(userData);

    const loginRes = await request(app).post('/auth/login').send({
      email: userData.email,
      password: userData.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(typeof loginRes.body.token).toBe('string');
    expect(loginRes.body.user).toMatchObject({
      name: userData.name,
      email: userData.email,
      role: userData.role,
    });
    expect(loginRes.body.user).not.toHaveProperty('password_hash');
  });

  // 5. POST /auth/login wrong password
  it('5. POST /auth/login wrong password → 401 (same body as unknown email)', async () => {
    const userData = {
      name: 'Wrong Password User',
      email: `${TEST_EMAIL_PREFIX}wrongpw@tinchaka.dev`,
      password: 'tinchaka123',
      role: 'PASSENGER',
    };

    await request(app).post('/auth/signup').send(userData);

    const res = await request(app).post('/auth/login').send({
      email: userData.email,
      password: 'incorrectPassword999',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  });

  // 6. POST /auth/login unknown email
  it('6. POST /auth/login unknown email → 401 (identical to wrong password)', async () => {
    const res = await request(app).post('/auth/login').send({
      email: `${TEST_EMAIL_PREFIX}nonexistent@tinchaka.dev`,
      password: 'anyPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  });

  // 7. Token round-trip: signup → parse JWT → verifyAccessToken returns correct userId + role
  it('7. Token round-trip: signup → parse JWT → verifyAccessToken returns correct userId + role', async () => {
    const userData = {
      name: 'Roundtrip User',
      email: `${TEST_EMAIL_PREFIX}roundtrip@tinchaka.dev`,
      password: 'tinchaka123',
      role: 'PASSENGER',
    };

    const signupRes = await request(app).post('/auth/signup').send(userData);
    expect(signupRes.status).toBe(201);
    const { user, token } = signupRes.body;

    const payload = verifyAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(user.id);
    expect(payload?.role).toBe(user.role);
  });
});
