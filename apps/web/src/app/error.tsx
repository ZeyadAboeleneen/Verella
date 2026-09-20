"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side errors are already logged by Next; this just makes sure a
    // client-thrown error (e.g. a fetch failure inside an effect) is visible too.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <AlertTriangle size={40} className="mb-4 text-[#ba1a1a]" />
      <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-black">Something went wrong</h1>
      <p className="mt-3 text-[#4A3026]">
        Sorry about that — an unexpected error occurred. Please try again, and if it keeps happening, let us know.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#57392D] transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-[#8E7B6A] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#000000] hover:bg-black hover:text-white hover:border-black transition-all"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
