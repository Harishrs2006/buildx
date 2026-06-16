import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { chat, analyzeList } from './ai.controller';

const router = Router();

router.use(requireAuth);

router.post('/chat', chat);
router.post('/analyze-list', analyzeList);

export { router as aiRoutes };
