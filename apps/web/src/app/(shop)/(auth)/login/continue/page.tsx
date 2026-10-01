import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/rbac";

/**
 * Where a plain login lands: staff go to the dashboard, customers to their
 * account. A separate request so the fresh session cookie is readable — inside
 * the login action itself the new session isn't visible yet.
 */
export default async function LoginContinuePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.permissions.length > 0 ? "/admin" : "/account");
}
