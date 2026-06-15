-- CreateTable
CREATE TABLE `Kit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitNumber` INTEGER NOT NULL,
    `nature` VARCHAR(191) NOT NULL DEFAULT 'Venda',
    `issueDate` DATETIME(3) NOT NULL,
    `returnDate` DATETIME(3) NOT NULL,
    `resellerId` INTEGER NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientAddress` VARCHAR(255) NULL,
    `clientCity` VARCHAR(120) NULL,
    `clientCpf` VARCHAR(20) NULL,
    `clientPhone` VARCHAR(30) NULL,
    `clientEmail` VARCHAR(120) NULL,
    `paymentTerms` TEXT NULL,
    `paymentType` VARCHAR(191) NOT NULL DEFAULT 'avista',
    `observations` TEXT NULL,
    `extrasShowcase` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `extrasRingHolder` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `extrasBoxes` INTEGER NOT NULL DEFAULT 0,
    `totalQty` INTEGER NOT NULL DEFAULT 0,
    `productsSubtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `extrasTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `commissionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `commissionValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paymentDiscount` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `discountValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `finalTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Kit_kitNumber_key`(`kitNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KitItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `reference` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `lineTotal` DECIMAL(10, 2) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KitItem` ADD CONSTRAINT `KitItem_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KitItem` ADD CONSTRAINT `KitItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
