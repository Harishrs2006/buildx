import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { OrderStatus } from './useOrders';

export type DriverProfile = {
  _id: string;
  userId: string;
  vehicleType: 'BIKE' | 'AUTO' | 'MINI_TRUCK' | 'TEMPO' | 'TRUCK' | 'TRACTOR';
  vehicleNumber: string;
  licenseNumber: string;
  serviceAreas: string[];
  isAvailable: boolean;
  totalDeliveries: number;
  avgRating: number;
  totalReviews: number;
};

export type DriverStats = {
  todayDeliveries: number;
  activeOrders: number;
  totalDeliveries: number;
  avgRating: number;
  isAvailable: boolean;
};

export type DeliveryOrder = {
  _id: string;
  orderNumber: string;
  supplierId: { _id: string; businessName: string; whatsappNumber: string };
  buyerId?: { _id: string; name: string; phone: string };
  items: { name: string; quantity: number; unit: string }[];
  deliveryAddress: { label: string; fullAddress: string; contactPhone: string };
  total: number;
  status: OrderStatus;
  paymentMethod: 'COD';
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
};

export const VEHICLE_LABELS: Record<string, string> = {
  BIKE: 'Bike',
  AUTO: 'Auto',
  MINI_TRUCK: 'Mini Truck',
  TEMPO: 'Tempo',
  TRUCK: 'Truck',
  TRACTOR: 'Tractor',
};

export const VEHICLE_ICONS: Record<string, string> = {
  BIKE: '🏍️',
  AUTO: '🛺',
  MINI_TRUCK: '🚐',
  TEMPO: '🚚',
  TRUCK: '🚛',
  TRACTOR: '🚜',
};

export function useDriverProfile() {
  return useQuery<{ data: DriverProfile }>({
    queryKey: ['driver-profile'],
    queryFn: () => api.get('/delivery/me').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useDriverStats() {
  return useQuery<{ data: DriverStats }>({
    queryKey: ['driver-stats'],
    queryFn: () => api.get('/delivery/me/stats').then((r) => r.data),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useAvailableOrders() {
  return useQuery<{ data: DeliveryOrder[]; meta: { total: number } }>({
    queryKey: ['delivery-available'],
    queryFn: () => api.get('/delivery/available').then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMyDeliveries(status?: string) {
  return useQuery<{ data: DeliveryOrder[]; meta: { total: number } }>({
    queryKey: ['my-deliveries', status],
    queryFn: () => {
      const params = status ? `?status=${status}` : '';
      return api.get(`/delivery/my-orders${params}`).then((r) => r.data);
    },
    staleTime: 15_000,
  });
}

export function useAssignOrder() {
  const qc = useQueryClient();
  return useMutation<{ data: DeliveryOrder }, Error, string>({
    mutationFn: (id) => api.post(`/delivery/orders/${id}/assign`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-available'] });
      qc.invalidateQueries({ queryKey: ['my-deliveries'] });
      qc.invalidateQueries({ queryKey: ['driver-stats'] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation<{ data: DeliveryOrder }, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) =>
      api.patch(`/delivery/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-deliveries'] });
      qc.invalidateQueries({ queryKey: ['driver-stats'] });
    },
  });
}

export function useUpdateDriverProfile() {
  const qc = useQueryClient();
  return useMutation<{ data: DriverProfile }, Error, Partial<DriverProfile>>({
    mutationFn: (data) => api.patch('/delivery/me', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-profile'] });
      qc.invalidateQueries({ queryKey: ['driver-stats'] });
    },
  });
}
