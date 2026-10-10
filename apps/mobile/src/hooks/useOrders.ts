import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CartItem } from '../store/cart.store';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'RELEASED' | 'REFUNDED';

export type OrderItem = {
  productId: string;
  name: string;
  imageUrl: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;    // unit price applied (bulk tier or base), as listed
  gstRate: number;
  isGstInclusive?: boolean;
  subtotal: number;        // pricePerUnit × quantity, as listed
  taxableValue?: number;
  gstAmount?: number;
  lineTotal?: number;
};

export type Order = {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  deliveryAddress: { label: string; fullAddress: string; contactPhone: string };
  subtotal: number;
  gstAmount: number;
  deliveryCharge: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
};

export type CreateOrderPayload = {
  items: { productId: string; quantity: number }[];
  deliveryAddress: {
    label: string;
    fullAddress: string;
    lat: number;
    lng: number;
    contactPhone: string;
  };
  notes?: string;
  // Total shown on the summary screen — the server refuses the order if prices changed since
  expectedTotal?: number;
};

export type OrderQuote = {
  items: (OrderItem & { inStock: boolean; stockQuantity: number })[];
  subtotal: number;
  gstAmount: number;
  deliveryCharge: number;
  total: number;
};

export type CreateOrderResponse = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  status: string;
};

export function useOrders() {
  return useQuery<{ data: Order[]; meta: any }>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery<{ data: Order }>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

// Server-priced summary (GST-inclusive/exclusive, bulk tiers) for the checkout screen
export function useOrderQuote(items: { productId: string; quantity: number }[], enabled: boolean) {
  return useQuery<{ data: OrderQuote }>({
    queryKey: ['order-quote', items],
    queryFn: () => api.post('/orders/quote', { items }).then((r) => r.data),
    enabled: enabled && items.length > 0,
    staleTime: 0,
  });
}

/** Random key for one checkout attempt; reuse it when retrying so the server can't create a duplicate order. */
export function newIdempotencyKey(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `chk-${Date.now().toString(36)}-${rand()}${rand()}${rand()}`;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation<{ data: CreateOrderResponse }, Error, CreateOrderPayload & { idempotencyKey: string }>({
    mutationFn: ({ idempotencyKey, ...payload }) =>
      api.post('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function cartItemsToOrderPayload(
  items: CartItem[]
): { productId: string; quantity: number }[] {
  return items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:          'Pending',
  CONFIRMED:        'Confirmed',
  READY_FOR_PICKUP: 'Ready for Pickup',
  ASSIGNED:         'Driver Assigned',
  PICKED_UP:        'Picked Up',
  IN_TRANSIT:       'In Transit',
  DELIVERED:        'Delivered',
  CANCELLED:        'Cancelled',
  DISPUTED:         'Disputed',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  PENDING:          { bg: '#DBEAFE', text: '#1E40AF' },
  CONFIRMED:        { bg: '#D1FAE5', text: '#065F46' },
  READY_FOR_PICKUP: { bg: '#FEF3C7', text: '#92400E' },
  ASSIGNED:         { bg: '#EDE9FE', text: '#5B21B6' },
  PICKED_UP:        { bg: '#FEF3C7', text: '#92400E' },
  IN_TRANSIT:       { bg: '#FEF3C7', text: '#92400E' },
  DELIVERED:        { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED:        { bg: '#FEE2E2', text: '#991B1B' },
  DISPUTED:         { bg: '#FEE2E2', text: '#991B1B' },
};
