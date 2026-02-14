-- AlterTable: Add new columns, migrate data from insuranceNumber, then drop insuranceNumber
ALTER TABLE `Insurance` ADD COLUMN `membershipNumber` VARCHAR(191) NULL;
ALTER TABLE `Insurance` ADD COLUMN `contractNumber` VARCHAR(191) NULL;

UPDATE `Insurance` SET `membershipNumber` = `insuranceNumber`, `contractNumber` = '' WHERE `membershipNumber` IS NULL;

ALTER TABLE `Insurance` MODIFY COLUMN `membershipNumber` VARCHAR(191) NOT NULL;
ALTER TABLE `Insurance` MODIFY COLUMN `contractNumber` VARCHAR(191) NOT NULL;

ALTER TABLE `Insurance` DROP COLUMN `insuranceNumber`;
