-- AlterTable: Add duration (minutes) to Service with default 30
ALTER TABLE `Service` ADD COLUMN `duration` INTEGER NOT NULL DEFAULT 30;
