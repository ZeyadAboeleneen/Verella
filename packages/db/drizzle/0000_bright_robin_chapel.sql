CREATE TABLE `branches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`code` varchar(32) NOT NULL,
	`name` varchar(191) NOT NULL,
	`address` varchar(255),
	`phone` varchar(32),
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Cairo',
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` bigint unsigned,
	`changes` json,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_resets_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`group` varchar(100) NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` bigint unsigned NOT NULL,
	`permission_id` bigint unsigned NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`is_system` boolean NOT NULL DEFAULT false,
	`description` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_unique` UNIQUE(`user_id`,`role_id`,`branch_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`email` varchar(191) NOT NULL,
	`phone` varchar(32),
	`password_hash` varchar(255),
	`full_name` varchar(191) NOT NULL,
	`avatar_media_id` bigint unsigned,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`email_verified_at` timestamp,
	`phone_verified_at` timestamp,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`customer_id` bigint unsigned,
	`guest_token` varchar(64),
	`label` varchar(100),
	`recipient_name` varchar(191) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`governorate` varchar(100) NOT NULL,
	`city` varchar(100),
	`area` varchar(100),
	`street` varchar(255) NOT NULL,
	`building` varchar(50),
	`floor` varchar(20),
	`apartment` varchar(20),
	`landmark` varchar(255),
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`user_id` bigint unsigned NOT NULL,
	`loyalty_points` int NOT NULL DEFAULT 0,
	`notes` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`disk` varchar(32) NOT NULL DEFAULT 'minio',
	`bucket` varchar(100) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`mime` varchar(100) NOT NULL,
	`width` int,
	`height` int,
	`size_bytes` bigint unsigned,
	`alt` varchar(255),
	`title` varchar(255),
	`folder` varchar(100),
	`uploaded_by` bigint unsigned,
	`is_private` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`slug` varchar(150) NOT NULL,
	`icon` varchar(100),
	`image_media_id` bigint unsigned,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `menu_category_translations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`locale` char(5) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(500),
	CONSTRAINT `menu_category_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_category_translations_unique` UNIQUE(`category_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `menu_hero_images` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`media_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_hero_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_item_translations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`item_id` bigint unsigned NOT NULL,
	`locale` char(5) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(500),
	`notes` varchar(255),
	CONSTRAINT `menu_item_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_item_translations_unique` UNIQUE(`item_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`category_id` bigint unsigned NOT NULL,
	`slug` varchar(150) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`image_media_id` bigint unsigned,
	`badge` varchar(50),
	`is_featured` boolean NOT NULL DEFAULT false,
	`is_new` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_items_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `store_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`slug` varchar(150) NOT NULL,
	`image_media_id` bigint unsigned,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `store_category_translations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`locale` char(5) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(500),
	CONSTRAINT `store_category_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_category_translations_unique` UNIQUE(`category_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `store_product_media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_primary` boolean NOT NULL DEFAULT false,
	CONSTRAINT `store_product_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_product_translations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`locale` char(5) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(1000),
	`notes` varchar(255),
	CONSTRAINT `store_product_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_product_translations_unique` UNIQUE(`product_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `store_products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`category_id` bigint unsigned NOT NULL,
	`slug` varchar(150) NOT NULL,
	`sku` varchar(64),
	`price` decimal(12,2) NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`compare_at_price` decimal(12,2),
	`is_best_seller` boolean NOT NULL DEFAULT false,
	`is_featured_home` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`stock_qty` int NOT NULL DEFAULT 0,
	`rating` decimal(2,1),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `store_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `store_products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `banner_translations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`banner_id` bigint unsigned NOT NULL,
	`locale` char(5) NOT NULL,
	`title` varchar(191),
	`subtitle` varchar(255),
	`cta_text` varchar(100),
	CONSTRAINT `banner_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `banner_translations_unique` UNIQUE(`banner_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `banners` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`media_id` bigint unsigned NOT NULL,
	`link_url` varchar(512),
	`placement` varchar(50) NOT NULL,
	`starts_at` timestamp,
	`ends_at` timestamp,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_blocks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`page` varchar(50) NOT NULL,
	`block_key` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL,
	`payload` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_blocks_page_key_unique` UNIQUE(`page`,`block_key`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`group` varchar(50) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_group_key_unique` UNIQUE(`group`,`key`)
);
--> statement-breakpoint
CREATE TABLE `discount_categories` (
	`discount_id` bigint unsigned NOT NULL,
	`store_category_id` bigint unsigned NOT NULL,
	CONSTRAINT `discount_categories_discount_id_store_category_id_pk` PRIMARY KEY(`discount_id`,`store_category_id`)
);
--> statement-breakpoint
CREATE TABLE `discount_products` (
	`discount_id` bigint unsigned NOT NULL,
	`store_product_id` bigint unsigned NOT NULL,
	CONSTRAINT `discount_products_discount_id_store_product_id_pk` PRIMARY KEY(`discount_id`,`store_product_id`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`name` varchar(191) NOT NULL,
	`type` varchar(20) NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`scope` varchar(20) NOT NULL,
	`code` varchar(50),
	`min_order_total` decimal(12,2),
	`max_uses` int,
	`per_user_limit` int,
	`used_count` int NOT NULL DEFAULT 0,
	`starts_at` timestamp NOT NULL,
	`ends_at` timestamp NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`branch_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `discounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`cart_id` bigint unsigned NOT NULL,
	`store_product_id` bigint unsigned NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price_snapshot` decimal(12,2) NOT NULL,
	`notes` varchar(255),
	`options` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`user_id` bigint unsigned,
	`guest_token` varchar(64),
	`branch_id` bigint unsigned,
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_redemptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`discount_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`amount` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_discounts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`discount_id` bigint unsigned,
	`code` varchar(50),
	`amount` decimal(12,2) NOT NULL,
	CONSTRAINT `order_discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`store_product_id` bigint unsigned,
	`name_snapshot` varchar(191) NOT NULL,
	`sku_snapshot` varchar(64),
	`unit_price` decimal(12,2) NOT NULL,
	`quantity` int NOT NULL,
	`line_total` decimal(12,2) NOT NULL,
	`options` json,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`status` varchar(30) NOT NULL,
	`note` varchar(255),
	`changed_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`order_number` varchar(32) NOT NULL,
	`customer_id` bigint unsigned,
	`guest_contact` json,
	`branch_id` bigint unsigned,
	`channel` varchar(20) NOT NULL DEFAULT 'web',
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`fulfillment_type` varchar(20) NOT NULL,
	`address_id` bigint unsigned,
	`subtotal` decimal(12,2) NOT NULL,
	`discount_total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`tax_total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`delivery_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
	`grand_total` decimal(12,2) NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`placed_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`config` json,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL DEFAULT (uuid()),
	`order_id` bigint unsigned NOT NULL,
	`method_id` bigint unsigned NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'EGP',
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`provider_ref` varchar(191),
	`proof_media_id` bigint unsigned,
	`reviewed_by` bigint unsigned,
	`reviewed_at` timestamp,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_image_media_id_media_id_fk` FOREIGN KEY (`image_media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_category_translations` ADD CONSTRAINT `menu_category_translations_category_id_menu_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_hero_images` ADD CONSTRAINT `menu_hero_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_item_translations` ADD CONSTRAINT `menu_item_translations_item_id_menu_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_category_id_menu_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_image_media_id_media_id_fk` FOREIGN KEY (`image_media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_categories` ADD CONSTRAINT `store_categories_image_media_id_media_id_fk` FOREIGN KEY (`image_media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_category_translations` ADD CONSTRAINT `store_category_translations_category_id_store_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `store_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_product_media` ADD CONSTRAINT `store_product_media_product_id_store_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `store_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_product_media` ADD CONSTRAINT `store_product_media_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_product_translations` ADD CONSTRAINT `store_product_translations_product_id_store_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `store_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_products` ADD CONSTRAINT `store_products_category_id_store_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `store_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `banner_translations` ADD CONSTRAINT `banner_translations_banner_id_banners_id_fk` FOREIGN KEY (`banner_id`) REFERENCES `banners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `banners` ADD CONSTRAINT `banners_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_categories` ADD CONSTRAINT `discount_categories_discount_id_discounts_id_fk` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_categories` ADD CONSTRAINT `discount_categories_store_category_id_store_categories_id_fk` FOREIGN KEY (`store_category_id`) REFERENCES `store_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_products` ADD CONSTRAINT `discount_products_discount_id_discounts_id_fk` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_products` ADD CONSTRAINT `discount_products_store_product_id_store_products_id_fk` FOREIGN KEY (`store_product_id`) REFERENCES `store_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_store_product_id_store_products_id_fk` FOREIGN KEY (`store_product_id`) REFERENCES `store_products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_redemptions` ADD CONSTRAINT `discount_redemptions_discount_id_discounts_id_fk` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_redemptions` ADD CONSTRAINT `discount_redemptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_redemptions` ADD CONSTRAINT `discount_redemptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_discounts` ADD CONSTRAINT `order_discounts_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_discounts` ADD CONSTRAINT `order_discounts_discount_id_discounts_id_fk` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_store_product_id_store_products_id_fk` FOREIGN KEY (`store_product_id`) REFERENCES `store_products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_address_id_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_method_id_payment_methods_id_fk` FOREIGN KEY (`method_id`) REFERENCES `payment_methods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_proof_media_id_media_id_fk` FOREIGN KEY (`proof_media_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_logs_entity_idx` ON `activity_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_actor_idx` ON `activity_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_tokens_identifier_idx` ON `verification_tokens` (`identifier`);--> statement-breakpoint
CREATE INDEX `addresses_customer_idx` ON `addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `addresses_guest_idx` ON `addresses` (`guest_token`);--> statement-breakpoint
CREATE INDEX `menu_items_category_idx` ON `menu_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `store_product_media_product_idx` ON `store_product_media` (`product_id`);--> statement-breakpoint
CREATE INDEX `store_products_category_idx` ON `store_products` (`category_id`);--> statement-breakpoint
CREATE INDEX `content_blocks_page_idx` ON `content_blocks` (`page`);--> statement-breakpoint
CREATE INDEX `cart_items_cart_idx` ON `cart_items` (`cart_id`);--> statement-breakpoint
CREATE INDEX `carts_user_idx` ON `carts` (`user_id`);--> statement-breakpoint
CREATE INDEX `carts_guest_idx` ON `carts` (`guest_token`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_status_history_order_idx` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_branch_idx` ON `orders` (`branch_id`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);