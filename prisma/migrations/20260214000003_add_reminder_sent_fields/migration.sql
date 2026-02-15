-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `reminder1DaySentAt` DATETIME(3) NULL,
    ADD COLUMN `reminder1HourSentAt` DATETIME(3) NULL;
