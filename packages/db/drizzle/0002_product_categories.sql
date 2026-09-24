CREATE TABLE `store_product_categories` (
	`product_id` bigint unsigned NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	CONSTRAINT `store_product_categories_product_id_category_id_pk` PRIMARY KEY(`product_id`,`category_id`)
);
--> statement-breakpoint
ALTER TABLE `store_product_categories` ADD CONSTRAINT `store_product_categories_product_id_store_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `store_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_product_categories` ADD CONSTRAINT `store_product_categories_category_id_store_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `store_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_product_categories_category_idx` ON `store_product_categories` (`category_id`);