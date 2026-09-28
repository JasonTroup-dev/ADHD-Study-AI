import { afterEach, describe, expect, it, vi } from "vitest";

import { enforceAIQuota } from "@/lib/ai/requestProtection";

function createSupabaseMock(result: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as never;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("enforceAIQuota", () => {
  it("allows local development when the quota RPC has not been deployed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabase = createSupabaseMock({
      data: null,
      error: { code: "PGRST202", message: "Function not found" },
    });

    const response = await enforceAIQuota(supabase, "flashcards");

    expect(response).toBeNull();
    expect(warning).toHaveBeenCalledOnce();
  });

  it("continues to fail closed in production when the RPC is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createSupabaseMock({
      data: null,
      error: { code: "PGRST202", message: "Function not found" },
    });

    const response = await enforceAIQuota(supabase, "flashcards");

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({
      error: "Usage limits could not be checked. Try again shortly.",
    });
  });

  it("does not bypass other quota failures during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createSupabaseMock({
      data: null,
      error: { code: "42501", message: "Permission denied" },
    });

    const response = await enforceAIQuota(supabase, "flashcards");

    expect(response?.status).toBe(503);
  });
});
