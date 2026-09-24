import Link from "@/components/LocaleLink";
import { VMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <VMark size={40} className="mb-6 text-gold" />
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-charcoal">Page not found</h1>
      <p className="mt-3 text-charcoal/80">
        We couldn&apos;t find what you&apos;re looking for. It may have moved, or the link might be out of date.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-charcoal px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ivory hover:bg-primary-container transition-colors"
        >
          Back home
        </Link>
        <Link
          href="/store"
          className="rounded-full border border-outline px-6 py-3 text-xs font-semibold uppercase tracking-widest text-charcoal hover:bg-charcoal hover:text-ivory hover:border-charcoal transition-all"
        >
          Shop the store
        </Link>
      </div>
    </div>
  );
}
