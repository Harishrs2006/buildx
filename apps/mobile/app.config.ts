import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, two apps:
 *   APP_VARIANT unset   -> "Sthiva"          (com.sthiva.app)      for buyers
 *   APP_VARIANT=partner -> "Sthiva Partner"  (com.sthiva.partner)  for suppliers, delivery partners and Sthiva ops
 * Both Android packages are registered in Firebase project buildx-15494 (one google-services.json holds both).
 */
const partner = process.env.APP_VARIANT === 'partner';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: partner ? 'Sthiva Partner' : 'Sthiva',
  slug: config.slug ?? 'sthiva',
  scheme: partner ? 'sthivapartner' : 'sthiva',
  icon: partner ? './assets/partner/icon.png' : config.icon,
  ios: {
    ...config.ios,
    bundleIdentifier: partner ? 'com.sthiva.partner' : 'com.sthiva.app',
  },
  android: {
    ...config.android,
    package: partner ? 'com.sthiva.partner' : 'com.sthiva.app',
    adaptiveIcon: partner
      ? {
          foregroundImage: './assets/partner/android-icon-foreground.png',
          monochromeImage: './assets/android-icon-monochrome.png',
          backgroundColor: '#0B0C0A',
        }
      : config.android?.adaptiveIcon,
    permissions: [...(config.android?.permissions ?? []), 'android.permission.POST_NOTIFICATIONS'],
  },
  extra: { ...config.extra, appVariant: partner ? 'partner' : 'buyer' },
});
