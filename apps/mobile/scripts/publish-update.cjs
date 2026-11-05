// Publishes an over-the-air update to one of the two apps.
// Usage (from apps/mobile):  node scripts/publish-update.cjs buyer "Short note about the change"
//                            node scripts/publish-update.cjs partner "Short note about the change"
// Same settings as the release builds: live API, the right app variant, the right channel.
// --environment is required by eas-cli in non-interactive mode; our settings come from this script, not EAS.
const { spawnSync } = require('child_process');
const [variant, message] = process.argv.slice(2);
if (!['buyer', 'partner', 'driver'].includes(variant) || !message) {
  console.error('Usage: node scripts/publish-update.cjs <buyer|partner|driver> "message"');
  process.exit(1);
}
const env = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_API_URL: 'https://api.sthiva.com',
  EXPO_PUBLIC_WEB_URL: 'https://www.sthiva.com',
  ...(variant !== 'buyer' ? { APP_VARIANT: variant } : {}),
};
if (variant === 'buyer') delete env.APP_VARIANT;
const channel = `${variant}-production`;
// On Windows the command runs through a shell, so the message needs quotes to stay one argument
const quoted = process.platform === 'win32' ? `"${message.replace(/"/g, "'")}"` : message;
const r = spawnSync('npx', ['eas-cli@latest', 'update', '--channel', channel, '--message', quoted, '--platform', 'android', '--environment', 'production', '--non-interactive'], {
  env, stdio: 'inherit', shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
