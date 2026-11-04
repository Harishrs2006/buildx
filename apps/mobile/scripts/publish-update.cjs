// Publishes an over-the-air update to one of the two apps.
// Usage (from apps/mobile):  node scripts/publish-update.cjs buyer "Short note about the change"
//                            node scripts/publish-update.cjs partner "Short note about the change"
// Same settings as the release builds: live API, the right app variant, the right channel.
const { spawnSync } = require('child_process');
const [variant, message] = process.argv.slice(2);
if (!['buyer', 'partner'].includes(variant) || !message) {
  console.error('Usage: node scripts/publish-update.cjs <buyer|partner> "message"');
  process.exit(1);
}
const env = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_API_URL: 'https://buildx-api.onrender.com',
  ...(variant === 'partner' ? { APP_VARIANT: 'partner' } : {}),
};
if (variant === 'buyer') delete env.APP_VARIANT;
const channel = variant === 'partner' ? 'partner-production' : 'buyer-production';
const r = spawnSync('npx', ['eas-cli@latest', 'update', '--channel', channel, '--message', message, '--platform', 'android', '--non-interactive'], {
  env, stdio: 'inherit', shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
