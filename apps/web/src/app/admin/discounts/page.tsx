import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Pencil } from "lucide-react";
import { db, discounts } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteDiscountAction } from "@/lib/discounts/actions";

export default async function AdminDiscountsPage() {
  const rows = await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  // Server Component: re-executes fully per request, so this snapshot is
  // correct despite the lint rule's memoization-focused "purity" warning.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Discounts</h1>
        <Button asChild>
          <Link href="/admin/discounts/new">
            <Plus size={16} /> New discount
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Value</Th>
              <Th>Scope</Th>
              <Th>Window</Th>
              <Th>Status</Th>
              <Th className="text-end">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((d) => {
              const expired = new Date(d.endsAt).getTime() < now;
              return (
                <Tr key={d.id}>
                  <Td className="font-medium">{d.name}</Td>
                  <Td className="text-on-surface-variant">
                    {d.code ?? <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container">Automatic</span>}
                  </Td>
                  <Td>{d.type === "percent" ? `${d.value}%` : formatMoney(toCents(d.value))}</Td>
                  <Td className="text-on-surface-variant capitalize">{d.scope}</Td>
                  <Td className="text-on-surface-variant text-xs">
                    {new Date(d.startsAt).toLocaleDateString()} – {new Date(d.endsAt).toLocaleDateString()}
                  </Td>
                  <Td>
                    <span
                      className={
                        d.isActive && !expired
                          ? "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
                          : "rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
                      }
                    >
                      {expired ? "Expired" : d.isActive ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/discounts/${d.id}/edit`} className="text-on-surface-variant hover:text-primary">
                        <Pencil size={16} />
                      </Link>
                      <DeleteButton action={deleteDiscountAction.bind(null, d.id)} />
                    </div>
                  </Td>
                </Tr>
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={7}>No discounts yet.</EmptyRow>}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
