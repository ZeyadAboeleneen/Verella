import Link from "@/components/LocaleLink";
import { and, asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, storeCategories, storeCategoryTranslations, media } from "@verella/db";
import { Button } from "@/components/ui/button";
import { SectionTabs } from "@/components/admin/section-tabs";
import { CategoriesReorderList } from "@/components/admin/categories-reorder-list";
import { deleteStoreCategoryAction, toggleStoreCategoryActiveAction, reorderStoreCategoriesAction } from "@/lib/store/actions";

export default async function AdminStoreCategoriesPage() {
  const rows = await db
    .select({
      id: storeCategories.id,
      slug: storeCategories.slug,
      isActive: storeCategories.isActive,
      name: storeCategoryTranslations.name,
      imageUrl: media.url,
    })
    .from(storeCategories)
    .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
    .leftJoin(media, eq(media.id, storeCategories.imageMediaId))
    .orderBy(asc(storeCategories.sortOrder));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Store</h1>
        <Button asChild>
          <Link href="/admin/store/categories/new">
            <Plus size={16} /> New category
          </Link>
        </Button>
      </div>

      <SectionTabs
        tabs={[
          { label: "Categories", href: "/admin/store" },
          { label: "Products", href: "/admin/store/products" },
        ]}
      />

      <div className="mt-6">
        <CategoriesReorderList
          items={rows.map((c) => ({ id: c.id, name: c.name ?? c.slug, imageUrl: c.imageUrl, isActive: c.isActive }))}
          reorderAction={reorderStoreCategoriesAction}
          toggleActiveAction={toggleStoreCategoryActiveAction}
          deleteAction={deleteStoreCategoryAction}
          editHrefBase="/admin/store/categories"
        />
      </div>
    </div>
  );
}
