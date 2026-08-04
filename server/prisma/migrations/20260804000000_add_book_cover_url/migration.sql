-- Add Book.coverUrl for cover image feature
--   - 仅作为路径存储：/api/covers/<uuid>.<ext>，由后端静态托管
--   - 长度 500：足够容下未来的子路径或版本号
--   - ADD COLUMN 可空 + 无默认值 → MySQL 8 默认 INSTANT 算法（零锁表、零拷贝）

-- AlterTable
ALTER TABLE `Book` ADD COLUMN `coverUrl` VARCHAR(500) NULL;