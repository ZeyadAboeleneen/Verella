import type { PermissionSlug } from "@verella/core";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string; // lucide-react icon name
  permission: PermissionSlug;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Always reachable by any signed-in dashboard user, regardless of which specific permissions their role grants — there's no scenario where someone should be locked out of managing their own account. */
export const UNRESTRICTED_ADMIN_PATHS = ["/admin/account"];

/**
 * Looks up which permission a given /admin/* pathname requires, by matching
 * against ADMIN_NAV item hrefs (longest/most-specific href wins — so e.g.
 * "/admin/store/products/new" matches the "/admin/store" item's store.view
 * rather than the generic "/admin" dashboard item). Returns null if the path
 * doesn't require a specific permission — either it's in
 * UNRESTRICTED_ADMIN_PATHS, or it doesn't match any known admin route.
 */
export function getRequiredPermissionForPath(pathname: string): PermissionSlug | null {
  if (UNRESTRICTED_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const items = ADMIN_NAV.flatMap((group) => group.items).sort((a, b) => b.href.length - a.href.length);
  for (const item of items) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.permission;
    }
  }
  return null;
}

/** Where to send a signed-in dashboard user who lands somewhere their role doesn't cover — their first accessible page in nav order, falling back to the always-open account page rather than looping back to a "/admin" overview they may not have permission for either. */
export function getFirstAccessiblePath(userPermissions: string[]): string {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (userPermissions.includes(item.permission)) return item.href;
    }
  }
  return "/admin/account";
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: "LayoutDashboard", permission: "dashboard.view" }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Menu", href: "/admin/menu", icon: "Coffee", permission: "menu.view" },
      { label: "Store", href: "/admin/store", icon: "Store", permission: "store.view" },
      { label: "Discounts", href: "/admin/discounts", icon: "Percent", permission: "discounts.view" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "ShoppingBag", permission: "orders.view" },
      { label: "Payments", href: "/admin/payments", icon: "CreditCard", permission: "payments.view" },
      { label: "Customers", href: "/admin/customers", icon: "Users", permission: "customers.view" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Home Page", href: "/admin/content", icon: "Home", permission: "content.view" },
      { label: "About Page", href: "/admin/about", icon: "Info", permission: "content.view" },
      { label: "Media Library", href: "/admin/media", icon: "Image", permission: "media.view" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: "ShieldCheck", permission: "users.view" },
      { label: "Roles", href: "/admin/roles", icon: "KeyRound", permission: "roles.manage" },
      { label: "Branches", href: "/admin/branches", icon: "MapPin", permission: "branches.view" },
      { label: "Settings", href: "/admin/settings", icon: "Settings", permission: "settings.manage" },
      { label: "Activity Logs", href: "/admin/activity", icon: "History", permission: "activity.view" },
      // Every dashboard user (any role) can manage their own account.
      { label: "My Account", href: "/admin/account", icon: "UserCog", permission: "dashboard.view" },
    ],
  },
];
