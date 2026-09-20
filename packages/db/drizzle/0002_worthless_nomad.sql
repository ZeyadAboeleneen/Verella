CREATE TABLE `user_permissions` (
	`user_id` bigint unsigned NOT NULL,
	`permission_id` bigint unsigned NOT NULL,
	CONSTRAINT `user_permissions_user_id_permission_id_pk` PRIMARY KEY(`user_id`,`permission_id`)
);
--> statement-breakpoint
ALTER TABLE `branches` ADD `map_url` varchar(512);--> statement-breakpoint
ALTER TABLE `branches` ADD `hours` varchar(191);--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT IGNORE INTO `permissions` (`slug`, `group`) VALUES ('branches.view', 'branches'), ('branches.manage', 'branches');--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p ON p.`slug` IN ('branches.view', 'branches.manage') WHERE r.`slug` IN ('super_admin', 'admin');--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p ON p.`slug` = 'branches.view' WHERE r.`slug` = 'manager';