import { Router } from 'express';
import { webhookController } from './webhook.controller';

const router = Router();

// Raw body required for svix signature verification
// Mounted at /webhooks (outside /api/v1)
router.post(
  '/clerk',
  Router().use(
    (req, _res, next) => {
      // Express already parsed body as Buffer via express.raw() mounted in app.ts
      next();
    }
  ),
  webhookController.handleClerkWebhook.bind(webhookController)
);

export { router as webhookRoutes };
