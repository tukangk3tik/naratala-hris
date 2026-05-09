CREATE TABLE `company_settings` (
	`id` bigint unsigned NOT NULL,
	`default_working_days` smallint NOT NULL DEFAULT 62,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`label` varchar(120) NOT NULL,
	`recurring_annually` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`),
	CONSTRAINT `holidays_date_label_unique` UNIQUE(`date`,`label`)
);
--> statement-breakpoint
CREATE TABLE `leave_policies` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`leave_type` enum('vacation','sick','personal','bereavement','parental','unpaid') NOT NULL,
	`default_days_per_year` decimal(5,2) NOT NULL,
	`is_paid` boolean NOT NULL,
	`affects_balance` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leave_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_policies_type_unique` UNIQUE(`leave_type`)
);
--> statement-breakpoint
CREATE TABLE `leave_quotas` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`leave_type` enum('vacation','sick','personal','bereavement','parental','unpaid') NOT NULL,
	`days_per_year` decimal(5,2) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leave_quotas_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_quotas_emp_type_unique` UNIQUE(`employee_id`,`leave_type`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`actor_user_id` bigint unsigned NOT NULL,
	`leave_type` enum('vacation','sick','personal','bereavement','parental','unpaid') NOT NULL,
	`from_date` date NOT NULL,
	`to_date` date NOT NULL,
	`days` decimal(5,2) NOT NULL,
	`reason` varchar(500),
	`status` enum('pending','approved','declined','cancelled') NOT NULL DEFAULT 'pending',
	`decided_by_user_id` bigint unsigned,
	`decided_at` datetime(3),
	`decision_note` varchar(500),
	`cancelled_by_user_id` bigint unsigned,
	`cancelled_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employees` ADD `working_days` smallint;--> statement-breakpoint
CREATE INDEX `holidays_date_idx` ON `holidays` (`date`);--> statement-breakpoint
CREATE INDEX `leave_requests_emp_from_idx` ON `leave_requests` (`employee_id`,`from_date`);--> statement-breakpoint
CREATE INDEX `leave_requests_status_from_idx` ON `leave_requests` (`status`,`from_date`);--> statement-breakpoint
CREATE INDEX `leave_requests_from_idx` ON `leave_requests` (`from_date`);--> statement-breakpoint
INSERT INTO `company_settings` (`id`, `default_working_days`) VALUES (1, 62);--> statement-breakpoint
INSERT INTO `leave_policies` (`leave_type`, `default_days_per_year`, `is_paid`, `affects_balance`) VALUES
  ('vacation',    20.00, 1, 1),
  ('sick',        10.00, 1, 1),
  ('personal',     5.00, 1, 1),
  ('bereavement',  3.00, 1, 1),
  ('parental',    90.00, 1, 1),
  ('unpaid',       0.00, 0, 0);