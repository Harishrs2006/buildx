import { Router } from 'express';
const router = Router();
router.get('/ping', (_req, res) => res.json({ feature: 'payments', status: 'coming soon' }));
export { router as paymentRoutes };
