import { getMessaging } from 'firebase-admin/messaging';
import { User } from '../../infrastructure/database/models/User.model';
import { logger } from '../logger/logger';

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

// Send to a single FCM token
export async function sendToToken(token: string, payload: NotificationPayload): Promise<void> {
  try {
    await getMessaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err: any) {
    // Stale token — not an app-breaking error
    logger.warn('FCM send failed', { token: token.slice(0, 12), error: err?.message });
  }
}

// Errors are logged here and never rethrown: every caller is fire-and-forget, and an
// unhandled rejection shuts the server down (see server.ts).
function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

// Look up user(s) by userId string(s) and send if they have a token
export async function notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) return;
    await sendToToken(user.fcmToken, payload);
  } catch (err) {
    logger.error('Notification failed', { userId, title: payload.title, error: errorMessage(err) });
  }
}

// Notify multiple users (e.g. all available drivers)
export async function notifyUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
  try {
    const users = await User.find({ _id: { $in: userIds } }).select('fcmToken').lean();
    const tokens = users.map((u) => u.fcmToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    // sendEachForMulticast is the v12 API
    await getMessaging()
      .sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      })
      .catch((err) => logger.warn('FCM multicast failed', { error: err?.message }));
  } catch (err) {
    logger.error('Notification failed', { userCount: userIds.length, title: payload.title, error: errorMessage(err) });
  }
}
