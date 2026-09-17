import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/telemetry/:path*",
        destination: "http://127.0.0.1:8000/api/telemetry/:path*",
      },
      {
        source: "/api/landslides/:path*",
        destination: "http://127.0.0.1:8000/api/landslides/:path*",
      },
      {
        source: "/api/risk/:path*",
        destination: "http://127.0.0.1:8000/api/risk/:path*",
      },
      {
        source: "/api/alerts/:path*",
        destination: "http://127.0.0.1:8000/api/alerts/:path*",
      },
      {
        source: "/api/region/:path*",
        destination: "http://127.0.0.1:8000/api/region/:path*",
      },
      {
        source: "/api/model/:path*",
        destination: "http://127.0.0.1:8000/api/model/:path*",
      },
    ];
  },
};

export default nextConfig;
