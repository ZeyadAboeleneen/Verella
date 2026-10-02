import Link from "@/components/LocaleLink";
import { and, asc, eq, count, inArray, isNull, like, or } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";
import { db, storeProducts, storeProductTranslations, storeProductVariants, storeCategories } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { SectionTabs } from "@/components/admin/section-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";
import { deleteStoreProductAction } from "@/lib/store/actions";
import { AdminSearch } from "@/components/admin/admin-search";

export default async function AdminStoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q: rawQ } = await searchParams;
  const q = rawQ?.trim().slice(0, 100) ?? "";
  // Name (English or Arabic), brand, slug or SKU.
  // Escape LIKE wildcards so "50%" searches for the text, not "anything".
  const pattern = `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
  const where = q
    ? and(
        isNull(storeProducts.deletedAt),
        or(
          like(storeProducts.brand, pattern),
          like(storeProducts.slug, pattern),
          like(storeProducts.sku, pattern),
          inArray(
            storeProducts.id,
            db.select({ id: storeProductTranslations.productId }).from(storeProductTranslations).where(like(storeProductTranslations.name, pattern)),
          ),
        ),
      )
    : isNull(storeProducts.deletedAt);
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
        <AdminSearch placeholder="Search products by name, brand, slug or SKU…" />
        {q && (
          <p className="mt-2 text-xs text-on-surface-variant">
            {total} {total === 1 ? "product matches" : "products match"} “{q}”
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
          {rows.length === 0 && <EmptyRow colSpan={8}>{q ? `No products match “${q}”.` : "No products yet."}</EmptyRow>}
        </tbody>
      </Table>
      <Pagination basePath="/admin/store/products" params={{ q: q || undefined }} page={page} total={total} />
    </div>
  );
}
