import { NextRequest, NextResponse } from "next/server";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://kvxjstklylu1j2p.ba7w.pocketbasecloud.com";

// Thin proxy so the browser only ever talks to this same-origin route,
// never PocketBase directly — keeps PocketBase's CORS config untouched
// and matches the pattern already used for join/session.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";

  if (!username) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

  const res = await fetch(
    `${POCKETBASE_URL}/api/waitlist/user/${encodeURIComponent(username)}/resend-link`,
    { method: "POST" }
  );
  const data = await res.json().catch(() => ({}));

  return NextResponse.json(data, { status: res.status });
}