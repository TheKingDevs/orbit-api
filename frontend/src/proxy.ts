import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@constants";

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const pathname = req.nextUrl.pathname;
  const requiresSession =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/me" ||
    pathname.startsWith("/me/");

  if (requiresSession && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"]
};
