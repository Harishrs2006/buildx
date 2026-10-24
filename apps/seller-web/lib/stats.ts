'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient } from '@buildx/web-core';

export const supplierStatsSchema = z.object({
  todayOrders: z.number(),
  pendingOrders: z.number(),
  activeProducts: z.number(),
  totalRevenue: z.number(),
});
export type SupplierStats = z.infer<typeof supplierStatsSchema>;

export async function fetchSupplierStats(client: ApiClient): Promise<SupplierStats> {
  return client.request('/suppliers/me/stats', { auth: true, envelope: true, schema: supplierStatsSchema });
}

export type StatsState =
  | { status: 'loading' }
  | { status: 'success'; data: SupplierStats }
  | { status: 'error'; error: unknown };

export function useSupplierStats(): StatsState {
  const client = useApiClient();
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchSupplierStats(client)
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client]);

  return state;
}
