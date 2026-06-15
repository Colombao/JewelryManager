-- AlterTable
ALTER TABLE `Kit` MODIFY `clientName` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'montado';

-- AlterTable
ALTER TABLE `Card` ADD COLUMN `kitId` INTEGER NULL,
    ADD COLUMN `resellerId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Card_kitId_key` ON `Card`(`kitId`);

-- AddForeignKey
ALTER TABLE `Card` ADD CONSTRAINT `Card_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Card` ADD CONSTRAINT `Card_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
