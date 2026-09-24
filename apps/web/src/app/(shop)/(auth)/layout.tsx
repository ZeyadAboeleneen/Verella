import type { Metadata } from "next";

// Sign-in, sign-up and password flows are never search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
