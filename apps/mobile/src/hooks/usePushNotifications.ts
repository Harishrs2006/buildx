import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

// Map the `screen` data field from FCM payload → Expo Router path
function resolveScreen(screen?: string, orderId?: string): string | null {
  switch (screen) {
    case 'buyer_orders':
      return '/(buyer)/orders';
    case 'supplier_orders':
      return '/(supplier)/orders';
    case 'driver_available':
      return '/(driver)/available';
    default:
      return null;
  }
}

async function registerToken() {
  try {
    // Request permission (iOS requires explicit prompt; Android 13+ also needs it)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const token = await messaging().getToken();
    if (token) {
      await api.patch('/users/me/fcm-token', { token });
    }
  } catch (err) {
    // Non-fatal — app works without notifications
    console.warn('[FCM] Token registration failed:', err);
  }
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => !!s.user);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register token when user is logged in
    registerToken();

    // Refresh token if FCM rotates it
    const unsubRefresh = messaging().onTokenRefresh((token) => {
      api.patch('/users/me/fcm-token', { token }).catch(() => {});
    });

    // Foreground notification — just show; React Native Firebase shows heads-up automatically on Android
    const unsubForeground = messaging().onMessage(async (_msg) => {
      // Foreground messages are displayed as heads-up banners by the OS
      // No extra handling needed here
    });

    // Background / quit → notification tap opens app and routes to correct screen
    messaging()
      .getInitialNotification()
      .then((msg) => {
        if (!msg?.data) return;
        const path = resolveScreen(msg.data.screen as string, msg.data.orderId as string);
        if (path) router.replace(path as any);
      });

    const unsubBackground = messaging().onNotificationOpenedApp((msg) => {
      if (!msg?.data) return;
      const path = resolveScreen(msg.data.screen as string, msg.data.orderId as string);
      if (path) router.push(path as any);
    });

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubBackground();
    };
  }, [isAuthenticated]);
}
