// @buildx/web-core — shared code for the BuildX web apps (buyer and seller sites).
// Not used by the React Native apps.

export { createApiClient, ApiClientError, isAbortError } from './api/client';
export type { ApiClient, ApiClientOptions, RequestOptions, PaginationMeta } from './api/client';
export {
  postalLookupSchema, serviceabilitySchema, reverseLookupSchema, productListSchema, productSummarySchema,
} from './api/schemas';
export type { PostalLookup, Serviceability, ReverseLookup, ProductList, ProductSummary } from './api/schemas';

export { WebCoreProvider, useApiClient, useLocationStore } from './context';

export { PINCODE_RE, validatePincode } from './location/pincode';
export type { PincodeValidation } from './location/pincode';
export {
  checkPincode, fetchPostal, fetchServiceability, getBrowserPosition, reverseGeocode, describePlace,
  GpsError, GPS_MESSAGES,
} from './location/lookup';
export type { LocationCheck, PlaceInfo, GpsFailure, GpsCandidate } from './location/lookup';
export { createLocationStore, LOCATION_STORAGE_KEY, LOCATION_MAX_AGE_MS } from './location/store';
export type { LocationStore, SelectedLocation } from './location/store';
export {
  useSelectedLocation, useDeliveryServiceability, verifyDeliveryForCheckout, useLocationSelector,
} from './location/hooks';
export type { DeliveryStatus, CheckoutDeliveryCheck, SelectorState, UseLocationSelectorOptions } from './location/hooks';
export { LocationSelector } from './location/LocationSelector';
export type { LocationSelectorProps } from './location/LocationSelector';

export { fetchProducts, useProductsForLocation } from './products/products';
export type { ProductQuery, ProductsState } from './products/products';

// Material catalogue: what exists in the Indian market and how it is sold (no prices or stock)
export {
  CATALOG, CATALOG_CATEGORIES, catalogCategory, catalogItems, catalogItem, matchCatalogItem, offerQuery,
  suggestedListingUnit, suggestedListingName,
} from './catalog/data';
export type { CatalogItem, CatalogCategory, Calculator, ListingUnit, Spec, VariantGroup, SoldAs } from './catalog/types';
export * as units from './catalog/units';

// Brand: the BuildX logo (vector) and its roof-and-X symbol
export { BuildXLogo, BuildXMark } from './brand/BuildXLogo';
