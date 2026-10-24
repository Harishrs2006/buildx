'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient } from '@buildx/web-core';

// GET /reviews/suppliers/:supplierId — wrapped in { success, data, meta }.
const reviewSchema = z
  .object({
    _id: z.string(),
    rating: z.number(),
    comment: z.string().optional(),
    createdAt: z.string(),
    reviewerId: z.object({ name: z.string() }).nullable().optional(),
  })
  .passthrough();
export type Review = z.infer<typeof reviewSchema>;

export async function fetchSupplierReviews(client: ApiClient, supplierId: string, signal?: AbortSignal): Promise<Review[]> {
  return client.request(`/reviews/suppliers/${supplierId}`, {
    query: { limit: 5 },
    schema: z.array(reviewSchema),
    envelope: true,
    signal,
  });
}

export type ReviewsState =
  | { status: 'loading' }
  | { status: 'success'; data: Review[] }
  | { status: 'error'; error: unknown };

export function useSupplierReviews(supplierId: string | undefined): ReviewsState {
  const client = useApiClient();
  const [state, setState] = useState<ReviewsState>({ status: 'loading' });

  useEffect(() => {
    if (!supplierId) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSupplierReviews(client, supplierId, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, supplierId]);

  return state;
}
