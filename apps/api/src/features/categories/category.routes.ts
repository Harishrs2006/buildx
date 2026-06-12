import { Router } from 'express';
const router = Router();
router.get('/ping', (_req, res) => res.json({ feature: 'categories', status: 'coming soon' }));
export { router as categoryRoutes };
