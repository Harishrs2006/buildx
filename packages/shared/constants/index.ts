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

export const ROLES = {
  BUYER: 'BUYER',
  SUPPLIER: 'SUPPLIER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
