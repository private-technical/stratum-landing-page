import Link from "next/link";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Navbar from "@/components/navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 404s should never show up in search results, even if something
// somewhere returns one with a 200 instead of a true 404 status.
export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This content isn't available. It may have been removed or is no longer public.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      className={`relative flex min-h-[100dvh] w-full flex-col bg-black text-white ${poppins.className}`}
    >
      {/* Same Navbar as the rest of the site — carries the logo + name */}
      <Navbar backgroundTheme="dark" />

      <section
        className="fade-up flex flex-1 flex-col items-center justify-center gap-4 pb-40 pt-36 text-center md:pb-48 md:pt-44"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          This content isn&rsquo;t available
        </h1>
        <p className="max-w-[320px] text-[15px] leading-[1.75] text-white/55 sm:text-[16px]">
          It may have been removed or is no longer public.
        </p>
        <Link
          href="/"
          className="mt-4 text-[12px] font-medium uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white/70"
        >
          Back to Stratum
        </Link>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}