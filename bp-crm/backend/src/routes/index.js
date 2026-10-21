import { Router } from 'express';
import authRoutes from './authRoutes.js';
import crmRoutes from './crmRoutes.js';
import financeRoutes from './financeRoutes.js';
import reportRoutes from './reportRoutes.js';
import adminRoutes from './adminRoutes.js';
import { authenticate } from '../middleware/auth.js';
import { subscriptionGuard } from '../middleware/subscriptionGuard.js';

const api = Router();
api.get('/health', (_req, res) => res.json({ status: 'ok' }));
api.use('/auth', authRoutes);

// Everything below requires a valid session; company context comes from that session only.
api.use(authenticate);
// Admin routes manage their own subscription gating so owners can still reactivate a lapsed plan.
api.use(adminRoutes);
// Business data: writes are blocked (read-only mode) when the subscription is not active/trialing.
api.use(subscriptionGuard, crmRoutes, financeRoutes, reportRoutes);

export default api;
