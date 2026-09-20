import { relations } from "drizzle-orm";
import { users, roles, permissions, rolePermissions, userRoles } from "./auth";
import { customers, addresses } from "./customers";
import { media } from "./media";
import { menuCategories, menuCategoryTranslations, menuItems, menuItemTranslations, menuItemSizes } from "./menu";
import {
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
} from "./store";
import { discounts, discountProducts, discountCategories } from "./promotions";
import { carts, cartItems } from "./cart";
import { orders, orderItems, orderStatusHistory, orderDiscounts } from "./orders";
import { payments, paymentMethods } from "./payments";

export const usersRelations = relations(users, ({ one, many }) => ({
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  addresses: many(addresses),
  orders: many(orders),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ many }) => ({
  translations: many(menuCategoryTranslations),
  items: many(menuItems),
}));

export const menuCategoryTranslationsRelations = relations(menuCategoryTranslations, ({ one }) => ({
  category: one(menuCategories, { fields: [menuCategoryTranslations.categoryId], references: [menuCategories.id] }),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
  image: one(media, { fields: [menuItems.imageMediaId], references: [media.id] }),
  translations: many(menuItemTranslations),
  sizes: many(menuItemSizes),
}));

export const menuItemTranslationsRelations = relations(menuItemTranslations, ({ one }) => ({
  item: one(menuItems, { fields: [menuItemTranslations.itemId], references: [menuItems.id] }),
}));

export const menuItemSizesRelations = relations(menuItemSizes, ({ one }) => ({
  item: one(menuItems, { fields: [menuItemSizes.itemId], references: [menuItems.id] }),
}));

export const storeCategoriesRelations = relations(storeCategories, ({ many }) => ({
  translations: many(storeCategoryTranslations),
  products: many(storeProducts),
}));

export const storeCategoryTranslationsRelations = relations(storeCategoryTranslations, ({ one }) => ({
  category: one(storeCategories, {
    fields: [storeCategoryTranslations.categoryId],
    references: [storeCategories.id],
  }),
}));

export const storeProductsRelations = relations(storeProducts, ({ one, many }) => ({
  category: one(storeCategories, { fields: [storeProducts.categoryId], references: [storeCategories.id] }),
  translations: many(storeProductTranslations),
  media: many(storeProductMedia),
  discountProducts: many(discountProducts),
}));

export const storeProductTranslationsRelations = relations(storeProductTranslations, ({ one }) => ({
  product: one(storeProducts, { fields: [storeProductTranslations.productId], references: [storeProducts.id] }),
}));

export const storeProductMediaRelations = relations(storeProductMedia, ({ one }) => ({
  product: one(storeProducts, { fields: [storeProductMedia.productId], references: [storeProducts.id] }),
  media: one(media, { fields: [storeProductMedia.mediaId], references: [media.id] }),
}));

export const discountsRelations = relations(discounts, ({ many }) => ({
  discountProducts: many(discountProducts),
  discountCategories: many(discountCategories),
}));

export const discountProductsRelations = relations(discountProducts, ({ one }) => ({
  discount: one(discounts, { fields: [discountProducts.discountId], references: [discounts.id] }),
  product: one(storeProducts, { fields: [discountProducts.storeProductId], references: [storeProducts.id] }),
}));

export const discountCategoriesRelations = relations(discountCategories, ({ one }) => ({
  discount: one(discounts, { fields: [discountCategories.discountId], references: [discounts.id] }),
  category: one(storeCategories, { fields: [discountCategories.storeCategoryId], references: [storeCategories.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(storeProducts, { fields: [cartItems.storeProductId], references: [storeProducts.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  discounts: many(orderDiscounts),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(storeProducts, { fields: [orderItems.storeProductId], references: [storeProducts.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  method: one(paymentMethods, { fields: [payments.methodId], references: [paymentMethods.id] }),
  proof: one(media, { fields: [payments.proofMediaId], references: [media.id] }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  payments: many(payments),
}));
