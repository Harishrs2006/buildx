import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { OrderStatus, PaymentStatus, OrderItem } from './useOrders';

// Operations team (OPERATOR / ADMIN) — see apps/api/src/features/ops

type Ref = { _id: string; name?: string; phone?: string; businessName?: string; whatsappNumber?: string };

export type OpsOrderSummary = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  deliveryMode?: 'PLATFORM' | 'SUPPLIER';
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  supplierId?: Ref;
  buyerId?: Ref;
  driverId?: string;
};

export type OpsOrder = Omit<OpsOrderSummary, 'driverId'> & {
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  deliveryAddress: { label: string; fullAddress: string; contactPhone: string };
  notes?: string;
  driverId?: Ref;
  codAmountCollected?: number;
  cancellationReason?: string;
  inventoryState?: string;
  statusHistory: { status: string; at: string; byRole: string; note?: string }[];
  opsNotes: { at: string; byRole: string; note: string }[];
};

export type OpsSummary = {
  counts: Partial<Record<OrderStatus, number>>;
  todayOrders: number;
  thresholds: Record<string, number>;
  attention: Record<'notDispatched' | 'unassigned' | 'notPickedUp' | 'longInDelivery' | 'codPending', OpsOrderSummary[]>;
};

export type OpsDriver = {
  _id: string;
  userId: { _id: string; name: string; phone: string; isActive: boolean } | null;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  activeOrders: number;
};

export type OpsSupplier = {
  _id: string;
  businessName: string;
  whatsappNumber: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  serviceAreas: string[];
  userId: { _id: string; name: string; phone: string; isActive: boolean } | null;
};

export function useOpsSummary() {
  return useQuery<{ data: OpsSummary }>({
    queryKey: ['ops', 'summary'],
    queryFn: () => api.get('/ops/summary').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useOpsOrders(params: { status?: string; q?: string }) {
  return useQuery<{ data: OpsOrderSummary[]; meta: { total: number } }>({
    queryKey: ['ops', 'orders', params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      if (params.q) qs.set('q', params.q);
      return api.get(`/ops/orders?${qs.toString()}`).then((r) => r.data);
    },
  });
}

export function useOpsOrder(id: string) {
  return useQuery<{ data: OpsOrder }>({
    queryKey: ['ops', 'order', id],
    queryFn: () => api.get(`/ops/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useOpsDrivers(enabled = true) {
  return useQuery<{ data: OpsDriver[] }>({
    queryKey: ['ops', 'drivers'],
    queryFn: () => api.get('/ops/drivers').then((r) => r.data),
    enabled,
  });
}

export function useOpsSuppliers(verification?: string) {
  return useQuery<{ data: OpsSupplier[] }>({
    queryKey: ['ops', 'suppliers', verification],
    queryFn: () => api.get(`/ops/suppliers${verification ? `?verification=${verification}` : ''}`).then((r) => r.data),
  });
}

// One mutation per ops action; every success refreshes all ops views
function useOpsAction<TVars>(request: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, TVars>({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops'] }),
  });
}

export const useOpsCancel = () =>
  useOpsAction((v: { id: string; reason: string; restock?: boolean }) =>
    api.post(`/ops/orders/${v.id}/cancel`, { reason: v.reason, restock: v.restock }));

export const useOpsUnassign = () =>
  useOpsAction((v: { id: string; reason: string }) => api.post(`/ops/orders/${v.id}/unassign`, { reason: v.reason }));

export const useOpsAssign = () =>
  useOpsAction((v: { id: string; driverUserId: string; note?: string }) =>
    api.post(`/ops/orders/${v.id}/assign`, { driverUserId: v.driverUserId, note: v.note }));

export const useOpsRecordCod = () =>
  useOpsAction((v: { id: string; amount: number; note: string }) =>
    api.post(`/ops/orders/${v.id}/cod`, { amount: v.amount, note: v.note }));

export const useOpsAddNote = () =>
  useOpsAction((v: { id: string; note: string }) => api.post(`/ops/orders/${v.id}/notes`, { note: v.note }));

export const useOpsVerifySupplier = () =>
  useOpsAction((v: { id: string; status: 'VERIFIED' | 'REJECTED'; note?: string }) =>
    api.patch(`/ops/suppliers/${v.id}/verification`, { status: v.status, note: v.note }));
