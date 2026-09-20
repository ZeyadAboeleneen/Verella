import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db, branchLocations } from "@verella/db";
import type { Locale } from "@verella/core";

/** Raw bilingual row — both languages are always present so admin editing and locale switching never lose data. */
export interface BranchView {
  id: number;
  name: string;
  nameAr: string | null;
  address: string | null;
  addressAr: string | null;
  hours: string | null;
  mapUrl: string | null;
}

/** Fields resolved to a single display language, for public-facing rendering. */
export interface LocalizedBranch {
  id: number;
  name: string;
  address: string | null;
  hours: string | null;
  mapUrl: string | null;
}

/** Shown wherever branches render if none are configured yet (or the DB is briefly unreachable). */
export const FALLBACK_BRANCH: BranchView = {
  id: 0,
  name: "Mansoura Branch",
  nameAr: "فرع المنصورة",
  address: "Taksem Khattab, Mansoura",
  addressAr: "تقسيم خطاب، المنصورة",
  hours: "Open Daily",
  mapUrl: "https://maps.google.com/?q=Taksem+Khattab+Mansoura",
};

/**
 * Branches configured in Admin → Branches — used by the homepage locations
 * section, the footer, and the /branches page. The homepage renders both the
 * layout's footer AND the Locations section in the same request, each
 * independently calling this — React's cache() memoizes it per-request so
 * that's one DB round-trip instead of two, not a second identical query to
 * the remote host.
 */
export const getBranches = cache(async (): Promise<BranchView[]> => {
  return db
    .select({
      id: branchLocations.id,
      name: branchLocations.name,
      nameAr: branchLocations.nameAr,
      address: branchLocations.address,
      addressAr: branchLocations.addressAr,
      hours: branchLocations.hours,
      mapUrl: branchLocations.mapUrl,
    })
    .from(branchLocations)
    .orderBy(asc(branchLocations.id));
});

/** Picks the Arabic name/address when the site is in Arabic and one was set, falling back to English otherwise. */
export function localizeBranch(branch: BranchView, locale: Locale): LocalizedBranch {
  return {
    id: branch.id,
    name: (locale === "ar" && branch.nameAr) || branch.name,
    address: (locale === "ar" && branch.addressAr) || branch.address,
    hours: branch.hours,
    mapUrl: branch.mapUrl,
  };
}
