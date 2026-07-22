/** Milliseconds to show the "you're on the list" state before redirecting. */
export const REDIRECT_DELAY_MS = 2500;

/** Builds the path to a user's matches page at app/[username]/page.tsx. */
export const buildUserPath = (username: string) => `/${encodeURIComponent(username)}`;