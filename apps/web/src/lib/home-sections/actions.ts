"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db, settings } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { SETTINGS_CACHE_TAG } from "@/lib/settings/queries";
import type { HomeFeature, HomeFeatureText } from "./types";

const clean = (t: HomeFeatureText): HomeFeatureText => ({
  eyebrow: t.eyebrow.trim().slice(0, 60),
  title: t.title.trim().slice(0, 120),
  body: t.body.trim().slice(0, 400),
  cta: t.cta.trim().slice(0, 60),
});

export async function saveHomeFeaturesAction(items: HomeFeature[]): Promise<ActionResult> {
  const guard = await guardPermission("settings.manage");
  if ("error" in guard) return guard;

  const cleaned = items.slice(0, 10).map((f) => ({
    categorySlug: f.categorySlug.trim(),
    // Only links inside this site ("/…"), never "//other-site".
    href: /^\/(?!\/)/.test(f.href.trim()) ? f.href.trim().slice(0, 300) : "",
    image: f.image ? { id: f.image.id, url: f.image.url } : null,
    ar: clean(f.ar),
    en: clean(f.en),
  }));
  for (const [i, f] of cleaned.entries()) {
    if (!f.categorySlug) return { error: `Section ${i + 1}: choose the category its button opens.` };
    if (!f.ar.title && !f.en.title) return { error: `Section ${i + 1}: add a title (Arabic or English).` };
  }

  const value = { items: cleaned };
  await db.insert(settings).values({ group: "site", key: "home_features", value }).onDuplicateKeyUpdate({ set: { value } });
  await logActivity({ actorUserId: Number(guard.id), action: "home_sections.updated", entityType: "settings" });
  updateTag(SETTINGS_CACHE_TAG);
  revalidatePath("/admin/home-sections");
  revalidatePath("/", "layout");
  return { success: true };
}
