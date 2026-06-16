import messaging from '@react-native-firebase/messaging';

// Must run before any React code mounts — handles FCM messages when app is in background/quit
messaging().setBackgroundMessageHandler(async (_msg) => {
  // The OS displays the notification automatically from the FCM payload.
  // Nothing extra needed here.
});

import 'expo-router/entry';
