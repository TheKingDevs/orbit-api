import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@constants";

const PUBLIC_ROUTES = ["/", "/login", "/404", "/erro"];

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const pathname = req.nextUrl.pathname;

  // Checkout uses the same-origin Next.js rewrite. The backend still enforces
  // the session and CSRF token; remove the browser Origin so deployment aliases
  // and Vercel preview hosts do not have to be copied into the backend CORS list.
  if (pathname === "/api/user/billing/checkout") {
    const headers = new Headers(req.headers);
    headers.delete("origin");
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
  matcher: ["/api/user/billing/checkout", "/((?!_next|api|favicon.ico|.*\\..*).*)"]
};
