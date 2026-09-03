CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`party_type` text NOT NULL,
	`party_id` integer NOT NULL,
	`direction` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_date` integer NOT NULL,
	`method` text,
	`notes` text,
	`sale_id` integer,
	`purchase_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_party_idx` ON `payments` (`party_type`,`party_id`);--> statement-breakpoint
CREATE INDEX `payments_payment_date_idx` ON `payments` (`payment_date`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`sku` text NOT NULL,
	`purchase_price_cents` integer,
	`selling_price_cents` integer,
	`current_stock` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_combo_unique` ON `product_variants` (`product_id`,`size`,`color`);--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `variant_id` integer REFERENCES product_variants(id);--> statement-breakpoint
ALTER TABLE `purchase_return_items` ADD `variant_id` integer REFERENCES product_variants(id);--> statement-breakpoint
ALTER TABLE `purchases` ADD `amount_paid_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `variant_id` integer REFERENCES product_variants(id);--> statement-breakpoint
ALTER TABLE `sale_return_items` ADD `variant_id` integer REFERENCES product_variants(id);--> statement-breakpoint
ALTER TABLE `sales` ADD `amount_paid_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `variant_id` integer REFERENCES product_variants(id);--> statement-breakpoint
INSERT INTO `product_variants` (`product_id`, `size`, `color`, `sku`, `purchase_price_cents`, `selling_price_cents`, `current_stock`, `low_stock_threshold`, `is_active`, `created_at`, `updated_at`)
SELECT `id`, '', '', `sku`, NULL, NULL, `current_stock`, NULL, `is_active`, `created_at`, `updated_at` FROM `products`;--> statement-breakpoint
UPDATE `purchase_items` SET `variant_id` = (SELECT `v`.`id` FROM `product_variants` `v` WHERE `v`.`product_id` = `purchase_items`.`product_id` ORDER BY `v`.`id` LIMIT 1) WHERE `variant_id` IS NULL;--> statement-breakpoint
UPDATE `sale_items` SET `variant_id` = (SELECT `v`.`id` FROM `product_variants` `v` WHERE `v`.`product_id` = `sale_items`.`product_id` ORDER BY `v`.`id` LIMIT 1) WHERE `variant_id` IS NULL;--> statement-breakpoint
UPDATE `purchase_return_items` SET `variant_id` = (SELECT `v`.`id` FROM `product_variants` `v` WHERE `v`.`product_id` = `purchase_return_items`.`product_id` ORDER BY `v`.`id` LIMIT 1) WHERE `variant_id` IS NULL;--> statement-breakpoint
UPDATE `sale_return_items` SET `variant_id` = (SELECT `v`.`id` FROM `product_variants` `v` WHERE `v`.`product_id` = `sale_return_items`.`product_id` ORDER BY `v`.`id` LIMIT 1) WHERE `variant_id` IS NULL;--> statement-breakpoint
UPDATE `stock_movements` SET `variant_id` = (SELECT `v`.`id` FROM `product_variants` `v` WHERE `v`.`product_id` = `stock_movements`.`product_id` ORDER BY `v`.`id` LIMIT 1) WHERE `variant_id` IS NULL;--> statement-breakpoint
UPDATE `sales` SET `amount_paid_cents` = `total_amount_cents`;--> statement-breakpoint
UPDATE `purchases` SET `amount_paid_cents` = `total_amount_cents`;
--> statement-breakpoint
INSERT INTO `payments` (`party_type`, `party_id`, `direction`, `amount_cents`, `payment_date`, `method`, `notes`, `sale_id`)
SELECT 'customer', `s`.`customer_id`, 'in',
       `s`.`total_amount_cents` - coalesce((SELECT sum(`r`.`total_amount_cents`) FROM `sale_returns` `r` WHERE `r`.`sale_id` = `s`.`id`), 0),
       `s`.`sale_date`, `s`.`payment_method`, 'Paid with sale', `s`.`id`
FROM `sales` `s`
WHERE `s`.`customer_id` IS NOT NULL
  AND `s`.`total_amount_cents` - coalesce((SELECT sum(`r`.`total_amount_cents`) FROM `sale_returns` `r` WHERE `r`.`sale_id` = `s`.`id`), 0) > 0;--> statement-breakpoint
INSERT INTO `payments` (`party_type`, `party_id`, `direction`, `amount_cents`, `payment_date`, `method`, `notes`, `purchase_id`)
SELECT 'supplier', `p`.`supplier_id`, 'out',
       `p`.`total_amount_cents` - coalesce((SELECT sum(`r`.`total_amount_cents`) FROM `purchase_returns` `r` WHERE `r`.`purchase_id` = `p`.`id`), 0),
       `p`.`purchase_date`, NULL, 'Paid with purchase', `p`.`id`
FROM `purchases` `p`
WHERE `p`.`supplier_id` IS NOT NULL
  AND `p`.`total_amount_cents` - coalesce((SELECT sum(`r`.`total_amount_cents`) FROM `purchase_returns` `r` WHERE `r`.`purchase_id` = `p`.`id`), 0) > 0;
