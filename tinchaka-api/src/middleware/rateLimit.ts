import rateLimit from 'express-rate-limit';

// §6 step 11: Rate limit /auth/* minimally (10 attempts per 15 minutes per IP)
// When NODE_ENV === 'test', the limiter is skipped unless TEST_RATE_LIMIT is 'true'
// to prevent IP-reuse contention across the comprehensive test suite while remaining fully testable.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts, try again later',
    },
  },
  skip: () => process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
});
