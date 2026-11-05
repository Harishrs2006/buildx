import Constants from 'expo-constants';

/**
 * Which of the three apps this build is (set by APP_VARIANT in app.config.ts):
 *   buyer   "Sthiva"          buyers
 *   partner "Sthiva Partner"  suppliers, Sthiva ops, and delivery partners who started there
 *   driver  "Sthiva Driver"   delivery partners only
 */
export type AppVariant = 'buyer' | 'partner' | 'driver';
const raw = Constants.expoConfig?.extra?.appVariant;
export const APP_VARIANT: AppVariant = raw === 'partner' || raw === 'driver' ? raw : 'buyer';

export const IS_PARTNER = APP_VARIANT === 'partner';
export const IS_DRIVER = APP_VARIANT === 'driver';
/** Partner and driver apps share the dark brand tile and the business-side copy */
export const IS_WORK_APP = IS_PARTNER || IS_DRIVER;
export const APP_NAME = IS_DRIVER ? 'Sthiva Driver' : IS_PARTNER ? 'Sthiva Partner' : 'Sthiva';

/** Accounts each app serves. Drivers keep working in Sthiva Partner so nobody is stranded. */
export function roleBelongsHere(role?: string | null) {
  if (!role) return true;
  if (IS_DRIVER) return role === 'DELIVERY_PARTNER';
  return IS_PARTNER ? role !== 'BUYER' : role === 'BUYER';
}

/** The app an account should use instead of this one */
export function appForRole(role?: string | null): string {
  if (role === 'BUYER') return 'Sthiva';
  if (role === 'DELIVERY_PARTNER') return 'Sthiva Driver';
  return 'Sthiva Partner';
}
