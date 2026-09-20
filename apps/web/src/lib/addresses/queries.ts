import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, addresses, customers } from "@verella/db";

export interface SavedAddressView {
  id: number;
  label: string | null;
  recipientName: string;
  phone: string;
  governorate: string;
  city: string | null;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  isDefault: boolean;
}

/** A logged-in customer's saved addresses, most-recently-default first, for the checkout picker. */
export async function getCustomerAddresses(userId: number): Promise<SavedAddressView[]> {
  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  if (!customer) return [];

  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customer.id))
    .orderBy(desc(addresses.isDefault), desc(addresses.id));

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    recipientName: r.recipientName,
    phone: r.phone,
    governorate: r.governorate,
    city: r.city,
    area: r.area,
    street: r.street,
    building: r.building,
    floor: r.floor,
    apartment: r.apartment,
    landmark: r.landmark,
    isDefault: r.isDefault,
  }));
}
