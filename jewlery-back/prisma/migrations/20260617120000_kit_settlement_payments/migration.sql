-- CreateTable
CREATE TABLE `KitSettlementPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settlementId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'informado',
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KitSettlementPayment` ADD CONSTRAINT `KitSettlementPayment_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `KitSettlement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
