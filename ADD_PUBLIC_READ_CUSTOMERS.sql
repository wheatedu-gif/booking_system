-- 讓客戶端預約詳情頁可顯示姓名與 Email（既有 DB 執行）
DROP POLICY IF EXISTS "Public Read Customers" ON customers;
CREATE POLICY "Public Read Customers" ON customers FOR SELECT USING (true);
