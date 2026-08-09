-- AlterTable
ALTER TABLE `Product` ADD COLUMN `trioGroupId` VARCHAR(36) NULL,
    ADD COLUMN `trioSize` VARCHAR(8) NULL;

-- CreateIndex
CREATE INDEX `Product_trioGroupId_idx` ON `Product`(`trioGroupId`);
