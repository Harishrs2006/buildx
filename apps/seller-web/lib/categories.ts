'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient } from '@buildx/web-core';

// GET /categories returns bare JSON (no { success, data } envelope), top-level categories only.
export const categorySchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
  })
  .passthrough();
export type Category = z.infer<typeof categorySchema>;

export async function fetchCategories(client: ApiClient, signal?: AbortSignal): Promise<Category[]> {
  return client.request('/categories', { schema: z.array(categorySchema), envelope: false, signal });
}

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'success'; data: Category[] }
  | { status: 'error'; error: unknown };

export function useCategories(): CategoriesState {
  const client = useApiClient();
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(client, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client]);

  return state;
}
