-- =========================================================
-- 智慧預約系統 - 完整初始化腳本（單一檔案全新安裝用）
-- 含：profiles, customers, service_items, appointments, 表單、營業時間、系統設定等
-- =========================================================

-- 0. 環境準備
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 清理舊結構
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_admin_user();
DROP FUNCTION IF EXISTS register_customer(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS login_customer(TEXT, TEXT);
DROP FUNCTION IF EXISTS update_customer_password(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS request_password_reset(TEXT);
DROP FUNCTION IF EXISTS reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_customer_profile(UUID);
DROP FUNCTION IF EXISTS update_customer_profile(UUID, TEXT, TEXT, JSONB);

DROP TABLE IF EXISTS customer_password_resets CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS service_items CASCADE;
DROP TABLE IF EXISTS form_definitions CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS special_dates CASCADE;
DROP TABLE IF EXISTS special_leaves CASCADE;
DROP TABLE IF EXISTS page_content CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. 建立資料表
CREATE TABLE profiles (id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY, email TEXT NOT NULL, full_name TEXT, role TEXT DEFAULT 'admin', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT, custom_data JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE service_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, duration_minutes INT NOT NULL DEFAULT 50, sort_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE appointments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, service_item_id UUID REFERENCES service_items(id), booking_date DATE NOT NULL, booking_time TIME NOT NULL, status TEXT DEFAULT 'pending', booking_data JSONB DEFAULT '{}'::jsonb, cancellation_reason TEXT, admin_notes TEXT, source TEXT DEFAULT 'online', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE email_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), recipient TEXT NOT NULL, subject TEXT, type TEXT, status TEXT DEFAULT 'pending', error_message TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE page_content (section_key TEXT PRIMARY KEY, content JSONB NOT NULL);
CREATE TABLE form_definitions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT NOT NULL, fields JSONB NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE business_hours (day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6), is_open BOOLEAN DEFAULT true, start_time TIME DEFAULT '09:00', end_time TIME DEFAULT '18:00', break_start TIME DEFAULT '12:00', break_end TIME DEFAULT '13:00');
CREATE TABLE special_dates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE UNIQUE NOT NULL, is_closed BOOLEAN DEFAULT true, start_time TIME, end_time TIME, note TEXT);
CREATE TABLE special_leaves (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date_start DATE NOT NULL, date_end DATE NOT NULL, time_start TIME, time_end TIME, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT valid_date_range CHECK (date_end >= date_start), CONSTRAINT valid_time_range CHECK ((time_start IS NULL AND time_end IS NULL) OR (time_start IS NOT NULL AND time_end IS NOT NULL AND time_end > time_start)));
CREATE TABLE system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);

CREATE TABLE customer_password_resets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'), created_at TIMESTAMPTZ DEFAULT NOW());

-- 3. 安全性政策
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin All" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Cust" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Apt" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Logs" ON email_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Content" ON page_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Forms" ON form_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Business" ON business_hours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Special" ON special_dates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Special Leaves" ON special_leaves FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Service Items" ON service_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Read" ON page_content FOR SELECT USING (true);
CREATE POLICY "Public Read Forms" ON form_definitions FOR SELECT USING (true);
CREATE POLICY "Public Read Business" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Public Read Special" ON special_dates FOR SELECT USING (true);
CREATE POLICY "Public Read Special Leaves" ON special_leaves FOR SELECT USING (true);
CREATE POLICY "Public Read Service Items" ON service_items FOR SELECT USING (true);
CREATE POLICY "Public View Apts" ON appointments FOR SELECT USING (true);
CREATE POLICY "Public Create Apt" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Apt" ON appointments FOR UPDATE USING (true);

CREATE POLICY "Allow insert for reset" ON customer_password_resets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for reset" ON customer_password_resets FOR SELECT USING (true);

-- 4. 函數與自動化
CREATE OR REPLACE FUNCTION handle_new_admin_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role) VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'), 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_admin_user();

-- 客戶註冊（含 phone 寫入）
CREATE OR REPLACE FUNCTION register_customer(p_email TEXT, p_password TEXT, p_full_name TEXT, p_custom_data JSONB DEFAULT '{}'::jsonb)
RETURNS jsonb AS $$
DECLARE new_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM customers WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Email已被註冊');
  END IF;
  INSERT INTO customers (email, password_hash, full_name, phone, custom_data)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_full_name, COALESCE(p_custom_data->>'phone', NULL), p_custom_data)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', new_id, 'email', p_email, 'full_name', p_full_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION login_customer(p_email TEXT, p_password TEXT)
RETURNS jsonb AS $$
DECLARE target RECORD;
BEGIN
  SELECT * INTO target FROM customers WHERE email = p_email;
  IF target IS NULL OR target.password_hash != crypt(p_password, target.password_hash) THEN RETURN jsonb_build_object('success', false, 'message', '帳密錯誤'); END IF;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', target.id, 'email', target.email, 'full_name', target.full_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 會員中心：讀取與更新個人資料
