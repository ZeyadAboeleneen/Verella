import Link from "@/components/LocaleLink";
import { asc, desc, eq } from "drizzle-orm";
import { ImageOff, Pencil, Plus } from "lucide-react";
import { db, media, offers } from "@verella/db";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteOfferAction } from "@/lib/offers/actions";

const pill = (text: string, on: boolean) => (
  <span
    className={
      on
        ? "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
        : "rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
    }
  >
    {text}
  </span>
);

export default async function AdminOffersPage() {
  const rows = await db
    .select({ offer: offers, image: media.url })
    .from(offers)
    .leftJoin(media, eq(media.id, offers.imageMediaId))
    .orderBy(asc(offers.sortOrder), desc(offers.createdAt));
  // Server Component: re-executes per request, so this snapshot is correct.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Offers</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Announcements for the top bar and the home-page offer cards.</p>
        </div>
        <Button asChild>
          <Link href="/admin/offers/new">
            <Plus size={16} /> New offer
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Offer</Th>
              <Th>Shows in</Th>
              <Th>Code</Th>
              <Th>Window</Th>
              <Th>Status</Th>
              <Th className="text-end">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map(({ offer: o, image }) => {
              const ended = o.endsAt && new Date(o.endsAt).getTime() <= now;
              const scheduled = o.startsAt && new Date(o.startsAt).getTime() > now;
              const status = !o.isActive ? "Off" : ended ? "Ended" : scheduled ? "Scheduled" : "Live";
              return (
                <Tr key={o.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImageOff size={16} className="text-on-surface-variant" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{o.titleEn}</p>
                        <p className="truncate text-xs text-on-surface-variant" dir="rtl">
                          {o.titleAr}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {o.showInBar && pill("Top bar", true)}
                      {o.showInCards && pill("Home cards", true)}
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-on-surface-variant">{o.code ?? "—"}</Td>
                  <Td className="text-xs text-on-surface-variant">
                    {o.startsAt || o.endsAt
                      ? `${o.startsAt ? new Date(o.startsAt).toLocaleDateString() : "Now"} – ${o.endsAt ? new Date(o.endsAt).toLocaleDateString() : "No end"}`
                      : "Always"}
                  </Td>
                  <Td>{pill(status, status === "Live")}</Td>
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/offers/${o.id}/edit`} className="text-on-surface-variant hover:text-primary" aria-label="Edit">
                        <Pencil size={16} />
                      </Link>
                      <DeleteButton action={deleteOfferAction.bind(null, o.id)} confirmText="Delete this offer?" successMessage="Offer deleted." />
                    </div>
                  </Td>
                </Tr>
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={6}>No offers yet. Create one to show it in the top bar or on the home page.</EmptyRow>}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
