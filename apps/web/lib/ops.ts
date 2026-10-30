'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient, type PaginationMeta } from '@buildx/web-core';

// Client for apps/api's /ops routes (OPERATOR and ADMIN only). Shapes mirror ops.controller.ts.

const person = z.object({ _id: z.string(), name: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), isActive: z.boolean().optional() }).passthrough();
const ref = <T extends z.ZodTypeAny>(s: T) => z.union([s, z.string()]).nullable().optional();

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderSummarySchema = z
  .object({
    _id: z.string(),
    orderNumber: z.string(),
    status: z.enum(ORDER_STATUSES),
    total: z.number(),
    deliveryMode: z.enum(['PLATFORM', 'SUPPLIER']).optional(),
    paymentStatus: z.string(),
    paymentMethod: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    supplierId: ref(z.object({ _id: z.string(), businessName: z.string(), whatsappNumber: z.string().optional() }).passthrough()),
    buyerId: ref(person),
    driverId: ref(person),
  })
  .passthrough();
export type OrderSummary = z.infer<typeof orderSummarySchema>;

const itemSchema = z.object({ name: z.string(), unit: z.string(), quantity: z.number(), pricePerUnit: z.number(), lineTotal: z.number() }).passthrough();
const eventSchema = z.object({ status: z.string(), at: z.string(), byRole: z.string(), note: z.string().optional() }).passthrough();
const noteSchema = z.object({ at: z.string(), byRole: z.string(), note: z.string() }).passthrough();

export const orderDetailSchema = orderSummarySchema.extend({
  items: z.array(itemSchema),
  deliveryAddress: z
    .object({ label: z.string().optional(), fullAddress: z.string(), contactPhone: z.string(), pincode: z.string().optional(), district: z.string().optional(), state: z.string().optional() })
    .passthrough(),
  subtotal: z.number(),
  gstAmount: z.number(),
  deliveryCharge: z.number(),
  serviceabilityCheck: z.string().optional(),
  cancellationReason: z.string().optional(),
  cancelledBy: z.string().optional(),
  codAmountCollected: z.number().optional(),
  statusHistory: z.array(eventSchema).optional(),
  opsNotes: z.array(noteSchema).optional(),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

const queue = z.array(orderSummarySchema);
export const summarySchema = z.object({
  counts: z.record(z.string(), z.number()),
  todayOrders: z.number(),
  thresholds: z.object({ CONFIRMED_MINUTES: z.number(), READY_UNASSIGNED_MINUTES: z.number(), ASSIGNED_MINUTES: z.number(), IN_DELIVERY_MINUTES: z.number() }),
  attention: z.object({ notDispatched: queue, unassigned: queue, notPickedUp: queue, longInDelivery: queue, codPending: queue, uncheckedDestination: queue }),
});
export type OpsSummary = z.infer<typeof summarySchema>;

export const VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type Verification = (typeof VERIFICATION)[number];

export const supplierSchema = z
  .object({
    _id: z.string(),
    businessName: z.string(),
    whatsappNumber: z.string().optional(),
    verificationStatus: z.enum(VERIFICATION),
    businessType: z.string().optional(),
    gstin: z.string().optional(),
    address: z.string().optional(),
    servicePincodes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    userId: ref(person),
  })
  .passthrough();
export type OpsSupplier = z.infer<typeof supplierSchema>;

export const driverSchema = z
  .object({
    _id: z.string(),
    vehicleType: z.string(),
    vehicleNumber: z.string(),
    serviceAreas: z.array(z.string()).optional(),
    isAvailable: z.boolean(),
    totalDeliveries: z.number().optional(),
    activeOrders: z.number(),
    userId: ref(person),
  })
  .passthrough();
export type OpsDriver = z.infer<typeof driverSchema>;

// Populated refs come back as objects; anything else is an unpopulated id
export function populated<T extends object>(v: T | string | null | undefined): T | null {
  return v && typeof v === 'object' ? v : null;
}

type Query = Record<string, string | number | undefined>;
const get = <T>(client: ApiClient, path: string, schema: z.ZodType<T>, query?: Query) =>
  client.request(path, { auth: true, envelope: true, schema, query });
const send = <T>(client: ApiClient, method: 'POST' | 'PATCH', path: string, body: unknown, schema: z.ZodType<T>) =>
  client.request(path, { method, auth: true, envelope: true, schema, body });

export const opsApi = {
  summary: (c: ApiClient) => get(c, '/ops/summary', summarySchema),
  orders: (c: ApiClient, q: Query): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> =>
    c.requestPage('/ops/orders', { auth: true, envelope: true, schema: z.array(orderSummarySchema), query: q }),
  order: (c: ApiClient, id: string) => get(c, `/ops/orders/${id}`, orderDetailSchema),
  cancel: (c: ApiClient, id: string, body: { reason: string; restock?: boolean }) => send(c, 'POST', `/ops/orders/${id}/cancel`, body, z.unknown()),
  unassign: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/unassign`, { reason }, z.unknown()),
  assign: (c: ApiClient, id: string, driverUserId: string, note?: string) =>
    send(c, 'POST', `/ops/orders/${id}/assign`, { driverUserId, ...(note ? { note } : {}) }, z.unknown()),
  recordCod: (c: ApiClient, id: string, amount: number, note: string) => send(c, 'POST', `/ops/orders/${id}/cod`, { amount, note }, z.unknown()),
  addNote: (c: ApiClient, id: string, note: string) => send(c, 'POST', `/ops/orders/${id}/notes`, { note }, z.unknown()),
  drivers: (c: ApiClient) => get(c, '/ops/drivers', z.array(driverSchema)),
  suppliers: (c: ApiClient, verification?: Verification) => get(c, '/ops/suppliers', z.array(supplierSchema), { verification }),
  verify: (c: ApiClient, id: string, status: 'VERIFIED' | 'REJECTED', note?: string) =>
    send(c, 'PATCH', `/ops/suppliers/${id}/verification`, { status, ...(note ? { note } : {}) }, supplierSchema),
};

export type Load<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

// Fetches on mount and whenever `deps` change. `reload` refetches without flashing a skeleton.
export function useLoad<T>(fetcher: (c: ApiClient) => Promise<T>, deps: unknown[]) {
  const client = useApiClient();
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [key, setKey] = useState(0);
  const depKey = JSON.stringify(deps);
  useEffect(() => {
    let live = true;
    fetcher(client)
      .then((data) => live && setState({ status: 'success', data }))
      .catch((error) => live && setState({ status: 'error', error }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, depKey]);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  return { state, reload };
}

export function errorText(err: unknown, fallback = 'Something went wrong. Try again.') {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}
