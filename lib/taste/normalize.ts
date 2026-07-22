// Cache-key normalization for a user's free-text pick. Kept deliberately
// simple (no locale-aware casing, no accent stripping) because the exact
// same algorithm has to be reimplemented inside main_pb.js's JSVM runtime
// (goja), which doesn't reliably support the same Unicode APIs as Node —
// see the inline copy in the join handler patch.
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
