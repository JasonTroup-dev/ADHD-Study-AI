import path from "node:path";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  agentRules: false,
  outputFileTracingRoot: path.resolve(directory, "../.."),
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://calendar.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "calendar-test-public-key",
  },
};

export default nextConfig;
