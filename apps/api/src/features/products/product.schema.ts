import { z } from 'zod';

export const productListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  categorySlug: z.string().optional(),
  supplierId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['newest', 'price', 'rating', 'popular']).default('newest'),
  isFeatured: z.coerce.boolean().optional(),
});
