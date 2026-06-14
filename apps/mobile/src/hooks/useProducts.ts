import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ProductImage = {
  url: string;
  publicId: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type Product = {
  _id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  images: ProductImage[];
  unit: string;
  basePrice: number;
  gstRate: number;
  isGstInclusive: boolean;
  stockQuantity: number;
  minOrderQuantity: number;
  status: string;
  isFeatured: boolean;
  totalSold: number;
  avgRating: number;
  specifications?: Record<string, string>;
  bulkPricing?: { minQty: number; price: number }[];
  tags?: string[];
  deliveryDays?: number;
  supplierId: {
    _id: string;
    businessName: string;
    avgRating: number;
    totalDeliveries?: number;
    whatsappNumber?: string;
    verificationStatus?: string;
  };
  categoryId: { _id: string; name: string; slug: string };
};

export function getProductImageUrl(images: ProductImage[] | undefined): string {
  if (!images || images.length === 0) return '';
  const primary = images.find((img) => img.isPrimary);
  return (primary ?? images[0]).url;
}

export type ProductListResponse = {
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type ProductFilters = {
  category?: string;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  q?: string;
};

function buildParams(filters: ProductFilters & { page?: number }): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.sort)     params.set('sort', filters.sort);
  if (filters.q)        params.set('q', filters.q);
  if (filters.page)     params.set('page', String(filters.page));
  return params.toString();
}

export function useProducts(filters: ProductFilters = {}) {
  return useInfiniteQuery<ProductListResponse>({
    queryKey: ['products', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/products?${buildParams({ ...filters, page: pageParam as number })}`).then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    staleTime: 60_000,
  });
}

export function useProductSearch(q: string) {
  return useQuery<ProductListResponse>({
    queryKey: ['product-search', q],
    queryFn: () => api.get(`/products?${buildParams({ q })}`).then((r) => r.data),
    staleTime: 30_000,
    enabled: q.length >= 2,
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
