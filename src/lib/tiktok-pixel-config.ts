/** Bar 4 Bar TikTok Ads pixel ("Pixel Bar"); override via NEXT_PUBLIC_TIKTOK_PIXEL_ID. */
export const DEFAULT_TIKTOK_PIXEL_ID = 'D8VJK5RC77UB3EFMQG80';

/** Matches `CookieConsent` localStorage key — do not rename without updating both. */
export const COOKIE_CONSENT_STORAGE_KEY = 'b4b-cookie-consent';

export function getTikTokPixelId(): string {
  return process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() || DEFAULT_TIKTOK_PIXEL_ID;
}

/** Whether to emit TikTok base code in HTML (server + client). */
export function isTikTokPixelEnabledForBuild(): boolean {
  if (!getTikTokPixelId()) return false;
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_FORCE !== '1'
  ) {
    return false;
  }
  return true;
}

/** Static events.js URL — TikTok Events Manager greps for sdkid= in HTML. */
export function getTikTokEventsScriptUrl(pixelId: string = getTikTokPixelId()): string {
  const id = encodeURIComponent(pixelId);
  return `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`;
}

/** Official TikTok queue bootstrap (inline). */
export function buildTikTokPixelBootstrap(pixelId: string): string {
  return `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');`;
}
