-- CreateTable
CREATE TABLE `CommissionTier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(120) NOT NULL,
    `maxAmount` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(5, 4) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KitItemUnit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitItemId` INTEGER NOT NULL,
    `unitIndex` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `soldByOwner` BOOLEAN NOT NULL DEFAULT false,
    `soldByReseller` BOOLEAN NOT NULL DEFAULT false,
    `missingOrLost` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KitItemUnit_kitItemId_unitIndex_key`(`kitItemId`, `unitIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KitItemUnit` ADD CONSTRAINT `KitItemUnit_kitItemId_fkey` FOREIGN KEY (`kitItemId`) REFERENCES `KitItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
