-- AlterTable
ALTER TABLE `KitItem` ADD COLUMN `soldByOwner` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `soldByReseller` BOOLEAN NOT NULL DEFAULT false;
