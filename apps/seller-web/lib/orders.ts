'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient, type PaginationMeta } from '@buildx/web-core';

const orderItemSchema = z.object({
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  lineTotal: z.number(),
}).passthrough();

export const supplierOrderSchema = z
  .object({
    _id: z.string(),
    orderNumber: z.string(),
    // Lists populate the buyer; status changes answer with the bare id
    buyerId: z.union([z.object({ name: z.string().optional(), phone: z.string().optional() }).passthrough(), z.string()]).nullable().optional(),
    items: z.array(orderItemSchema),
    deliveryAddress: z.object({
      label: z.string(), fullAddress: z.string(), contactPhone: z.string(),
      pincode: z.string().optional(), district: z.string().optional(), state: z.string().optional(),
    }).passthrough(),
    paymentMethod: z.enum(['UPI', 'CARD', 'COD']).optional(),
    paymentStatus: z.enum(['PENDING', 'PARTIAL', 'CAPTURED', 'RELEASED', 'REFUNDED']).optional(),
    driverId: z.union([z.object({ name: z.string().optional(), phone: z.string().optional() }).passthrough(), z.string()]).nullable().optional(),
    total: z.number(),
    status: z.enum(['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED']),
    deliveryMode: z.enum(['PLATFORM', 'SUPPLIER']).optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type SupplierOrder = z.infer<typeof supplierOrderSchema>;

export type SupplierOrderAction = 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export async function fetchSupplierOrders(
  client: ApiClient,
  opts: { page?: number; status?: string; cashPending?: boolean } = {}
): Promise<{ data: SupplierOrder[]; meta: PaginationMeta }> {
  return client.requestPage('/suppliers/me/orders', {
    auth: true,
    envelope: true,
    schema: z.array(supplierOrderSchema),
    query: { page: opts.page, status: opts.status, cashPending: opts.cashPending ? 1 : undefined },
  });
}

export async function updateSupplierOrderStatus(
  client: ApiClient,
  id: string,
  status: SupplierOrderAction,
  reason?: string
): Promise<SupplierOrder> {
  return client.request(`/suppliers/me/orders/${id}/status`, {
    method: 'PATCH',
    auth: true,
    envelope: true,
    schema: supplierOrderSchema,
    body: { status, reason },
  });
}

// Own-vehicle COD: the supplier confirms the exact total once the cash is in hand
export async function confirmCashCollected(client: ApiClient, id: string, amount: number): Promise<SupplierOrder> {
  return client.request(`/suppliers/me/orders/${id}/cod`, {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: supplierOrderSchema,
    body: { amount },
  });
}

export function useSupplierOrders(page: number, statusFilter?: string, cashPending = false) {
  const client = useApiClient();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'success'; orders: SupplierOrder[]; meta: PaginationMeta }
    | { status: 'error'; error: unknown }
  >({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSupplierOrders(client, { page, status: statusFilter, cashPending })
      .then(({ data, meta }) => setState({ status: 'success', orders: data, meta }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, page, statusFilter, cashPending, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
