import Link from "next/link";
import { and, asc, eq, count, isNull } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";
import { db, storeProducts, storeProductTranslations, storeCategories } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { SectionTabs } from "@/components/admin/section-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";
import { deleteStoreProductAction } from "@/lib/store/actions";

export default async function AdminStoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: storeProducts.id,
        price: storeProducts.price,
        currency: storeProducts.currency,
        stockQty: storeProducts.stockQty,
        isActive: storeProducts.isActive,
        isBestSeller: storeProducts.isBestSeller,
        isFeaturedHome: storeProducts.isFeaturedHome,
        name: storeProductTranslations.name,
        categoryName: storeCategories.slug,
      })
      .from(storeProducts)
      .leftJoin(storeProductTranslations, and(eq(storeProductTranslations.productId, storeProducts.id), eq(storeProductTranslations.locale, "en")))
      .leftJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
      .where(isNull(storeProducts.deletedAt))
      .orderBy(asc(storeProducts.categoryId), asc(storeProducts.sortOrder))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(storeProducts).where(isNull(storeProducts.deletedAt)),
  ]);

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
          { label: "Hero Images", href: "/admin/store/hero" },
        ]}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Stock</Th>
            <Th>Flags</Th>
            <Th>Status</Th>
            <Th className="text-end">Actions</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td className="font-medium">{p.name ?? "—"}</Td>
              <Td className="text-on-surface-variant">{p.categoryName}</Td>
              <Td>{formatMoney(toCents(p.price), p.currency)}</Td>
              <Td className={p.stockQty < 10 ? "font-semibold text-error" : "text-on-surface-variant"}>{p.stockQty}</Td>
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
          ))}
          {rows.length === 0 && <EmptyRow colSpan={7}>No products yet.</EmptyRow>}
        </tbody>
      </Table>
      <Pagination basePath="/admin/store/products" page={page} total={total} />
    </div>
  );
}
