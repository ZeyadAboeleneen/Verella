import "server-only";
import { and, asc, isNotNull, isNull, ne } from "drizzle-orm";
import { db, storeProducts } from "@verella/db";

/** Distinct brand names in the catalog, for the product form's suggestions. */
export async function getCatalogBrands(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand: storeProducts.brand })
    .from(storeProducts)
    .where(and(isNotNull(storeProducts.brand), ne(storeProducts.brand, ""), isNull(storeProducts.deletedAt)))
    .orderBy(asc(storeProducts.brand));
  return rows.map((r) => r.brand!).filter(Boolean);
}
