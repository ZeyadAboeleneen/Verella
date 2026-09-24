import Link from "@/components/LocaleLink";
import { WifiOff } from "lucide-react";

/**
 * Friendly inline fallback for a page section whose data failed to load —
 * used instead of letting a transient DB failure 500 the route or strand the
 * user on an endless skeleton.
 */
export function LoadErrorBand({ message, retryLabel, href }: { message: string; retryLabel: string; href: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-20 text-center">
      <WifiOff aria-hidden="true" size={36} strokeWidth={1.5} className="text-beige" />
      <p className="text-sm leading-relaxed text-charcoal/80">{message}</p>
      <Link
        href={href}
        className="rounded-full bg-charcoal px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-black"
      >
        {retryLabel}
      </Link>
    </div>
  );
}
