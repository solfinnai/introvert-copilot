import type { NextConfig } from "next";
import { seedTracingIncludes } from "./lib/trace-routes";

const nextConfig: NextConfig = {
  serverExternalPackages: ["falkordb", "redis"],
  outputFileTracingIncludes: seedTracingIncludes(),
};

export default nextConfig;
