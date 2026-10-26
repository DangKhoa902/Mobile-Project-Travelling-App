-- Đăng nhập bằng Google: lưu "sub" của tài khoản Google đã liên kết.
ALTER TABLE `User` ADD COLUMN `googleId` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);
