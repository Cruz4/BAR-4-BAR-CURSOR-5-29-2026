export const DEVICE_SESSION_STORAGE_KEY = 'ba.auth-device-session.v1';
export const DEVICE_SESSION_HEARTBEAT_MS = 60_000;

export type DeviceKind = 'desktop' | 'phone' | 'tablet' | 'unknown';

export type DeviceSession = {
  id: string;
  browser: string;
  operatingSystem: string;
  deviceKind: DeviceKind;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export function isValidDeviceSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(value);
}

export function parseDeviceUserAgent(userAgent: string): Pick<
  DeviceSession,
  'browser' | 'operatingSystem' | 'deviceKind'
> {
  const ua = userAgent || '';

  const browser = /EdgA?\//i.test(ua)
    ? 'Microsoft Edge'
    : /SamsungBrowser\//i.test(ua)
      ? 'Samsung Internet'
      : /CriOS\//i.test(ua)
        ? 'Google Chrome'
        : /FxiOS\//i.test(ua)
          ? 'Mozilla Firefox'
          : /OPR\//i.test(ua)
            ? 'Opera'
            : /Chrome\//i.test(ua)
              ? 'Google Chrome'
              : /Firefox\//i.test(ua)
                ? 'Mozilla Firefox'
                : /Safari\//i.test(ua)
                  ? 'Safari'
                  : 'BA app';

  const operatingSystem = /Android/i.test(ua)
    ? 'Android'
    : /iPad|Macintosh.*Mobile/i.test(ua)
      ? 'iPadOS'
      : /iPhone|iPod/i.test(ua)
        ? 'iOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /CrOS/i.test(ua)
            ? 'ChromeOS'
            : /Mac OS X|Macintosh/i.test(ua)
              ? 'macOS'
              : /Linux/i.test(ua)
                ? 'Linux'
                : 'Unknown OS';

  const deviceKind: DeviceKind = /iPad|Tablet|Macintosh.*Mobile/i.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|iPod|Android/i.test(ua)
      ? 'phone'
      : ua
        ? 'desktop'
        : 'unknown';

  return { browser, operatingSystem, deviceKind };
}
