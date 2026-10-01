CREATE TABLE `order_notifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`channel` varchar(20) NOT NULL,
	`kind` varchar(30) NOT NULL,
	`status` varchar(20) NOT NULL,
	`recipient` varchar(64),
	`provider_message_id` varchar(128),
	`attempts` int NOT NULL DEFAULT 1,
	`last_error` varchar(255),
	`attempted_at` timestamp NOT NULL DEFAULT (now()),
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_notifications_order_channel_kind_unique` UNIQUE(`order_id`,`channel`,`kind`)
);
--> statement-breakpoint
ALTER TABLE `order_notifications` ADD CONSTRAINT `order_notifications_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_notifications_status_idx` ON `order_notifications` (`status`);