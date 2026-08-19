/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://pagead2.googlesyndication.com https://www.googletagservices.com https://*.adtrafficquality.google https://analytics.tiktok.com https://*.tiktok.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data: https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.googleapis.com",
  "connect-src 'self' https://apis.google.com https://accounts.google.com https://*.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.adtrafficquality.google https://ep1.adtrafficquality.google https://analytics.tiktok.com https://analytics-ipv6.tiktok.com https://business-api.tiktok.com https://*.tiktok.com https://*.tiktokw.us https://*.tiktokv.com https://*.pangle-ads.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://bar4bar.ink https://*.firebaseapp.com https://www.google.com https://www.gstatic.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com https://w.soundcloud.com https://*.soundcloud.com https://open.spotify.com https://*.spotify.com https://suno.com https://*.suno.com https://app.suno.ai https://www.tiktok.com https://*.tiktok.com https://www.instagram.com https://*.instagram.com https://www.facebook.com https://*.facebook.com https://facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  // Force public env into the Next runtime (server + client compile).
  env: {
    NEXT_PUBLIC_LOCK: process.env.NEXT_PUBLIC_LOCK ?? '',
  },
  typescript: {
    // Keep false — project typechecks clean; do not hide regressions again.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/folds', destination: '/msgs', permanent: true },
      { source: '/folds/:foldId', destination: '/msgs/:foldId', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/auth',
    'firebase-admin/firestore',
  ],
  webpack: (config, { dev, isServer }) => {
    // Windows paths with special characters can miss file events; polling stabilizes dev HMR.
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
