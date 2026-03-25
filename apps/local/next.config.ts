import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@live-stat/shared"],
  output: "standalone",
  turbopack: {},
  experimental: {
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    staticGenerationRetryCount: 0,
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
