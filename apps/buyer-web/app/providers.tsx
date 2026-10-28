'use client';

import { useState } from 'react';
import { WebCoreProvider, createApiClient, createLocationStore } from '@buildx/web-core';
import { getFirebaseAuth } from '../lib/firebase';
import { AuthProvider } from '../components/auth/AuthProvider';
import { StorageNotice } from '../components/layout/StorageNotice';

// No app has a dev server pointed at it by default: set NEXT_PUBLIC_API_URL to the live API.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function Providers({ children }: { children: React.ReactNode }) {
  // Created once per browser session, not on every render
  const [core] = useState(() => ({
    client: createApiClient({
      baseUrl: `${API_BASE_URL}/api/v1`,
      getAuthToken: () => getFirebaseAuth().currentUser?.getIdToken() ?? Promise.resolve(null),
    }),
    locationStore: createLocationStore(),
  }));
  return (
    <WebCoreProvider client={core.client} locationStore={core.locationStore}>
      <AuthProvider>
        {children}
        <StorageNotice />
      </AuthProvider>
    </WebCoreProvider>
  );
}
