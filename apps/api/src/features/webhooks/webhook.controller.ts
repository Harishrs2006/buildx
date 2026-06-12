import { Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import { userService } from '../users/user.service';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { env } from '../../config/env';

type ClerkWebhookEvent =
  | { type: 'user.created' | 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id: string } };

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  phone_numbers: Array<{ phone_number: string }>;
}

export class WebhookController {
  async handleClerkWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        throw AppError.badRequest('Missing svix headers');
      }

      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
      let event: ClerkWebhookEvent;

      try {
        event = wh.verify(req.body, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as ClerkWebhookEvent;
      } catch {
        throw AppError.unauthorized('Invalid webhook signature');
      }

      logger.info(`Clerk webhook received: ${event.type}`);

      switch (event.type) {
        case 'user.created':
        case 'user.updated': {
          const data = event.data as ClerkUserData;
          const primaryEmail = data.email_addresses.find(
            (e) => e.id === data.primary_email_address_id
          );

          if (!primaryEmail) {
            logger.warn('Clerk webhook: no primary email', { userId: data.id });
            res.status(200).json({ received: true });
            return;
          }

          await userService.syncFromClerk({
            clerkId: data.id,
            email: primaryEmail.email_address,
            firstName: data.first_name ?? '',
            lastName: data.last_name ?? '',
            avatarUrl: data.image_url ?? undefined,
            phone: data.phone_numbers[0]?.phone_number ?? undefined,
          });

          break;
        }

        case 'user.deleted': {
          await userService.deleteByClerkId(event.data.id);
          break;
        }

        default:
          logger.debug(`Unhandled Clerk event: ${(event as any).type}`);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  }
}

export const webhookController = new WebhookController();
