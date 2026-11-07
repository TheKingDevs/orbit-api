import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {
        source: "/404",
        destination: "/erro/404",
        permanent: false
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${backendUrl}/storage/:path*`,
      },
      {
        source: "/preview/ttp",
        destination: `${backendUrl}/preview/ttp`,
      },
      {
        source: "/assets/html-to-image.js",
        destination: `${backendUrl}/assets/html-to-image.js`,
      },
    ];
  },
};

export default nextConfig;
