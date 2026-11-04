import Constants from 'expo-constants';

/** Which of the two apps this build is (set by APP_VARIANT in app.config.ts). */
export const APP_VARIANT: 'buyer' | 'partner' =
  Constants.expoConfig?.extra?.appVariant === 'partner' ? 'partner' : 'buyer';

export const IS_PARTNER = APP_VARIANT === 'partner';
export const APP_NAME = IS_PARTNER ? 'BuildX Partner' : 'BuildX';

/** Buyers use BuildX. Suppliers, delivery partners and BuildX ops use BuildX Partner. */
export function roleBelongsHere(role?: string | null) {
  if (!role) return true;
  return IS_PARTNER ? role !== 'BUYER' : role === 'BUYER';
}
