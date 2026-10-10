import Link from "@/components/LocaleLink";
import { and, asc, eq, count, inArray, isNull, like, or } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";
import {
  db,
  storeProducts,
  storeProductTranslations,
  storeProductVariants,
  storeProductCategories,
  storeCategories,
  storeCategoryTranslations,
  storeProductMedia,
  media,
} from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { SectionTabs } from "@/components/admin/section-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";
import { deleteStoreProductAction } from "@/lib/store/actions";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSelectFilter } from "@/components/admin/admin-select-filter";
import { isAiBackgroundsEnabled, isStyledMedia } from "@/lib/media/auto-styled";

export default async function AdminStoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const { page: pageParam, q: rawQ, category: rawCategory } = await searchParams;
  const q = rawQ?.trim().slice(0, 100) ?? "";
  // Name (English or Arabic), brand, slug or SKU.
  // Escape LIKE wildcards so "50%" searches for the text, not "anything".
  const pattern = `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
  const categoryId = Number(rawCategory) || 0;
  const categories = await db
    .select({ id: storeCategories.id, slug: storeCategories.slug, name: storeCategoryTranslations.name })
    .from(storeCategories)
    .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
    .orderBy(asc(storeCategories.sortOrder));
  const activeCategory = categories.find((c) => c.id === categoryId);
  const where = and(
    isNull(storeProducts.deletedAt),
    q
      ? or(
          like(storeProducts.brand, pattern),
          like(storeProducts.slug, pattern),
          like(storeProducts.sku, pattern),
          inArray(
            storeProducts.id,
            db.select({ id: storeProductTranslations.productId }).from(storeProductTranslations).where(like(storeProductTranslations.name, pattern)),
          ),
        )
      : undefined,
    // Main category, or any extra category the product is also listed in.
    activeCategory
      ? or(
          eq(storeProducts.categoryId, activeCategory.id),
          inArray(
            storeProducts.id,
            db.select({ id: storeProductCategories.productId }).from(storeProductCategories).where(eq(storeProductCategories.categoryId, activeCategory.id)),
          ),
        )
      : undefined,
  );
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: storeProducts.id,
        price: storeProducts.price,
        currency: storeProducts.currency,
        stockQty: storeProducts.stockQty,
        brand: storeProducts.brand,
        isActive: storeProducts.isActive,
        isBestSeller: storeProducts.isBestSeller,
        isFeaturedHome: storeProducts.isFeaturedHome,
        autoStyled: storeProducts.autoStyled,
        name: storeProductTranslations.name,
        categoryName: storeCategories.slug,
      })
      .from(storeProducts)
      .leftJoin(storeProductTranslations, and(eq(storeProductTranslations.productId, storeProducts.id), eq(storeProductTranslations.locale, "en")))
      .leftJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
      .where(where)
      .orderBy(asc(storeProducts.categoryId), asc(storeProducts.sortOrder))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(storeProducts).where(where),
  ]);

  const variantRows = rows.length
    ? await db
        .select({ productId: storeProductVariants.productId, stockQty: storeProductVariants.stockQty, isActive: storeProductVariants.isActive })
        .from(storeProductVariants)
        .where(inArray(storeProductVariants.productId, rows.map((r) => r.id)))
    : [];
  // Main (first) photo per product — is it an AI styled one yet?
  const [photoRows, aiEnabled] = await Promise.all([
    rows.length
      ? db
          .select({ productId: storeProductMedia.productId, sortOrder: storeProductMedia.sortOrder, folder: media.folder, url: media.url })
          .from(storeProductMedia)
          .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
          .where(inArray(storeProductMedia.productId, rows.map((r) => r.id)))
          .orderBy(asc(storeProductMedia.sortOrder))
      : Promise.resolve([]),
    isAiBackgroundsEnabled().catch(() => true),
  ]);
  /** AI background state for the list: done / waiting to be made / off / no photo. */
  const aiStatus = (p: (typeof rows)[number]) => {
    const main = photoRows.find((r) => r.productId === p.id);
    if (main && isStyledMedia(main)) return { label: "AI photo", tone: "bg-[#E7F7EE] text-[#1B7A44]", hint: "The cover is the AI styled photo." };
    if (!p.autoStyled) return { label: "AI off", tone: "bg-surface-container-high text-on-surface-variant", hint: "Photos are used as uploaded." };
    if (!main) return { label: "No photo", tone: "bg-surface-container-high text-on-surface-variant", hint: "Add a photo to get an AI background." };
    if (!aiEnabled) return { label: "AI paused", tone: "bg-amber-50 text-amber-800", hint: "AI backgrounds are switched off in Settings." };
    return { label: "AI pending", tone: "bg-amber-50 text-amber-800", hint: "Will be made after the next save, or use Generate on the product." };
  };
  /** Stock that can actually sell: summed across active variants when the product has any. */
  const stockFor = (p: (typeof rows)[number]) => {
    const vs = variantRows.filter((v) => v.productId === p.id && v.isActive);
    return vs.length ? { qty: vs.reduce((s, v) => s + v.stockQty, 0), variants: vs.length } : { qty: p.stockQty, variants: 0 };
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Store</h1>
        <Button asChild>
          <Link href="/admin/store/products/new">
            <Plus size={16} /> New product
          </Link>
        </Button>
      </div>

      <SectionTabs
        tabs={[
          { label: "Categories", href: "/admin/store" },
          { label: "Products", href: "/admin/store/products" },
        ]}
      />

      <div className="mb-4 mt-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <AdminSearch placeholder="Search products by name, brand, slug or SKU…" />
          </div>
          <div className="sm:w-64">
            <AdminSelectFilter
              param="category"
              label="Filter by category"
              allLabel="All categories"
              options={categories.map((c) => ({ value: String(c.id), label: c.name ?? c.slug }))}
            />
          </div>
        </div>
        {(q || activeCategory) && (
          <p className="mt-2 text-xs text-on-surface-variant">
            {total} {total === 1 ? "product" : "products"}
            {activeCategory && <> in “{activeCategory.name ?? activeCategory.slug}”</>}
            {q && <> matching “{q}”</>}
          </p>
        )}
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Brand</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Stock</Th>
            <Th>Flags</Th>
            <Th>AI background</Th>
            <Th>Status</Th>
            <Th className="text-end">Actions</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map((p) => {
            const stock = stockFor(p);
            return (
            <Tr key={p.id}>
              <Td className="font-medium">{p.name ?? "—"}</Td>
              <Td className="text-on-surface-variant">{p.brand ?? "—"}</Td>
              <Td className="text-on-surface-variant">{p.categoryName}</Td>
              <Td>
                {stock.variants > 0 && <span className="me-1 text-xs text-on-surface-variant">from</span>}
                {formatMoney(toCents(p.price), p.currency)}
              </Td>
              <Td className={stock.qty < 10 ? "font-semibold text-error" : "text-on-surface-variant"}>
                {stock.qty}
                {stock.variants > 0 && <span className="ms-1 text-xs font-normal text-on-surface-variant">· {stock.variants} variants</span>}
              </Td>
              <Td className="space-x-1">
                {p.isBestSeller && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs">Best seller</span>}
              </Td>
              <Td>
                {(() => {
                  const ai = aiStatus(p);
                  return (
                    <span title={ai.hint} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${ai.tone}`}>
                      {ai.label}
                    </span>
                  );
                })()}
              </Td>
              <Td>
                <span
                  className={
                    p.isActive
                      ? "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
                      : "rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
                  }
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </Td>
              <Td className="text-end">
                <div className="flex items-center justify-end gap-3">
                  <Link href={`/admin/store/products/${p.id}/edit`} className="text-on-surface-variant hover:text-primary">
                    <Pencil size={16} />
                  </Link>
                  <DeleteButton action={deleteStoreProductAction.bind(null, p.id)} />
                </div>
              </Td>
            </Tr>
            );
          })}
          {rows.length === 0 && <EmptyRow colSpan={9}>{q ? `No products match “${q}”.` : "No products yet."}</EmptyRow>}
        </tbody>
      </Table>
      <Pagination basePath="/admin/store/products" params={{ q: q || undefined, category: activeCategory ? String(activeCategory.id) : undefined }} page={page} total={total} />
    </div>
  );
}
