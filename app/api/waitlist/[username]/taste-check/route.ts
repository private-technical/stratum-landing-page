import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  submitTasteCheck,
  TasteCheckError,
  SESSION_COOKIE_NAME,
} from "../../../../../components/shared/pocketbase-server";

// This is the Next.js side of POST /api/waitlist/user/{username}/taste-check.
// The form in matches-view.tsx is a client component, so it can't read the
// httpOnly session cookie itself — that's the whole point of it being
// httpOnly. This route runs on the server, reads the cookie, and relays
// the request to PocketBase's own taste-check hook (which does the actual
// token check) via submitTasteCheck(). Mirrors how /api/taste/scrape
// relays client requests to PocketBase's /api/taste/cache, just with a
// cookie instead of a shared secret.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Invalid or expired session. Refresh the page and try again." },
      { status: 401 }
    );
  }

  let body: { pickAlbum?: string; pickFilm?: string; pickBook?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pickAlbum = (body.pickAlbum || "").trim();
  const pickFilm = (body.pickFilm || "").trim();
  const pickBook = (body.pickBook || "").trim();

  if (!pickAlbum || !pickFilm || !pickBook) {
    return NextResponse.json({ error: "All three picks are required." }, { status: 400 });
  }

  try {
    const tasteMatches = await submitTasteCheck(username, token, {
      pickAlbum,
      pickFilm,
      pickBook,
    });
    return NextResponse.json({ tasteMatches });
  } catch (err) {
    if (err instanceof TasteCheckError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
