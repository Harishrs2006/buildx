'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ApiClient } from './api/client';
import type { LocationStore } from './location/store';

type WebCore = { client: ApiClient; locationStore: LocationStore };

const WebCoreContext = createContext<WebCore | null>(null);

/**
 * Provides the API client and the buyer's location store to the hooks and components in
 * this package. Create both once per app (module scope) and wrap the app with this.
 */
export function WebCoreProvider({ client, locationStore, children }: WebCore & { children: ReactNode }) {
  return <WebCoreContext.Provider value={{ client, locationStore }}>{children}</WebCoreContext.Provider>;
}

function useWebCore(): WebCore {
  const ctx = useContext(WebCoreContext);
  if (!ctx) throw new Error('@buildx/web-core: wrap your app in <WebCoreProvider>');
  return ctx;
}

export const useApiClient = () => useWebCore().client;
export const useLocationStore = () => useWebCore().locationStore;
