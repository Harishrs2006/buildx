import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../src/store/auth.store';
import { useRouter, useSegments, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useFonts } from 'expo-font';
import { fontFiles } from '../src/constants/typography';
import { roleBelongsHere } from '../src/lib/appVariant';
import { AlertBanner } from '../src/components/AlertBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

function AuthGate() {
  const { user, loading, setLoading, syncWithBackend, setUser, clear } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await syncWithBackend();
      } else {
        clear();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user) {
      if (!inAuth || (segments as string[])[1] === 'other-app') router.replace('/(auth)/phone');
      return;
    }

    if (!user.onboardingComplete) {
      if (!inOnboarding) router.replace('/(onboarding)/role');
      return;
    }

    // Buyers use BuildX, everyone else uses BuildX Partner: explain instead of opening the wrong screens
    if (!roleBelongsHere(user.role)) {
      if ((segments as string[])[1] !== 'other-app') router.replace('/(auth)/other-app' as Href);
      return;
    }

    // Signed in and set up: send each role to its own area, including straight from the
    // sign-in screen (Google sign-in and OTP both land here after the API sync)
    const home =
      user.role === 'SUPPLIER' ? '/(supplier)/home'
      : user.role === 'DELIVERY_PARTNER' ? '/(driver)/available'
      : user.role === 'OPERATOR' || user.role === 'ADMIN' ? '/(ops)/attention'
      : '/(buyer)/home';
    if (segments[0] !== home.split('/')[1]) router.replace(home as Href);
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  // Brand fonts ship inside the app (assets/fonts): this is a local load, not a download.
  // If one ever fails, the app still opens with the system font.
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(buyer)" />
          <Stack.Screen name="(supplier)" />
          <Stack.Screen name="(driver)" />
          <Stack.Screen name="(ops)" />
        </Stack>
        <AlertBanner />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
