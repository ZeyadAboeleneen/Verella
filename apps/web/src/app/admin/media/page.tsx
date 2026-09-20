import { desc, count } from "drizzle-orm";
import { db, media } from "@verella/db";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(media).orderBy(desc(media.createdAt)).limit(PAGE_SIZE).offset(offset),
    db.select({ total: count() }).from(media),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Media Library</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        Upload images for the menu, store, and homepage. Files are stored in MinIO.
      </p>

      <div className="mt-6">
        <MediaLibrary
          initialItems={rows.map((r) => ({
            id: r.id,
            url: r.isPrivate ? null : r.url,
            alt: r.alt,
            title: r.title,
            isPrivate: r.isPrivate,
            mime: r.mime,
          }))}
        />
        <Pagination basePath="/admin/media" page={page} total={total} />
      </div>
    </div>
  );
}
