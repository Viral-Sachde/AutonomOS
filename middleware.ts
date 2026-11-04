import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAuthConfigured, timingSafeEqual } from "@/lib/auth";

/**
 * Gate on everything except the login flow.
 *
 * Cron routes used to be excluded from the matcher entirely so the scheduler
 * could reach them. That also exempted their POST handlers, which take no
 * bearer token of their own, so anyone who knew the URL could fire an agent
 * run and spend the API budget. They are inside the gate now, and the
 * scheduler is recognised by its bearer token instead.
 */
export const config = {
  // Only the app and its API are gated. The marketing site (/, /product,
  // /departments/*, /pricing, /brand), the login page and static files are
  // public. /api/auth is let through below so signing in is possible.
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

/**
 * True for a request carrying the scheduler's shared secret.
 *
 * An unset CRON_SECRET matches nothing: a missing secret must never be the
 * thing that lets a request through.
 */
function isScheduler(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return timingSafeEqual(header.slice(7), secret);
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/auth")) return NextResponse.next();

  // GitHub Actions authenticates with a token rather than a browser session.
  if (isScheduler(req)) return NextResponse.next();

  // With no credentials configured the dashboard stays open, which is the right
  // behaviour locally. The login page warns when this is the case.
  if (!isAuthConfigured()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  // An API call should get a 401 it can handle, not an HTML redirect.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}
