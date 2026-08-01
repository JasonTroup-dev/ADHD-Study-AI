import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // Leave room for multipart headers around the 25MB study file limit.
    proxyClientMaxBodySize: "26mb",
  },
};

export default nextConfig;
