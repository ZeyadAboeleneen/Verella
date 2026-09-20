import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, menuCategories, menuCategoryTranslations, media } from "@verella/db";
import { Button } from "@/components/ui/button";
import { SectionTabs } from "@/components/admin/section-tabs";
import { CategoriesReorderList } from "@/components/admin/categories-reorder-list";
import { deleteMenuCategoryAction, toggleMenuCategoryActiveAction, reorderMenuCategoriesAction } from "@/lib/menu/actions";

export default async function AdminMenuCategoriesPage() {
  const rows = await db
    .select({
      id: menuCategories.id,
      slug: menuCategories.slug,
      isActive: menuCategories.isActive,
      name: menuCategoryTranslations.name,
      imageUrl: media.url,
    })
    .from(menuCategories)
    .leftJoin(
      menuCategoryTranslations,
      and(eq(menuCategoryTranslations.categoryId, menuCategories.id), eq(menuCategoryTranslations.locale, "en")),
    )
    .leftJoin(media, eq(media.id, menuCategories.imageMediaId))
    .orderBy(asc(menuCategories.sortOrder));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Menu</h1>
        <Button asChild>
          <Link href="/admin/menu/categories/new">
            <Plus size={16} /> New category
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

      <div className="mt-6">
        <CategoriesReorderList
          items={rows.map((c) => ({ id: c.id, name: c.name ?? c.slug, imageUrl: c.imageUrl, isActive: c.isActive }))}
          reorderAction={reorderMenuCategoriesAction}
          toggleActiveAction={toggleMenuCategoryActiveAction}
          deleteAction={deleteMenuCategoryAction}
          editHrefBase="/admin/menu/categories"
        />
      </div>
    </div>
  );
}
