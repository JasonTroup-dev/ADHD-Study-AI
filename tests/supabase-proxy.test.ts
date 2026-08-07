import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, getClaims } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

describe("Supabase session proxy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";

    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: { getClaims },
      options,
    }));
  });

  it("persists refreshed cookies on the request and response", async () => {
    getClaims.mockImplementation(async () => {
      const cookieMethods = createServerClient.mock.calls[0][2].cookies;

      cookieMethods.setAll(
        [
          {
            name: "sb-session",
            value: "refreshed-token",
            options: { httpOnly: true, path: "/" },
          },
        ],
        {
          "Cache-Control": "private, no-store",
          Expires: "0",
          Pragma: "no-cache",
        }
      );

      return { data: { claims: { sub: "user-1" } }, error: null };
    });

    const request = new NextRequest("http://localhost/api/classes");
    const result = await updateSession(request);

    expect(result.isAuthenticated).toBe(true);
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed-token");
    expect(result.response.cookies.get("sb-session")?.value).toBe(
      "refreshed-token"
    );
    expect(result.response.headers.get("cache-control")).toBe(
      "private, no-store"
    );
    expect(result.response.headers.get("expires")).toBe("0");
    expect(result.response.headers.get("pragma")).toBe("no-cache");
  });

  it("reports a missing or invalid session as unauthenticated", async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: new Error("Auth session missing"),
    });

    const result = await updateSession(
      new NextRequest("http://localhost/calendar")
    );

    expect(result.isAuthenticated).toBe(false);
  });
});
