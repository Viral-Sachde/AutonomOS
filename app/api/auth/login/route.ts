import { NextRequest, NextResponse } from "next/server";
import {
  verifyLogin, createSession, SESSION_COOKIE, sessionCookieOptions, isAuthConfigured,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured. Set AUTH_USER, AUTH_PASSWORD and AUTH_SECRET." },
      { status: 500 }
    );
  }

  try {
    const { user, password } = await req.json();

    if (!(await verifyLogin(String(user || ""), String(password || "")))) {
      // One message for both cases so it cannot be used to enumerate the id.
      return NextResponse.json({ error: "Wrong id or password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await createSession(), sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
