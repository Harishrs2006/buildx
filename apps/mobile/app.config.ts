import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, three apps:
 *   APP_VARIANT unset   -> "Sthiva"          (com.sthiva.app)      for buyers
 *   APP_VARIANT=partner -> "Sthiva Partner"  (com.sthiva.partner)  for suppliers and Sthiva ops (drivers who started here)
 *   APP_VARIANT=driver  -> "Sthiva Driver"   (com.sthiva.driver)   for delivery partners
 * Every Android package is registered in Firebase project buildx-15494 (one google-services.json holds them all).
 */
const variant = process.env.APP_VARIANT === 'partner' || process.env.APP_VARIANT === 'driver' ? process.env.APP_VARIANT : 'buyer';
const partner = variant === 'partner';
const driver = variant === 'driver';

/**
 * Over-the-air updates (EAS Update, Expo organisation sthiva). Screen and logic changes reach installed apps
 * without the Play Store: the app downloads the new code in the background and uses it on the next start.
 * Each app has its own channel, so a buyer update never reaches the partner app. Publish with
 * `npm run update:buyer -- "note"` or `npm run update:partner -- "note"`.
 * runtimeVersion follows the app version: bump "version" in app.json for native changes (new permission, new
 * native library, Expo upgrade). Those need a Play Store build; older installs then stop receiving JS updates
 * that they cannot run.
 */
const EAS_PROJECT_ID = '26067cb1-d12d-4279-9bda-bb3fc6f6eca3';
const CHANNEL = `${variant}-production`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: driver ? 'Sthiva Driver' : partner ? 'Sthiva Partner' : 'Sthiva',
  slug: config.slug ?? 'sthiva',
  scheme: driver ? 'sthivadriver' : partner ? 'sthivapartner' : 'sthiva',
  icon: driver ? './assets/driver/icon.png' : partner ? './assets/partner/icon.png' : config.icon,
  ios: {
    ...config.ios,
    bundleIdentifier: driver ? 'com.sthiva.driver' : partner ? 'com.sthiva.partner' : 'com.sthiva.app',
  },
  android: {
    ...config.android,
    package: driver ? 'com.sthiva.driver' : partner ? 'com.sthiva.partner' : 'com.sthiva.app',
    adaptiveIcon: driver
      ? {
          foregroundImage: './assets/driver/android-icon-foreground.png',
          monochromeImage: './assets/android-icon-monochrome.png',
          backgroundColor: '#FAF8F3',
        }
      : partner
      ? {
          foregroundImage: './assets/partner/android-icon-foreground.png',
          monochromeImage: './assets/android-icon-monochrome.png',
          backgroundColor: '#0B0C0A',
        }
      : config.android?.adaptiveIcon,
    permissions: [...(config.android?.permissions ?? []), 'android.permission.POST_NOTIFICATIONS'],
  },
  owner: 'sthiva',
  runtimeVersion: { policy: 'appVersion' },
  ...(EAS_PROJECT_ID
    ? {
        updates: {
          url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
          checkAutomatically: 'ON_LOAD' as const,
          fallbackToCacheTimeout: 0,
          requestHeaders: { 'expo-channel-name': CHANNEL },
        },
      }
    : {}),
  extra: {
    ...config.extra,
    appVariant: variant,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});
