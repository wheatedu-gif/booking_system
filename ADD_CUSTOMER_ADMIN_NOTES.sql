-- 為既有資料庫的 customers 表加入 admin_notes（管理員筆記，每客戶一筆）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
