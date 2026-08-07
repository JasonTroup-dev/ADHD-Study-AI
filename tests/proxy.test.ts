import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateSession } = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("@/lib/supabase/proxy", () => ({ updateSession }));

import { NextRequest, NextResponse } from "next/server";

import { proxy } from "@/proxy";

describe("application proxy", () => {
  beforeEach(() => {
    updateSession.mockResolvedValue({
      isAuthenticated: false,
      response: NextResponse.next(),
    });
  });

  it("updates the session without redirecting API requests", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/api/classes")
    );

    expect(updateSession).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the sample workspace public for anonymous visitors", async () => {
    const response = await proxy(new NextRequest("http://localhost/demo"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/calendar", "/study-session/session-1"])(
    "redirects unauthenticated visits to protected route %s",
    async (pathname) => {
      const sessionResponse = NextResponse.next();
      sessionResponse.cookies.set("sb-session", "refreshed-token", {
        path: "/",
      });
      sessionResponse.headers.set("Cache-Control", "private, no-store");
      updateSession.mockResolvedValue({
        isAuthenticated: false,
        response: sessionResponse,
      });

      const response = await proxy(
        new NextRequest(`http://localhost${pathname}`)
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
      expect(response.cookies.get("sb-session")?.value).toBe(
        "refreshed-token"
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  );

  it("does not redirect an authenticated protected request", async () => {
    updateSession.mockResolvedValue({
      isAuthenticated: true,
      response: NextResponse.next(),
    });

    const response = await proxy(
      new NextRequest("http://localhost/study-session/session-1")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
