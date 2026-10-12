export const APP_NAME = 'AKAsheet';
/** Short line under the wordmark. */
export const APP_TAGLINE = 'Put Your World Within Reach';
/** Full slogan used in SEO, shares, and aria labels. */
export const APP_SLOGAN = `${APP_NAME}: ${APP_TAGLINE}`;
/** What the app is — search, social previews, and app store style copy. */
export const APP_DESCRIPTION = 'Lyric App & Social Music Drop Platform';
export const BRAND_ARIA_LABEL = APP_SLOGAN;

export const APP_DOMAIN = 'akasheet.com';
export const APP_ORIGIN = `https://${APP_DOMAIN}`;
export const APP_WWW_ORIGIN = `https://www.${APP_DOMAIN}`;
/** Firebase Auth custom domain — Google sign-in shows “Continue to akasheet.com”. */
export const FIREBASE_AUTH_DOMAIN = APP_DOMAIN;

/** Previous public domain — keep recognized for old share links during the cutover. */
export const LEGACY_APP_DOMAIN = 'bar4bar.ink';
export const LEGACY_APP_ORIGIN = `https://${LEGACY_APP_DOMAIN}`;
export const LEGACY_APP_WWW_ORIGIN = `https://www.${LEGACY_APP_DOMAIN}`;

export const LOGO_PATH = '/Logo.png';
/** Link unfurl only (iMessage, Slack, X, Discord). Solid blue field so the preview is not transparent. */
export const OG_SHARE_PATH = '/akasheet-og.png';
/**
 * Installed Brave/Chrome desktop PWA + Windows taskbar.
 * Transparent Logo mark (same look as Logo.png) — never app-icon navy square or android burger.
 */
export const DESKTOP_PWA_ICON_PATH = '/desktop-pwa-icon.png';
/** Legacy opaque padded icon — not referenced by the web manifest. */
export const APP_ICON_PATH = '/app-icon.png';
/** Native Android launcher only (APK mipmaps). Never list in the web manifest. */
export const ANDROID_ICON_PATH = '/android-icon.png';
export const ANDROID_ICON_192_PATH = '/android-icon-192.png';
/** Simplified mark for browser tabs — the full logo turns into a blob at 16px. */
export const FAVICON_PATH = '/favicon.svg';
/** Login / marketing studio sky (legacy filename on disk). */
export const LOGIN_STUDIO_BACKGROUND_PATH = '/Bar 4 Bar background.png';
export const SHARE_HASHTAG = '#AKAsheet';

export const SUPPORT_EMAIL = 'akasheet.support@gmail.com';
export const NOREPLY_EMAIL = `noreply@${APP_DOMAIN}`;
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** Operator name for legal footers (email, site chrome). */
export const LEGAL_ENTITY_NAME = 'Commodious Works LLC';
