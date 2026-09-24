"use client";

import { useEffect } from "react";
import Link from "@/components/LocaleLink";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side errors are already logged by Next; this just makes sure a
    // client-thrown error (e.g. a fetch failure inside an effect) is visible too.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <AlertTriangle size={40} className="mb-4 text-error" />
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-black">Something went wrong</h1>
      <p className="mt-3 text-charcoal/80">
        Sorry about that — an unexpected error occurred. Please try again, and if it keeps happening, let us know.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-charcoal transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-outline px-6 py-3 text-xs font-semibold uppercase tracking-widest text-charcoal hover:bg-black hover:text-white hover:border-black transition-all"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
