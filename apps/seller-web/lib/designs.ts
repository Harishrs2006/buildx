import { z } from 'zod';
import type { ApiClient } from '@sthiva/web-core';

// Your design catalogue (reviewed by Sthiva before buyers see it) and buyers' quote requests

export const DESIGN_CATEGORIES = [
  { slug: 'modular-woodwork', name: 'Modular & Woodwork' },
  { slug: 'walls-ceilings', name: 'Walls & Ceilings' },
  { slug: 'tiles-flooring', name: 'Tiles & Flooring' },
  { slug: 'doors-windows', name: 'Doors & Windows' },
  { slug: 'bath-kitchen', name: 'Bath & Kitchen' },
] as const;
export const DESIGN_STYLES = ['Modern', 'Contemporary', 'Minimal', 'Traditional', 'Classic', 'Industrial'] as const;
export const PRICE_UNITS = [
  { value: 'PER_SQFT', label: 'per sq ft' },
  { value: 'PER_RUNNING_FT', label: 'per running ft' },
  { value: 'PER_PIECE', label: 'per piece' },
  { value: 'PER_BOX', label: 'per box' },
] as const;

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
    status: z.enum(['IN_REVIEW', 'LIVE', 'REJECTED', 'HIDDEN']),
    reviewNote: z.string().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type SupplierDesign = z.infer<typeof designSchema>;

export type DesignInput = {
  categorySlug: string;
  kind: string;
  title: string;
  style: string;
  description?: string;
  materials?: string;
  images: { url: string; publicId: string }[];
  priceFrom: number;
  priceUnit: string;
  leadDays: { min: number; max: number };
};

export function fetchMyDesigns(client: ApiClient): Promise<SupplierDesign[]> {
  return client.request('/suppliers/me/designs', { auth: true, envelope: true, schema: z.array(designSchema) });
}
export function createDesign(client: ApiClient, body: DesignInput): Promise<SupplierDesign> {
  return client.request('/suppliers/me/designs', { method: 'POST', auth: true, envelope: true, schema: designSchema, body });
}
export function updateDesign(client: ApiClient, id: string, body: Partial<DesignInput> & { status?: 'LIVE' | 'HIDDEN' }): Promise<SupplierDesign> {
  return client.request(`/suppliers/me/designs/${id}`, { method: 'PATCH', auth: true, envelope: true, schema: designSchema, body });
}
export function deleteDesign(client: ApiClient, id: string): Promise<unknown> {
  return client.request(`/suppliers/me/designs/${id}`, { method: 'DELETE', auth: true, envelope: true, schema: z.unknown() });
}

export const enquirySchema = z
  .object({
    _id: z.string(),
    designId: z.string(),
    designTitle: z.string(),
    designImage: z.string().optional(),
    sitePincode: z.string(),
    siteArea: z.string().optional(),
    phone: z.string(),
    details: z.string(),
    status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'CLOSED']),
    quote: z.object({ amount: z.number(), deliveryDate: z.string().optional(), note: z.string().optional() }).passthrough().optional(),
    buyerId: z.object({ name: z.string().optional() }).passthrough().nullable().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type Enquiry = z.infer<typeof enquirySchema>;

export function fetchEnquiries(client: ApiClient): Promise<Enquiry[]> {
  return client.request('/suppliers/me/design-requests', { auth: true, envelope: true, schema: z.array(enquirySchema) });
}
export function updateEnquiry(
  client: ApiClient,
  id: string,
  body: { status: 'CONTACTED' | 'QUOTED' | 'CLOSED'; quote?: { amount: number; deliveryDate?: string; note?: string }; closedReason?: string }
): Promise<Enquiry> {
  return client.request(`/suppliers/me/design-requests/${id}`, { method: 'PATCH', auth: true, envelope: true, schema: enquirySchema, body });
}
