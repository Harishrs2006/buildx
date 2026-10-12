export const GST_RATE = 0.18;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_IMAGES_PER_PRODUCT = 8;
export const MAX_FILE_SIZE_MB = 5;

export const ORDER_NUMBER_PREFIX = 'BX';
export const INVOICE_NUMBER_PREFIX = 'INV';
export const QUOTATION_NUMBER_PREFIX = 'QT';

export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const CACHE_TTL = {
  PRODUCT: 3600,
  CATEGORY: 86400,
  SUPPLIER: 3600,
  USER: 900,
} as const;

// Must match the `role` enum on the API's User model.
export const ROLES = {
  BUYER: 'BUYER',
  SUPPLIER: 'SUPPLIER',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
  OPERATOR: 'OPERATOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// Roles a user may pick for themselves during onboarding.
// OPERATOR and ADMIN are only ever granted server-side.
export const SELF_ASSIGNABLE_ROLES = [ROLES.BUYER, ROLES.SUPPLIER, ROLES.DELIVERY_PARTNER] as const;
