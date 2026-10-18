import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validation/authSchemas.js';
import * as c from '../controllers/authController.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
});

const r = Router();
r.post('/register', limiter, validate({ body: registerSchema }), h(c.register));
r.post('/login', limiter, validate({ body: loginSchema }), h(c.login));
r.post('/logout', c.logout);
r.post('/logout-all', authenticate, h(c.logoutAll));
r.get('/me', authenticate, h(c.me));
export default r;
