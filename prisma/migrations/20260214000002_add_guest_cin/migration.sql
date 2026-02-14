-- AlterTable: Add guestCin to Appointment (person admin is booking for)
ALTER TABLE `Appointment` ADD COLUMN `guestCin` VARCHAR(191) NULL;
