import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { aiRateLimit } from '../../shared/middleware/rate-limit.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { chat, analyzeList } from './ai.controller';

const router = Router();

// Paid third-party calls: buyers only, rate-limited per user
router.use(requireAuth, requireRole('BUYER'), aiRateLimit);

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .default([]),
});

// Size is already bounded by the 10 MB JSON body limit in app.ts
const analyzeSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
});

router.post('/chat', validate(chatSchema), chat);
router.post('/analyze-list', validate(analyzeSchema), analyzeList);

export { router as aiRoutes };
