import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, customers, addresses, orders } from "@verella/db";

export async function getOrCreateCustomer(userId: number) {
  const [existing] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(customers).values({ userId }).$returningId();
  const [created] = await db.select().from(customers).where(eq(customers.id, row.id)).limit(1);
  return created!;
}

export async function getCustomerOrders(customerId: number) {
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.placedAt));
}

export async function getCustomerAddresses(customerId: number) {
  return db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.isDefault));
}
