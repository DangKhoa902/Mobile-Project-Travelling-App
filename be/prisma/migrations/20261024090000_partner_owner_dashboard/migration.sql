-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `commissionAmount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `commissionRate` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `ownerRevenue` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `paymentDueAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Destination` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `listingRejectReason` VARCHAR(191) NULL,
    ADD COLUMN `listingStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `ownerId` INTEGER NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('BOOKING', 'PAYMENT', 'SUPPORT', 'REVIEW', 'PARTNER', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `channel` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('USER', 'OWNER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `PartnerProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `taxCode` VARCHAR(20) NULL,
    `businessAddress` VARCHAR(500) NOT NULL,
    `contactPhone` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(30) NULL,
    `bankAccountName` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `commissionRate` DOUBLE NOT NULL DEFAULT 0.15,
    `rejectReason` VARCHAR(191) NULL,
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PartnerProfile_userId_key`(`userId`),
    INDEX `PartnerProfile_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Booking_status_paymentDueAt_idx` ON `Booking`(`status`, `paymentDueAt`);

-- CreateIndex
CREATE INDEX `Destination_ownerId_idx` ON `Destination`(`ownerId`);

-- CreateIndex
CREATE INDEX `Destination_listingStatus_idx` ON `Destination`(`listingStatus`);

-- AddForeignKey
ALTER TABLE `PartnerProfile` ADD CONSTRAINT `PartnerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerProfile` ADD CONSTRAINT `PartnerProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Destination` ADD CONSTRAINT `Destination_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

