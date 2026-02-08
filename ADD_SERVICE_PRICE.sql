-- 為既有資料庫的 service_items 表加入 price（服務費用，單位：元）
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;
