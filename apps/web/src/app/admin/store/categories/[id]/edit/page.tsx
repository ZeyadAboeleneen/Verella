import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, storeCategories, storeCategoryTranslations, media } from "@verella/db";
import { StoreCategoryForm } from "@/components/admin/store/category-form";

export default async function EditStoreCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = Number(id);

  const [category] = await db.select().from(storeCategories).where(eq(storeCategories.id, categoryId)).limit(1);
  if (!category) notFound();

  const translations = await db.select().from(storeCategoryTranslations).where(eq(storeCategoryTranslations.categoryId, categoryId));
  const en = translations.find((t) => t.locale === "en");
  const ar = translations.find((t) => t.locale === "ar");

  let image: { id: number; url: string } | null = null;
  if (category.imageMediaId) {
    const [row] = await db.select({ id: media.id, url: media.url }).from(media).where(eq(media.id, category.imageMediaId)).limit(1);
    if (row) image = row;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit Store Category</h1>
      <StoreCategoryForm
        categoryId={categoryId}
        defaultValues={{
          slug: category.slug,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          name: { en: en?.name ?? "", ar: ar?.name ?? "" },
          description: { en: en?.description ?? "", ar: ar?.description ?? "" },
          image,
        }}
      />
    </div>
  );
}
