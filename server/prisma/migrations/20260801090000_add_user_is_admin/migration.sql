-- Add User.isAdmin for RBAC
-- ★ MySQL 8 ADD COLUMN with DEFAULT → INSTANT algorithm（零锁表，对运行中服务零影响）
-- 提权用手动 SQL（受控、可审计）：UPDATE User SET isAdmin = TRUE WHERE email = '...';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isAdmin` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `User_isAdmin_idx` ON `User`(`isAdmin`);