import Link from "next/link";
import { Coffee } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <Coffee size={40} className="mb-4 text-[#57392D]" />
      <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-black">Page not found</h1>
      <p className="mt-3 text-[#4A3026]">
        We couldn&apos;t find what you&apos;re looking for. It may have moved, or the link might be out of date.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#57392D] transition-colors"
        >
          Back home
        </Link>
        <Link
          href="/store"
          className="rounded-full border border-[#8E7B6A] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#000000] hover:bg-black hover:text-white hover:border-black transition-all"
        >
          Shop the store
        </Link>
      </div>
    </div>
  );
}
