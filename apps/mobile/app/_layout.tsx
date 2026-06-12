import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../src/store/auth.store';
import { useRouter, useSegments } from 'expo-router';
import { StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

function AuthGate() {
  const { user, loading, setLoading, syncWithBackend, setUser, clear } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

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
      if (!inAuth) router.replace('/(auth)/phone');
      return;
    }

    if (!user.onboardingComplete) {
      if (!inOnboarding) router.replace('/(onboarding)/role');
      return;
    }

    if (user.role === 'SUPPLIER' && !inAuth && !inOnboarding) {
      if (segments[0] !== '(supplier)') router.replace('/(supplier)/home');
    } else if (!inAuth && !inOnboarding) {
      if (segments[0] !== '(buyer)') router.replace('/(buyer)/home');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(buyer)" />
          <Stack.Screen name="(supplier)" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
