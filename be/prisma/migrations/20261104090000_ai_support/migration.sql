-- AI hỗ trợ CSKH (docs/02-thiet-ke/ai-cskh.md): ai phụ trách hội thoại, lý do chuyển nhân viên, tóm tắt AI.
-- Hội thoại cũ nhận handler = STAFF theo mặc định của cột.
ALTER TABLE `Conversation` ADD COLUMN `aiSummary` TEXT NULL,
    ADD COLUMN `handler` ENUM('AI', 'STAFF') NOT NULL DEFAULT 'STAFF',
    ADD COLUMN `handoffAt` DATETIME(3) NULL,
    ADD COLUMN `handoffReason` VARCHAR(255) NULL;

-- Tin do Trợ lý AI gửi có senderType = AI và senderId NULL.
ALTER TABLE `Message` ADD COLUMN `senderType` ENUM('USER', 'AI') NOT NULL DEFAULT 'USER',
    MODIFY `senderId` INTEGER NULL;

-- Hàng đợi CSKH lọc theo handler ("Chờ nhân viên" / "AI đang xử lý").
CREATE INDEX `Conversation_handler_status_lastMessageAt_idx` ON `Conversation`(`handler`, `status`, `lastMessageAt`);
