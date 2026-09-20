CREATE TABLE `branch_locations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`address` varchar(255),
	`hours` varchar(191),
	`map_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branch_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `branch_locations` (`name`, `address`, `hours`, `map_url`) VALUES ('Mansoura Branch', 'Taksem Khattab, Mansoura', 'Open Daily', 'https://maps.google.com/?q=Taksem+Khattab+Mansoura');
