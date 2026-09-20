import Link from "next/link";
import { and, asc, eq, isNull, inArray } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";
import { db, menuItems, menuItemTranslations, menuItemSizes, menuCategories } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { SectionTabs } from "@/components/admin/section-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteMenuItemAction } from "@/lib/menu/actions";

function priceRangeLabel(prices: string[]): string {
  if (prices.length === 0) return "—";
  const cents = prices.map((p) => toCents(p));
  const min = Math.min(...cents);
  const max = Math.max(...cents);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

export default async function AdminMenuItemsPage() {
  const rows = await db
    .select({
      id: menuItems.id,
      slug: menuItems.slug,
      isActive: menuItems.isActive,
      isFeatured: menuItems.isFeatured,
      isNew: menuItems.isNew,
      name: menuItemTranslations.name,
      categoryName: menuCategories.slug,
    })
    .from(menuItems)
    .leftJoin(menuItemTranslations, and(eq(menuItemTranslations.itemId, menuItems.id), eq(menuItemTranslations.locale, "en")))
    .leftJoin(menuCategories, eq(menuCategories.id, menuItems.categoryId))
    .where(isNull(menuItems.deletedAt))
    .orderBy(asc(menuItems.categoryId), asc(menuItems.sortOrder));

  const itemIds = rows.map((r) => r.id);
  const sizeRows = itemIds.length
    ? await db.select({ itemId: menuItemSizes.itemId, price: menuItemSizes.price }).from(menuItemSizes).where(inArray(menuItemSizes.itemId, itemIds))
    : [];
  const pricesByItem = new Map<number, string[]>();
  for (const s of sizeRows) {
    pricesByItem.set(s.itemId, [...(pricesByItem.get(s.itemId) ?? []), s.price]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Menu</h1>
        <Button asChild>
          <Link href="/admin/menu/items/new">
            <Plus size={16} /> New item
          </Link>
        </Button>
      </div>

      <SectionTabs
        tabs={[
          { label: "Categories", href: "/admin/menu" },
          { label: "Items", href: "/admin/menu/items" },
          { label: "Hero Images", href: "/admin/menu/hero" },
        ]}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Flags</Th>
            <Th>Status</Th>
            <Th className="text-end">Actions</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map((item) => (
            <Tr key={item.id}>
              <Td className="font-medium">{item.name ?? "—"}</Td>
              <Td className="text-on-surface-variant">{item.categoryName}</Td>
              <Td>{priceRangeLabel(pricesByItem.get(item.id) ?? [])}</Td>
              <Td className="space-x-1">
                {item.isFeatured && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs">Featured</span>}
                {item.isNew && <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs text-on-primary-container">New</span>}
              </Td>
              <Td>
                <span
                  className={
                    item.isActive
                      ? "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
                      : "rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
                  }
                >
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </Td>
              <Td className="text-end">
                <div className="flex items-center justify-end gap-3">
                  <Link href={`/admin/menu/items/${item.id}/edit`} className="text-on-surface-variant hover:text-primary">
                    <Pencil size={16} />
                  </Link>
                  <DeleteButton action={deleteMenuItemAction.bind(null, item.id)} />
                </div>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={6}>No menu items yet.</EmptyRow>}
        </tbody>
      </Table>
    </div>
  );
}
