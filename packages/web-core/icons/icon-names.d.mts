/** Sorted, comma-separated icon names used by the app in appDir (plus shared web-core code). */
export function iconNames(appDir: string): string;
/** Google Fonts stylesheet address for the given axes and icon names. */
export function iconStylesheetUrl(axes: string, names: string): string;
/** Downloads the icon subset into public/fonts and returns the inline stylesheet, or '' on failure. */
export function selfHostIcons(appDir: string, axes: string, names: string): Promise<string>;