CREATE OR REPLACE FUNCTION get_customer_profile(p_customer_id UUID)
RETURNS jsonb AS $$
DECLARE c RECORD;
BEGIN
  SELECT id, email, full_name, phone, custom_data, created_at INTO c FROM customers WHERE id = p_customer_id;
  IF c IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '找不到會員'); END IF;
  RETURN jsonb_build_object('success', true, 'data', to_jsonb(c));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_customer_profile(p_customer_id UUID, p_full_name TEXT, p_phone TEXT DEFAULT NULL, p_custom_data JSONB DEFAULT NULL)
RETURNS jsonb AS $$
BEGIN
  UPDATE customers SET full_name = COALESCE(p_full_name, full_name), phone = COALESCE(p_phone, phone), custom_data = COALESCE(p_custom_data, custom_data) WHERE id = p_customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', '找不到會員'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 會員修改密碼
CREATE OR REPLACE FUNCTION update_customer_password(p_customer_id UUID, p_old_password TEXT, p_new_password TEXT)
RETURNS jsonb AS $$
DECLARE target RECORD;
BEGIN
  SELECT * INTO target FROM customers WHERE id = p_customer_id;
  IF target IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '找不到帳號'); END IF;
  IF target.password_hash != crypt(p_old_password, target.password_hash) THEN RETURN jsonb_build_object('success', false, 'message', '目前密碼錯誤'); END IF;
  UPDATE customers SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_customer_id;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 忘記密碼：申請重設
CREATE OR REPLACE FUNCTION request_password_reset(p_email TEXT)
RETURNS jsonb AS $$
DECLARE cust RECORD; t TEXT;
BEGIN
  SELECT id, email INTO cust FROM customers WHERE email = LOWER(TRIM(p_email));
  IF cust IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '此 Email 未註冊'); END IF;
  t := encode(gen_random_bytes(32), 'hex');
  INSERT INTO customer_password_resets (email, token, expires_at) VALUES (cust.email, t, NOW() + INTERVAL '1 hour');
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 忘記密碼：以 token 重設
CREATE OR REPLACE FUNCTION reset_password_with_token(p_token TEXT, p_new_password TEXT)
RETURNS jsonb AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM customer_password_resets WHERE token = p_token AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1;
  IF r IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '連結已失效，請重新申請'); END IF;
  UPDATE customers SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE email = r.email;
  DELETE FROM customer_password_resets WHERE token = p_token;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 初始資料
INSERT INTO form_definitions (type, fields) VALUES 
('customer_profile', '[{"id": "sys_name", "name": "full_name", "label": "姓名", "type": "text", "required": true, "isSystem": true}, {"id": "sys_email", "name": "email", "label": "電子郵件", "type": "text", "required": true, "isSystem": true}, {"id": "sys_phone", "name": "phone", "label": "聯絡電話", "type": "tel", "required": false, "isSystem": true}]'::jsonb),
('booking_form', '[{"id": "sys_date", "name": "date", "label": "預約日期", "type": "date", "required": true, "isSystem": true}, {"id": "sys_time", "name": "time", "label": "預約時間", "type": "text", "required": true, "isSystem": true}, {"id": "custom_notes", "name": "notes", "label": "備註", "type": "textarea", "required": false}]'::jsonb);

INSERT INTO business_hours (day_of_week, is_open, start_time, end_time) VALUES (0, false, '09:00', '18:00'), (1, true, '09:00', '18:00'), (2, true, '09:00', '18:00'), (3, true, '09:00', '18:00'), (4, true, '09:00', '18:00'), (5, true, '09:00', '18:00'), (6, false, '09:00', '18:00');

INSERT INTO service_items (name, description, duration_minutes, sort_order) VALUES ('一般服務', '標準預約服務', 50, 0);

INSERT INTO system_settings (key, value) VALUES 
('booking_rules', '{"slot_interval": 15, "buffer_time": 10, "booking_window_days": 30, "min_lead_time_hours": 2, "max_concurrent_bookings": 1, "allow_customer_cancel": true, "cancel_before_hours": 24}'::jsonb),
('email_config', '{"enabled": false, "user": "", "pass": "", "from_name": "預約系統"}'::jsonb),
('email_templates', '{"new_booking": {"subject": "收到預約申請", "body": "您好 {name}，預約待確認。"}, "confirmed": {"subject": "預約確認成功", "body": "您好 {name}，預約已確認！"}, "cancelled": {"subject": "預約取消通知", "body": "您好 {name}，預約已取消。"}, "completed": {"subject": "感謝您的光臨", "body": "您好 {name}，感謝光臨！"}}'::jsonb);

INSERT INTO page_content (section_key, content) VALUES ('landing_page', '{"brand_name": "智慧預約", "hero": {"title": "專業預約管理", "subtitle": "流暢預約體驗"}, "features": []}');
INSERT INTO public.profiles (id, email, full_name, role) SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), 'admin' FROM auth.users ON CONFLICT (id) DO UPDATE SET role = 'admin';
