import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 25;

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  params = {},
  page,
  total,
  pageSize = PAGE_SIZE,
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-xs text-on-surface-variant">
        Showing {start}-{end} of {total}
      </p>
      <nav className="flex items-center gap-2" aria-label="Pagination">
        <Link
          href={hrefFor(basePath, params, page - 1)}
          aria-label="Previous page"
          aria-disabled={page <= 1}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-container"
          }`}
        >
          <ChevronLeft size={16} />
        </Link>
        <span className="text-xs font-semibold text-on-surface-variant">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefFor(basePath, params, page + 1)}
          aria-label="Next page"
          aria-disabled={page >= totalPages}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-surface-container"
          }`}
        >
          <ChevronRight size={16} />
        </Link>
      </nav>
    </div>
  );
}
