import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

// Map the `screen` (and `orderId`) data fields sent by the API to an app screen
export function resolveScreen(screen?: string, orderId?: string): string | null {
  switch (screen) {
    case 'buyer_orders':
      return orderId ? `/(buyer)/order/${orderId}` : '/(buyer)/orders';
    case 'supplier_orders':
      return '/(supplier)/orders';
    case 'supplier_weekly':
      return '/(supplier)/weekly';
    case 'supplier_profile':
      return '/(supplier)/profile';
    case 'driver_available':
      return orderId ? `/(driver)/order/${orderId}` : '/(driver)/available';
    default:
      return null;
  }
}

/** A notification that arrived while the app was open (the phone does not show those itself). */
export type InAppAlert = { id: string; title: string; body: string; path: string | null };

export const useInAppAlert = create<{ alert: InAppAlert | null; show: (a: InAppAlert) => void; dismiss: () => void }>((set) => ({
  alert: null,
  show: (alert) => set({ alert }),
  dismiss: () => set({ alert: null }),
}));

function openFrom(msg: FirebaseMessagingTypes.RemoteMessage | null, replace = false) {
  if (!msg?.data) return;
  const path = resolveScreen(msg.data.screen as string, msg.data.orderId as string);
  if (!path) return;
  if (replace) router.replace(path as any);
  else router.push(path as any);
}

async function registerToken() {
  try {
    // Android 13+ shows nothing until the person allows notifications
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    // iOS asks here; on Android this just reports the status
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    const token = await messaging().getToken();
    if (token) await api.patch('/users/me/fcm-token', { token });
  } catch (err) {
    // Non-fatal: the app works without notifications
    console.warn('[FCM] Token registration failed:', err);
  }
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => !!s.user);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerToken();

    const unsubRefresh = messaging().onTokenRefresh((token) => {
      api.patch('/users/me/fcm-token', { token }).catch(() => {});
    });

    // App open: Android and iOS do not show the system notification, so show our own banner
    const unsubForeground = messaging().onMessage(async (msg) => {
      const title = msg.notification?.title ?? 'Sthiva';
      const body = msg.notification?.body ?? '';
      useInAppAlert.getState().show({
        id: msg.messageId ?? String(Date.now()),
        title,
        body,
        path: resolveScreen(msg.data?.screen as string, msg.data?.orderId as string),
      });
    });

    // Tapped a notification while the app was closed or in the background
    messaging().getInitialNotification().then((msg) => openFrom(msg, true));
    const unsubBackground = messaging().onNotificationOpenedApp((msg) => openFrom(msg));

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubBackground();
    };
  }, [isAuthenticated]);
}
