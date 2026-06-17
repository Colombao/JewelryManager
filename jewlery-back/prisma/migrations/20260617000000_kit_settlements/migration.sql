-- CreateTable
CREATE TABLE `KitSettlement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitId` INTEGER NOT NULL,
    `resellerId` INTEGER NULL,
    `amountDue` DECIMAL(10, 2) NOT NULL,
    `soldValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `lostValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `returnedValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `soldCount` INTEGER NOT NULL DEFAULT 0,
    `lostCount` INTEGER NOT NULL DEFAULT 0,
    `returnedCount` INTEGER NOT NULL DEFAULT 0,
    `commissionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `commissionAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `finalizedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KitSettlement_kitId_key`(`kitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KitSettlementEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settlementId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KitSettlement` ADD CONSTRAINT `KitSettlement_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KitSettlement` ADD CONSTRAINT `KitSettlement_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KitSettlementEvent` ADD CONSTRAINT `KitSettlementEvent_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `KitSettlement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
