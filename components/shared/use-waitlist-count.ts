"use client";

import { useEffect, useState } from "react";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://pocketbase-railway-production-28ed.up.railway.app";

// The marketing number before any real signups existed — this was the
// hardcoded "4,218" copy. Live count = this + global_settings.total_signups.
// Bump this if you ever want to reset the public-facing baseline.
const WAITLIST_BASE_COUNT = 1000;

const GLOBAL_SETTINGS_COLLECTION = "global_settings";

// One shared client for the whole app rather than one per hook instance —
// avoids opening a duplicate SSE connection every time this hook mounts
// on a different section.
let sharedPb: PocketBase | null = null;
function getPb(): PocketBase {
  if (!sharedPb) sharedPb = new PocketBase(POCKETBASE_URL);
  return sharedPb;
}

/**
 * Live waitlist count, starting at WAITLIST_BASE_COUNT and tracking
 * global_settings.total_signups in realtime — no refresh needed.
 *
 * Requires global_settings' List/Search AND View rules to be public
 * (empty string, not left as superuser-only) since both the initial
 * fetch and the realtime subscription go through the List rule.
 */
export function useWaitlistCount(): number {
  const [count, setCount] = useState(WAITLIST_BASE_COUNT);

  useEffect(() => {
    let isMounted = true;
    const pb = getPb();
    let unsubscribe: (() => void) | null = null;

    async function init() {
      // Initial value on load/refresh.
      try {
        const record = await pb
          .collection(GLOBAL_SETTINGS_COLLECTION)
          .getFirstListItem("", { requestKey: null });
        if (isMounted) {
          setCount(WAITLIST_BASE_COUNT + (record.total_signups || 0));
        }
      } catch (err) {
        // A 404 here means global_settings has no row yet — expected on
        // a brand new install before the onBootstrap hook in main.pb.js
        // has run (or if it hasn't been redeployed yet). Not worth
        // logging as an error; anything else genuinely is.
        const status = (err as { status?: number })?.status;
        if (status !== 404) {
          console.error("[useWaitlistCount] initial fetch failed:", err);
        }
      }

      // Push updates after that — subscribing to "*" is safe here since
      // there's only ever one global_settings record, and we don't need
      // its id ahead of time.
      try {
        unsubscribe = await pb.collection(GLOBAL_SETTINGS_COLLECTION).subscribe("*", (e) => {
          if (!isMounted) return;
          const total = e.record?.total_signups;
          if (typeof total === "number") {
            setCount(WAITLIST_BASE_COUNT + total);
          }
        });
      } catch (err) {
        // Realtime subscription failed (rules misconfigured, PocketBase
        // unreachable, etc.) — the count just stays static at whatever
        // the initial fetch got.
        console.error("[useWaitlistCount] realtime subscribe failed:", err);
      }
    }

    init();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  return count;
}