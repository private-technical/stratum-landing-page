"use client";

import { useState } from "react";

export default function PrivateGate({ username }: { username: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSendLink() {
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist/resend-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok && res.status !== 429) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-6 text-center">
      {status === "sent" ? (
        <>
          <h1 className="text-2xl font-medium tracking-[-0.03em] text-black">
            Check your inbox
          </h1>
          <p className="mt-3 max-w-sm text-[16px] leading-[1.5] text-black/60">
            We sent a private link to the email this account joined with.
            Open it on this device to see the page.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-medium tracking-[-0.03em] text-black">
            This is a private page.
          </h1>
          <p className="mt-3 max-w-sm text-[16px] leading-[1.5] text-black/60">
            Only the person who joined the waitlist as @{username} can view it.
          </p>
          <button
            onClick={handleSendLink}
            disabled={status === "sending"}
            className="mt-6 rounded-full bg-black px-6 py-3 font-medium text-white transition-opacity disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Email me a private link"}
          </button>
          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">
              Something went wrong. Please try again.
            </p>
          )}
        </>
      )}
    </main>
  );
}
