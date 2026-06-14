import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { OrderStatus } from './useOrders';

export type SupplierProfile = {
  _id: string;
  userId: string;
  businessName: string;
  description?: string;
  categories: string[];
  deliveryRadiusKm: number;
  serviceAreas: string[];
  logoUrl?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  avgRating: number;
  totalReviews: number;
  totalDeliveries: number;
  whatsappNumber: string;
  isActive: boolean;
};

export type SupplierStats = {
  todayOrders: number;
  pendingOrders: number;
  activeProducts: number;
  totalRevenue: number;
};

export type SupplierOrder = {
  _id: string;
  orderNumber: string;
  buyerId: { _id: string; name: string; phone: string };
  items: { name: string; quantity: number; unit: string; pricePerUnit: number; subtotal: number }[];
  deliveryAddress: { label: string; fullAddress: string; contactPhone: string };
  subtotal: number;
  gstAmount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'COD';
  notes?: string;
  createdAt: string;
  deliveredAt?: string;
};

export type SupplierProduct = {
  _id: string;
  name: string;
  unit: string;
  basePrice: number;
  gstRate: number;
  stockQuantity: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  images: { url: string; isPrimary: boolean }[];
  categoryId: { _id: string; name: string; slug: string };
  totalSold: number;
  createdAt: string;
};

export type CreateProductPayload = {
  name: string;
  categoryId: string;
  description: string;
  shortDescription?: string;
  unit: string;
  basePrice: number;
  gstRate: number;
  isGstInclusive: boolean;
  stockQuantity: number;
  minOrderQuantity: number;
  deliveryDays: number;
  tags?: string[];
};

export function useSupplierProfile() {
  return useQuery<{ data: SupplierProfile }>({
    queryKey: ['supplier-profile'],
    queryFn: () => api.get('/suppliers/me').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useSupplierStats() {
  return useQuery<{ data: SupplierStats }>({
    queryKey: ['supplier-stats'],
    queryFn: () => api.get('/suppliers/me/stats').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSupplierOrders(status?: string) {
  return useQuery<{ data: SupplierOrder[]; meta: { total: number } }>({
    queryKey: ['supplier-orders', status],
    queryFn: () => {
      const params = status ? `?status=${status}` : '';
      return api.get(`/suppliers/me/orders${params}`).then((r) => r.data);
    },
    staleTime: 20_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: string; status: string; reason?: string }>({
    mutationFn: ({ id, status, reason }) =>
      api.patch(`/suppliers/me/orders/${id}/status`, { status, reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-orders'] });
      qc.invalidateQueries({ queryKey: ['supplier-stats'] });
    },
  });
}

export function useSupplierProducts(status?: string) {
  return useQuery<{ data: SupplierProduct[]; meta: { total: number } }>({
    queryKey: ['supplier-products', status],
    queryFn: () => {
      const params = status ? `?status=${status}` : '';
      return api.get(`/suppliers/me/products${params}`).then((r) => r.data);
    },
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<{ data: SupplierProduct }, Error, CreateProductPayload>({
    mutationFn: (payload) => api.post('/suppliers/me/products', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      qc.invalidateQueries({ queryKey: ['supplier-stats'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<{ data: SupplierProduct }, Error, { id: string; data: Partial<CreateProductPayload & { status: string }> }>({
    mutationFn: ({ id, data }) => api.patch(`/suppliers/me/products/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-products'] }),
  });
}

export function useUpdateSupplierProfile() {
  const qc = useQueryClient();
  return useMutation<{ data: SupplierProfile }, Error, Partial<SupplierProfile>>({
    mutationFn: (data) => api.patch('/suppliers/me', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-profile'] }),
  });
}
