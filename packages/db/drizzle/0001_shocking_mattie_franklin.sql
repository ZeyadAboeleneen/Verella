CREATE TABLE `menu_item_sizes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`item_id` bigint unsigned NOT NULL,
	`size` varchar(32) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_item_sizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `menu_items` MODIFY COLUMN `price` decimal(12,2);--> statement-breakpoint
ALTER TABLE `menu_item_sizes` ADD CONSTRAINT `menu_item_sizes_item_id_menu_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `menu_item_sizes_item_idx` ON `menu_item_sizes` (`item_id`);--> statement-breakpoint
-- Backfill: every existing menu item gets a single "Regular" size row carrying
-- its old flat price, so nothing on the public menu or in the admin loses its
-- price after this migration. The legacy `menu_items.price` column is left in
-- place (now nullable, no longer written to) rather than dropped.
INSERT INTO `menu_item_sizes` (`item_id`, `size`, `price`, `sort_order`)
SELECT `id`, 'Regular', `price`, 0
FROM `menu_items`
WHERE `price` IS NOT NULL;