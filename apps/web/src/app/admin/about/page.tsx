import { and, eq } from "drizzle-orm";
import { db, contentBlocks } from "@verella/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { AboutHeroManager } from "@/components/admin/content/about-hero-manager";
import type { AboutHeroPayload } from "@/lib/content/queries";

export default async function AdminAboutPage() {
  const rows = await withDbTimeout(
    db
      .select({ payload: contentBlocks.payload })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.page, "about"), eq(contentBlocks.blockKey, "hero")))
      .limit(1),
  ).catch(() => null);

  const current = rows?.[0]?.payload as AboutHeroPayload | undefined;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">About Page</h1>
      <p className="mt-1 text-sm text-on-surface-variant">Manage the content shown on your public About page.</p>

      <div className="mt-6 max-w-md">
        {rows === null ? (
          <p className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
            Couldn&apos;t reach the database — refresh the page to try again.
          </p>
        ) : (
          <AboutHeroManager initial={current ? { id: current.mediaId, url: current.imageUrl } : null} />
        )}
      </div>
    </div>
  );
}
