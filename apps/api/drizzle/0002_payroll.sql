CREATE TABLE `pay_runs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'IDR',
	`status` enum('draft','finalized','cancelled') NOT NULL DEFAULT 'draft',
	`notes` varchar(500),
	`total_gross` decimal(18,2),
	`total_net` decimal(18,2),
	`headcount` int unsigned,
	`created_by_user_id` bigint unsigned NOT NULL,
	`finalized_by_user_id` bigint unsigned,
	`finalized_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `pay_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`pay_run_id` bigint unsigned NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`gross_amount` decimal(14,2) NOT NULL,
	`deduction_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`net_amount` decimal(14,2) NOT NULL,
	`notes` varchar(500),
	`salary_snapshot` json NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payslips_id` PRIMARY KEY(`id`),
	CONSTRAINT `payslips_pay_run_emp_unique` UNIQUE(`pay_run_id`,`employee_id`)
);
--> statement-breakpoint
CREATE INDEX `pay_runs_status_idx` ON `pay_runs` (`status`);--> statement-breakpoint
CREATE INDEX `pay_runs_period_start_idx` ON `pay_runs` (`period_start`);--> statement-breakpoint
CREATE INDEX `payslips_pay_run_idx` ON `payslips` (`pay_run_id`);--> statement-breakpoint
CREATE INDEX `payslips_employee_idx` ON `payslips` (`employee_id`);