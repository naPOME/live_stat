import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@live-stat/shared"],
  output: "standalone",
};

export default nextConfig;
