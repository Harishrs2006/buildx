import { z } from 'zod';
import type { ApiClient } from '@sthiva/web-core';

// Design catalogue: real designs from verified suppliers (reviewed by Sthiva), and quote requests

export const PRICE_UNIT_LABEL: Record<string, string> = {
  PER_SQFT: 'sq ft',
  PER_RUNNING_FT: 'running ft',
  PER_PIECE: 'piece',
  PER_BOX: 'box',
};

export const designSchema = z
  .object({
    _id: z.string(),
    categorySlug: z.string(),
    kind: z.string(),
    title: z.string(),
    style: z.string(),
    description: z.string().optional(),
    materials: z.string().optional(),
    images: z.array(z.object({ url: z.string(), publicId: z.string() })),
    priceFrom: z.number(),
    priceUnit: z.string(),
    leadDays: z.object({ min: z.number(), max: z.number() }),
    supplierId: z.object({ _id: z.string(), businessName: z.string() }).nullable().optional(),
  })
  .passthrough();
export type Design = z.infer<typeof designSchema>;

const designListSchema = z.object({
  designs: z.array(designSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), pages: z.number() }),
});
export type DesignList = z.infer<typeof designListSchema>;

export function fetchDesigns(
  client: ApiClient,
  params: { category?: string; kinds?: string[]; style?: string; pincode?: string; page?: number } = {}
): Promise<DesignList> {
  return client.request('/designs', {
    envelope: true,
    schema: designListSchema,
    query: { category: params.category, kinds: params.kinds?.join(','), style: params.style, pincode: params.pincode, page: params.page },
  });
}

export function fetchDesign(client: ApiClient, id: string): Promise<Design> {
  return client.request(`/designs/${id}`, { envelope: true, schema: designSchema });
}

export const designRequestSchema = z
  .object({
    _id: z.string(),
    designId: z.string(),
    designTitle: z.string(),
    designImage: z.string().optional(),
    sitePincode: z.string(),
    details: z.string(),
    status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'CLOSED']),
    quote: z.object({ amount: z.number(), deliveryDate: z.string().optional(), note: z.string().optional() }).passthrough().optional(),
    supplierId: z.object({ businessName: z.string() }).passthrough().nullable().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type DesignRequest = z.infer<typeof designRequestSchema>;

export function requestDesignQuote(
  client: ApiClient,
  id: string,
  body: { sitePincode: string; siteArea?: string; phone: string; details: string }
): Promise<DesignRequest> {
  return client.request(`/designs/${id}/requests`, { method: 'POST', auth: true, envelope: true, schema: designRequestSchema, body });
}

export function fetchMyDesignRequests(client: ApiClient): Promise<DesignRequest[]> {
  return client.request('/designs/requests/mine', { auth: true, envelope: true, schema: z.array(designRequestSchema) });
}

export function answerQuote(client: ApiClient, id: string, status: 'ACCEPTED' | 'CLOSED'): Promise<DesignRequest> {
  return client.request(`/designs/requests/${id}`, { method: 'PATCH', auth: true, envelope: true, schema: designRequestSchema, body: { status } });
}

// Filter chips on the gallery: a friendly name for groups of catalogue items
export const DESIGN_TYPES: { label: string; kinds: string[] }[] = [
  { label: 'Kitchens', kinds: ['modular-kitchen'] },
  { label: 'Wardrobes', kinds: ['wardrobes'] },
  { label: 'TV units', kinds: ['tv-units'] },
  { label: 'Beds and study', kinds: ['storage-beds', 'study-units'] },
  { label: 'Pooja units', kinds: ['pooja-units', 'jaali-partitions'] },
  { label: 'Storage', kinds: ['crockery-shoe-units'] },
  { label: 'Ceilings', kinds: ['gypsum-false-ceiling', 'grid-ceiling', 'pop'] },
  { label: 'Wall panels', kinds: ['pvc-wpc-panels', 'wall-cladding', 'wallpaper', 'texture-finishes'] },
  { label: 'Tiles and floors', kinds: ['vitrified-tiles', 'ceramic-wall-tiles', 'floor-outdoor-tiles', 'granite', 'marble-kota-shahabad', 'laminate-flooring', 'vinyl-spc-flooring'] },
  { label: 'Doors and windows', kinds: ['main-doors', 'upvc-windows', 'aluminium-windows', 'bathroom-doors'] },
  { label: 'Bathrooms', kinds: ['shower-partitions', 'vanities-mirrors'] },
];

export const DESIGN_STYLES = ['Modern', 'Contemporary', 'Minimal', 'Traditional', 'Classic', 'Industrial'];
