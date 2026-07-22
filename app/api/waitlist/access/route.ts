import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../../../../components/shared/pocketbase-server";

// Landing point for the link emailed by resend-link. Validates the token
// server-to-server, sets the session cookie on this origin, then redirects
// to the clean /[username] URL so the token doesn't linger in the visible
// address bar or browser history.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "";
  const token = searchParams.get("token") || "";

  const destination = username ? `/${encodeURIComponent(username)}` : "/";
  const response = NextResponse.redirect(new URL(destination, request.url));

  if (!username || !token) {
    return response;
  }

  const user = await verifyAccessToken(username, token);
  if (user) {
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }
  // Invalid/expired token: redirects without setting a cookie — the
  // private gate shows, same as any unauthenticated visit.

  return response;
}