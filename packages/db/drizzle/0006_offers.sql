CREATE TABLE `offers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title_ar` varchar(160) NOT NULL,
	`title_en` varchar(160) NOT NULL,
	`body_ar` text,
	`body_en` text,
	`highlight_ar` varchar(40),
	`highlight_en` varchar(40),
	`cta_label_ar` varchar(60),
	`cta_label_en` varchar(60),
	`link_url` varchar(500),
	`code` varchar(50),
	`image_media_id` bigint unsigned,
	`show_in_bar` boolean NOT NULL DEFAULT true,
	`show_in_cards` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`starts_at` timestamp,
	`ends_at` timestamp,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_image_media_id_media_id_fk` FOREIGN KEY (`image_media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;