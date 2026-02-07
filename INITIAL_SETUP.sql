-- =========================================================
-- 智慧預約系統 - 終極整合初始化腳本 (V9 容量管理版)
-- =========================================================

-- 0. 環境與擴充功能
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 清理舊結構
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_admin_user();
DROP FUNCTION IF EXISTS register_customer(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS login_customer(TEXT, TEXT);
DROP FUNCTION IF EXISTS update_customer_password(UUID, TEXT, TEXT);

DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS form_definitions CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS special_dates CASCADE;
DROP TABLE IF EXISTS page_content CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. 建立資料表 (核心結構)
CREATE TABLE profiles (id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY, email TEXT NOT NULL, full_name TEXT, role TEXT DEFAULT 'admin', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT, custom_data JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE appointments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, booking_date DATE NOT NULL, booking_time TIME NOT NULL, status TEXT DEFAULT 'pending', booking_data JSONB DEFAULT '{}'::jsonb, cancellation_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE page_content (section_key TEXT PRIMARY KEY, content JSONB NOT NULL);
CREATE TABLE form_definitions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT NOT NULL, fields JSONB NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE business_hours (day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6), is_open BOOLEAN DEFAULT true, start_time TIME DEFAULT '09:00', end_time TIME DEFAULT '18:00', break_start TIME DEFAULT '12:00', break_end TIME DEFAULT '13:00');
CREATE TABLE special_dates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE UNIQUE NOT NULL, is_closed BOOLEAN DEFAULT true, start_time TIME, end_time TIME, note TEXT);
CREATE TABLE system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);

-- 3. RLS 政策 (Auth 登入者即管理員)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin All" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Content" ON page_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Forms" ON form_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Business" ON business_hours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Special" ON special_dates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Read" ON page_content FOR SELECT USING (true);
CREATE POLICY "Public Read Forms" ON form_definitions FOR SELECT USING (true);
CREATE POLICY "Public Read Business" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Public Read Special" ON special_dates FOR SELECT USING (true);
CREATE POLICY "Public View Apts" ON appointments FOR SELECT USING (true);
CREATE POLICY "Public Create Apt" ON appointments FOR INSERT WITH CHECK (true);

-- 4. 後端函數 (RPC)
CREATE OR REPLACE FUNCTION register_customer(p_email TEXT, p_password TEXT, p_full_name TEXT, p_custom_data JSONB DEFAULT '{}'::jsonb) 
RETURNS jsonb AS $$
DECLARE new_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM customers WHERE email = p_email) THEN RETURN jsonb_build_object('success', false, 'message', 'Email 已被註冊'); END IF;
  INSERT INTO customers (email, password_hash, full_name, custom_data) VALUES (p_email, crypt(p_password, gen_salt('bf')), p_full_name, p_custom_data) RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', new_id, 'email', p_email, 'full_name', p_full_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION login_customer(p_email TEXT, p_password TEXT) 
RETURNS jsonb AS $$
DECLARE target_customer RECORD;
BEGIN
  SELECT * INTO target_customer FROM customers WHERE email = p_email;
  IF target_customer IS NULL OR target_customer.password_hash != crypt(p_password, target_customer.password_hash) THEN RETURN jsonb_build_object('success', false, 'message', '帳密錯誤'); END IF;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', target_customer.id, 'email', target_customer.email, 'full_name', target_customer.full_name, 'custom_data', target_customer.custom_data));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_customer_password(p_customer_id UUID, p_old_password TEXT, p_new_password TEXT)
RETURNS jsonb AS $$
DECLARE target_customer RECORD;
BEGIN
  SELECT * INTO target_customer FROM customers WHERE id = p_customer_id;
  IF target_customer.password_hash != crypt(p_old_password, target_customer.password_hash) THEN RETURN jsonb_build_object('success', false, 'message', '舊密碼錯誤'); END IF;
  UPDATE customers SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_customer_id;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_admin_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role) VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'), 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_admin_user();

-- 5. 初始化預設資料
INSERT INTO form_definitions (type, fields) VALUES 
('customer_profile', '[{"id": "sys_name", "name": "full_name", "label": "姓名", "type": "text", "required": true, "isSystem": true}, {"id": "sys_email", "name": "email", "label": "電子郵件", "type": "text", "required": true, "isSystem": true}, {"id": "sys_phone", "name": "phone", "label": "聯絡電話", "type": "tel", "required": false, "isSystem": true}]'::jsonb),
('booking_form', '[{"id": "sys_date", "name": "date", "label": "預約日期", "type": "date", "required": true, "isSystem": true}, {"id": "sys_time", "name": "time", "label": "預約時間", "type": "text", "required": true, "isSystem": true}]'::jsonb);

INSERT INTO business_hours (day_of_week, is_open, start_time, end_time) VALUES (0, false, '09:00', '18:00'), (1, true, '09:00', '18:00'), (2, true, '09:00', '18:00'), (3, true, '09:00', '18:00'), (4, true, '09:00', '18:00'), (5, true, '09:00', '18:00'), (6, false, '09:00', '18:00');

-- 擴充規則：加入同時段人數上限
INSERT INTO system_settings (key, value) VALUES 
('booking_rules', '{"time_slot_minutes": 60, "booking_window_days": 30, "max_concurrent_bookings": 1}'::jsonb),
('email_config', '{"enabled": false, "user": "", "pass": "", "from_name": "預約系統"}'::jsonb),
('email_templates', '{"new_booking": {"subject": "收到預約申請", "body": "您好 {name}，預約待確認中。"}, "confirmed": {"subject": "預約確認成功", "body": "您好 {name}，預約已確認！"}, "cancelled": {"subject": "預約取消", "body": "您好 {name}，預約已取消。原因：{reason}"}}'::jsonb);

INSERT INTO page_content (section_key, content) VALUES ('landing_page', $$ {"brand_name": "智慧預約", "hero": {"title": "專業預約管理系統", "subtitle": "極簡、流暢、高效。", "cta_booking": "立即預約", "cta_login": "會員登入"}, "features": [{"title": "快速預約", "desc": "30秒完成預約。", "icon": "calendar"}]} $$);

INSERT INTO public.profiles (id, email, full_name, role) SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Administrator'), 'admin' FROM auth.users ON CONFLICT (id) DO UPDATE SET role = 'admin';