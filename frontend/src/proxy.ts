import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@constants";

const PUBLIC_ROUTES = ["/", "/login", "/404", "/erro"];

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const pathname = req.nextUrl.pathname;

  // API requests are proxied to the backend, which performs its own auth.
  // Forward the public origin so generated storage links never expose the
  // internal backend host.
  if (pathname.startsWith("/api/")) {
    const headers = new Headers(req.headers);

    // Checkout still relies on backend session and CSRF checks; Shazam relies
    // on backend API-key auth. Remove browser Origin so deployment aliases and
    // preview hosts do not need to be copied into the backend CORS list.
    if (pathname === "/api/user/billing/checkout" || pathname === "/api/ai/shazam") {
      headers.delete("origin");
    }

    headers.set("x-public-base-url", req.nextUrl.origin);
    return NextResponse.next({ request: { headers } });
  }

  const isPublic = PUBLIC_ROUTES.some(route =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next|api|favicon.ico|.*\\..*).*)"
  ]
};
