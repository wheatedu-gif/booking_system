-- 增加取消原因欄位
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
