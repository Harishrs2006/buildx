'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient, type PaginationMeta } from '@buildx/web-core';

const imageSchema = z.object({ url: z.string(), publicId: z.string(), isPrimary: z.boolean().optional(), sortOrder: z.number().optional() });

export const supplierProductSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    shortDescription: z.string().optional(),
    unit: z.string(),
    basePrice: z.number(),
    stockQuantity: z.number(),
    minOrderQuantity: z.number().optional(),
    deliveryDays: z.number().optional(),
    gstRate: z.number().optional(),
    isGstInclusive: z.boolean().optional(),
    specifications: z.record(z.string(), z.string()).optional(),
    images: z.array(imageSchema).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']),
    categoryId: z.object({ _id: z.string(), name: z.string(), slug: z.string() }).nullable().optional(),
  })
  .passthrough();
export type SupplierProduct = z.infer<typeof supplierProductSchema>;

export type ProductInput = {
  name: string;
  categoryId: string;
  description: string;
  unit: string;
  basePrice: number;
  stockQuantity?: number;
  minOrderQuantity?: number;
  deliveryDays?: number;
  specifications?: Record<string, string>;
  images?: { url: string; publicId: string; isPrimary?: boolean; sortOrder?: number }[];
};

export async function fetchSupplierProducts(
  client: ApiClient,
  opts: { page?: number; status?: string } = {}
): Promise<{ data: SupplierProduct[]; meta: PaginationMeta }> {
  return client.requestPage('/suppliers/me/products', {
    auth: true,
    envelope: true,
    schema: z.array(supplierProductSchema),
    query: { page: opts.page, status: opts.status },
  });
}

export async function fetchSupplierProduct(client: ApiClient, id: string): Promise<SupplierProduct> {
  return client.request(`/suppliers/me/products/${id}`, { auth: true, envelope: true, schema: supplierProductSchema });
}

export async function createSupplierProduct(client: ApiClient, input: ProductInput): Promise<SupplierProduct> {
  return client.request('/suppliers/me/products', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: supplierProductSchema,
    body: input,
  });
}

export async function updateSupplierProduct(
  client: ApiClient,
  id: string,
  input: Partial<ProductInput> & { status?: string }
): Promise<SupplierProduct> {
  return client.request(`/suppliers/me/products/${id}`, {
    method: 'PATCH',
    auth: true,
    envelope: true,
    schema: supplierProductSchema,
    body: input,
  });
}

export async function discontinueSupplierProduct(client: ApiClient, id: string): Promise<void> {
  await client.request(`/suppliers/me/products/${id}`, {
    method: 'DELETE',
    auth: true,
    envelope: true,
    schema: z.object({ message: z.string() }),
  });
}

export type ProductListState =
  | { status: 'loading' }
  | { status: 'success'; products: SupplierProduct[]; meta: PaginationMeta }
  | { status: 'error'; error: unknown };

export function useSupplierProducts(page: number, statusFilter?: string) {
  const client = useApiClient();
  const [state, setState] = useState<ProductListState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSupplierProducts(client, { page, status: statusFilter })
      .then(({ data, meta }) => setState({ status: 'success', products: data, meta }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, page, statusFilter, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
