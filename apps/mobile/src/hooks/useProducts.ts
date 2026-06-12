import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Product = {
  _id: string;
  name: string;
  shortDescription?: string;
  images: string[];
  unit: string;
  basePrice: number;
  gstRate: number;
  stockQuantity: number;
  status: string;
  isFeatured: boolean;
  totalSold: number;
  specifications?: Record<string, string>;
  bulkPricing?: { minQty: number; price: number }[];
  tags?: string[];
  supplierId: { _id: string; businessName: string; avgRating: number; totalDeliveries?: number; whatsappNumber?: string; verificationStatus?: string };
  categoryId: { _id: string; name: string; slug: string };
};

type ProductListResponse = {
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

type ProductFilters = {
  category?: string;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  q?: string;
  page?: number;
};

export function useProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.sort)     params.set('sort', filters.sort);
  if (filters.q)        params.set('q', filters.q);
  if (filters.page)     params.set('page', String(filters.page));

  return useQuery<ProductListResponse>({
    queryKey: ['products', filters],
    queryFn: () => api.get(`/products?${params.toString()}`).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
    staleTime: 60_000,
    enabled: !!id,
  });
}
