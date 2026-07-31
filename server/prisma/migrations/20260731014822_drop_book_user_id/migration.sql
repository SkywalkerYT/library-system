/*
  Warnings:

  - You are about to drop the column `userId` on the `book` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Book_userId_category_idx` ON `book`;

-- DropIndex
DROP INDEX `Book_userId_idx` ON `book`;

-- DropIndex
DROP INDEX `Book_userId_status_idx` ON `book`;

-- AlterTable
ALTER TABLE `book` DROP COLUMN `userId`;

-- CreateIndex
CREATE INDEX `Book_status_idx` ON `Book`(`status`);

-- CreateIndex
CREATE INDEX `Book_category_idx` ON `Book`(`category`);
