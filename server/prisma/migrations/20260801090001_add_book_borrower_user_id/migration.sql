-- Add Book.borrowerUserId for borrowedCount 统计（admin 用户列表）
-- ★ ADD COLUMN without DEFAULT → INSTANT（可空列零锁表）
-- 复合索引 (borrowerUserId, status) 让"当前借阅中书数"查询走索引

-- AlterTable
ALTER TABLE `Book` ADD COLUMN `borrowerUserId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Book_borrowerUserId_status_idx` ON `Book`(`borrowerUserId`, `status`);