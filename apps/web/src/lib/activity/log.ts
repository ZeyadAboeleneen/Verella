import "server-only";
import { db, activityLogs } from "@verella/db";

/**
 * Wired into the highest-value mutations for Phase 1 (order status, payment
 * review, user role/status changes). Not yet called from every admin action
 * — extending coverage to the rest of the CRUD actions is a straightforward
 * follow-up (same one-line call at the end of each action).
 */
export async function logActivity(params: {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId?: number;
  changes?: Record<string, unknown>;
}) {
  await db.insert(activityLogs).values({
    actorUserId: params.actorUserId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    changes: params.changes ?? null,
  });
}
