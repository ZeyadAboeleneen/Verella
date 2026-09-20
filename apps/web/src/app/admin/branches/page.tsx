import { asc } from "drizzle-orm";
import { db, branchLocations } from "@verella/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { BranchesManager } from "@/components/admin/branches/branches-manager";

export default async function AdminBranchesPage() {
  const rows = await withDbTimeout(db.select().from(branchLocations).orderBy(asc(branchLocations.id))).catch(() => null);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Branches</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        The list of locations shown on your public Branches page. Add a name and a Google Maps link — address and hours
        are optional.
      </p>

      <div className="mt-6">
        {rows === null ? (
          <p className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
            Couldn&apos;t reach the database — refresh the page to try again.
          </p>
        ) : (
          <BranchesManager
            items={rows.map((b) => ({
              id: b.id,
              name: b.name,
              nameAr: b.nameAr,
              address: b.address,
              addressAr: b.addressAr,
              hours: b.hours,
              mapUrl: b.mapUrl,
            }))}
          />
        )}
      </div>
    </div>
  );
}
