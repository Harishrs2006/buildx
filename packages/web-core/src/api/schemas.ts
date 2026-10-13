import { z } from 'zod';

// Response schemas for the endpoints the web apps use. Each mirrors the API source:
//   postalLookupSchema   ← PostalLookup        apps/api/src/features/locations/postal-directory.service.ts
//   serviceabilitySchema ← checkDestination()  apps/api/src/features/serviceability/serviceability.service.ts
//   reverseLookupSchema  ← reverse()           apps/api/src/features/locations/locations.controller.ts
//   productListSchema    ← listProducts()      apps/api/src/features/products/product.controller.ts
// apps/api/test/web-contract.test.ts parses real API responses with these, so drift fails CI.
// Unknown extra fields are dropped (the API may add fields); missing/mistyped ones are errors.

const pincode = z.string().regex(/^[1-9]\d{5}$/);

export const postalLookupSchema = z.object({
  pincode,
  district: z.string(),
  state: z.string(),
  districts: z.array(z.string()),
  hasDeliveryOffice: z.boolean(),
  postOffices: z.array(z.object({
    name: z.string(),
    officeType: z.string().optional(),
    deliveryStatus: z.string().optional(),
    taluk: z.string().optional(),
    division: z.string().optional(),
  })),
  approxLocation: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  source: z.object({ attribution: z.string(), datasetVersion: z.string() }),
});
export type PostalLookup = z.infer<typeof postalLookupSchema>;

export const serviceabilitySchema = z.object({
  pincode,
  district: z.string(),
  state: z.string(),
  // Only `true` counts as serviceable; anything else fails validation
  serviceable: z.boolean(),
  supplierCount: z.number().int().nonnegative(),
  reason: z.literal('NO_SUPPLIERS').optional(),
}).refine((s) => s.serviceable === s.supplierCount > 0, 'serviceable must agree with supplierCount');
export type Serviceability = z.infer<typeof serviceabilitySchema>;

export const reverseLookupSchema = z.object({
  pincode,
  detected: z.object({
    locality: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
  }),
  postalStatus: z.enum(['VALID', 'NOT_FOUND', 'UNAVAILABLE']),
  postal: postalLookupSchema.nullable(),
  requiresConfirmation: z.literal(true),
});
export type ReverseLookup = z.infer<typeof reverseLookupSchema>;

// Products are rendered by the app; only what the hooks rely on is checked
export const productSummarySchema = z.object({
  _id: z.string(),
  name: z.string(),
  unit: z.string(),
  basePrice: z.number(),
}).passthrough();
export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productListSchema = z.object({
  products: z.array(productSummarySchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), pages: z.number() }),
  // Present only when the request included ?pincode=
  location: serviceabilitySchema.optional(),
});
export type ProductList = z.infer<typeof productListSchema>;
