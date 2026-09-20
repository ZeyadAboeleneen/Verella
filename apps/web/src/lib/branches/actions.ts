"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, branchLocations } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";

export interface BranchInput {
  name: string;
  nameAr?: string;
  address?: string;
  addressAr?: string;
  hours?: string;
  mapUrl?: string;
}

function validate(input: BranchInput): string | null {
  if (!input.name.trim()) return "Branch name is required.";
  if (input.mapUrl && input.mapUrl.trim() && !/^https?:\/\//.test(input.mapUrl.trim())) {
    return "The Google Maps link must be a full URL starting with https://";
  }
  return null;
}

function clean(input: BranchInput) {
  return {
    name: input.name.trim(),
    nameAr: input.nameAr?.trim() || null,
    address: input.address?.trim() || null,
    addressAr: input.addressAr?.trim() || null,
    hours: input.hours?.trim() || null,
    mapUrl: input.mapUrl?.trim() || null,
  };
}

function revalidateBranches() {
  revalidatePath("/admin/branches");
  revalidatePath("/branches");
}

export async function createBranchAction(input: BranchInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("branches.manage");
  if ("error" in guard) return guard;
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const [row] = await db.insert(branchLocations).values(clean(input)).$returningId();
  revalidateBranches();
  return { success: true, data: { id: row.id } };
}

export async function updateBranchAction(id: number, input: BranchInput): Promise<ActionResult> {
  const guard = await guardPermission("branches.manage");
  if ("error" in guard) return guard;
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  await db.update(branchLocations).set(clean(input)).where(eq(branchLocations.id, id));
  revalidateBranches();
  return { success: true };
}

export async function deleteBranchAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("branches.manage");
  if ("error" in guard) return guard;

  // Standalone table with no foreign keys pointing at it — always safe to delete.
  await db.delete(branchLocations).where(eq(branchLocations.id, id));
  revalidateBranches();
  return { success: true };
}
