import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Review = {
  _id: string;
  orderId: string;
  rating: number;
  comment?: string;
  tags?: string[];
  reviewerId: { _id: string; name: string };
  createdAt: string;
};

export function useOrderReview(orderId: string) {
  return useQuery<{ data: Review | null }>({
    queryKey: ['review', orderId],
    queryFn: () => api.get(`/reviews/orders/${orderId}`).then((r) => r.data),
    enabled: !!orderId,
  });
}

export function useSupplierReviews(supplierId: string) {
  return useQuery<{ data: Review[]; meta: any }>({
    queryKey: ['reviews', 'supplier', supplierId],
    queryFn: () => api.get(`/reviews/suppliers/${supplierId}`).then((r) => r.data),
    enabled: !!supplierId,
    staleTime: 60_000,
  });
}

export function useSubmitReview(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { data: { reviewId: string; rating: number } },
    Error,
    { rating: number; comment?: string; tags?: string[] }
  >({
    mutationFn: (payload) => api.post(`/reviews/orders/${orderId}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
