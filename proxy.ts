import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const protectedRoutes = [
  "/calendar",
  "/dashboard",
  "/classes",
  "/study",
  "/study-session",
  "/planner",
  "/report-bug",
  "/settings",
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) =>
    matchesRoute(pathname, route)
  );
  const { isAuthenticated, response } = await updateSession(request);

  if (isProtectedRoute && !isAuthenticated) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    for (const headerName of ["cache-control", "expires", "pragma"]) {
      const headerValue = response.headers.get(headerName);

      if (headerValue) {
        redirectResponse.headers.set(headerName, headerValue);
      }
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
