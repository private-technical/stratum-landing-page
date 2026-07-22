import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  submitTasteCheck,
  TasteCheckError,
  SESSION_COOKIE_NAME,
} from "@/components/shared/pocketbase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // PocketBase re-checks this token itself (see the route this calls),
  // so this early return is purely to avoid a wasted round-trip for the
  // common case of an expired/missing session, not the real auth check.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Your session has expired. Refresh the page and try again." },
      { status: 401 }
    );
  }

  let body: { pickAlbum?: string; pickFilm?: string; pickBook?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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
    console.warn(`[waitlist/taste-check] failed for ${username}`, err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
