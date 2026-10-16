import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [
      {
        // Everything except the embed page: refuse to be framed by other sites (clickjacking protection).
        source: "/((?!embed/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The chat widget iframe must be embeddable on any website, so it sends NO framing
        // restriction at all. (Don't use `frame-ancestors *`: browsers read `*` as
        // "http/https/ws/wss pages only", which blocks pages opened from disk via file://.)
        source: "/embed/:slug*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
      {
        // The loader script is fetched by other websites.
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
