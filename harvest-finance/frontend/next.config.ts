// Simplified Next.js config without next-intl plugin
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // We already register our own SW in ServiceWorkerRegistration.
  // But next-pwa will still generate/update /public/sw.js.
  // (acceptance criteria: caches + offline fallback)
  runtimeCaching: [
    {
      // Next/static + build assets
      urlPattern: ({ request }) => {
        const url = new URL(request.url);
        return (
          url.pathname.startsWith("/_next/static") ||
          url.pathname.startsWith("/static/") ||
          url.pathname.endsWith(".js") ||
          url.pathname.endsWith(".css") ||
          url.pathname.endsWith(".png") ||
          url.pathname.endsWith(".svg")
        );
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "harvest-static",
        expiration: {
          maxEntries: 512,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      // Offline vault list: cache the last successful response.
      urlPattern: ({ url }) => {
        const pathname = url.pathname;
        return (
          pathname.startsWith("/api/v1/") &&
          (pathname.includes("/farm-vaults") || pathname.includes("/vaults"))
        );
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "harvest-api-vault-list",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
  ],

  // Offline fallback page.
  // next-pwa will ensure this gets used for navigation requests.
  // (We also keep a manual SW already present; this config is the source of truth.)
  fallbacks: {
    document: "/offline.html",
  },
});

