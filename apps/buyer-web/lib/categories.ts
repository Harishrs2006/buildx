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
    imageUrl: z.string().optional(),
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

// The design system forbids generic icons ("thick-stroke, sharp-cornered" Material Symbols
// only); real category data today stores an emoji in `icon`, so categories are mapped to a
// Material Symbol here by name instead of trusting that field.
const ICONS_BY_NAME: Record<string, string> = {
  'cement & concrete': 'foundation',
  'bricks & blocks': 'apartment',
  'sand & aggregates': 'landscape',
  'steel & tmt bars': 'fence',
  plumbing: 'plumbing',
  electricals: 'electrical_services',
  'paints & chemicals': 'format_paint',
  'plywood & timber': 'carpenter',
  'machines & tools': 'construction',
  'tiles & flooring': 'grid_on',
};
const FALLBACK_ICON = 'inventory_2';

export function categoryIcon(name: string): string {
  return ICONS_BY_NAME[name.trim().toLowerCase()] ?? FALLBACK_ICON;
}
