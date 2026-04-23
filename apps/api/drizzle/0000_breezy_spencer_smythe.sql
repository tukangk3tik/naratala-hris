CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`actor_ip` varchar(45),
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(32) NOT NULL,
	`entity_id` bigint unsigned,
	`changes` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`full_name` varchar(160) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(32),
	`pronouns` varchar(32),
	`department_id` bigint unsigned NOT NULL,
	`position` varchar(120) NOT NULL,
	`location` varchar(120),
	`employment_type` enum('full_time','part_time','contract','intern') NOT NULL,
	`employment_status` enum('active','on_leave','terminated') NOT NULL DEFAULT 'active',
	`hire_date` date NOT NULL,
	`manager_id` bigint unsigned,
	`salary_amount` decimal(14,2),
	`salary_currency` char(3) NOT NULL DEFAULT 'IDR',
	`avatar_color_hue` smallint NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_email_unique` UNIQUE(`email`),
	CONSTRAINT `employees_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`email` varchar(255) NOT NULL,
	`role_to_assign` enum('admin','hr','manager','employee') NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`accepted_at` datetime(3),
	`created_by` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`ip` varchar(45) NOT NULL,
	`succeeded` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_resets_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`family_id` char(36) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`issued_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`replaced_by_id` bigint unsigned,
	`user_agent` varchar(255),
	`ip` varchar(45),
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','hr','manager','employee') NOT NULL,
	`status` enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
	`must_change_password` boolean NOT NULL DEFAULT false,
	`mfa_secret` varbinary(255),
	`mfa_enabled` boolean NOT NULL DEFAULT false,
	`language` enum('id','en') NOT NULL DEFAULT 'id',
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `employees_department_idx` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `employees_manager_idx` ON `employees` (`manager_id`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`employment_status`);--> statement-breakpoint
CREATE INDEX `employees_name_idx` ON `employees` (`full_name`);--> statement-breakpoint
CREATE INDEX `invites_expires_idx` ON `invites` (`expires_at`);--> statement-breakpoint
CREATE INDEX `invites_employee_idx` ON `invites` (`employee_id`);--> statement-breakpoint
CREATE INDEX `login_attempts_email_created_idx` ON `login_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_ip_created_idx` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE INDEX `password_resets_expires_idx` ON `password_resets` (`expires_at`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_family_idx` ON `refresh_tokens` (`family_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_expires_idx` ON `refresh_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);