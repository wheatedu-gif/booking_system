-- =========================================================
-- 智慧預約系統 - 終極全功能整合初始化腳本 (V3 最終版)
-- =========================================================

-- 0. 環境與擴充功能
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 清理舊結構
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_admin_user();
DROP FUNCTION IF EXISTS register_customer(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS login_customer(TEXT, TEXT);

DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS form_definitions CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS special_dates CASCADE;
DROP TABLE IF EXISTS page_content CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. 建立資料表

-- [管理員資料表]
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [一般客戶資料表]
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  custom_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [預約紀錄表]
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT DEFAULT 'pending',
  booking_data JSONB DEFAULT '{}'::jsonb,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [網頁內容管理表]
CREATE TABLE page_content (
  section_key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [表單定義表]
CREATE TABLE form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'customer_profile', 'booking_form'
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [時段管理]
CREATE TABLE business_hours (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN DEFAULT true,
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '18:00',
  break_start TIME DEFAULT '12:00',
  break_end TIME DEFAULT '13:00'
);

CREATE TABLE special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  is_closed BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  note TEXT
);

-- [系統全域設定]
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 設定 RLS 安全政策
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 公開讀取政策
CREATE POLICY "Public Read Content" ON page_content FOR SELECT USING (true);
CREATE POLICY "Public Read Forms" ON form_definitions FOR SELECT USING (true);
CREATE POLICY "Public Read Business" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Public Read Special" ON special_dates FOR SELECT USING (true);
CREATE POLICY "Public Read Appointments" ON appointments FOR SELECT USING (true);

-- 管理員操作政策
CREATE POLICY "Admin All Access Profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Content" ON page_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Forms" ON form_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Business" ON business_hours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Special" ON special_dates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access Settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

-- 預約建立政策 (允許公開 Insert)
CREATE POLICY "Public Create Appointment" ON appointments FOR INSERT WITH CHECK (true);


-- 4. 後端功能函數 (RPC)

-- [RPC] 客戶註冊
CREATE OR REPLACE FUNCTION register_customer(p_email TEXT, p_password TEXT, p_full_name TEXT, p_custom_data JSONB DEFAULT '{}'::jsonb) 
RETURNS JSONB AS $$
DECLARE new_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM customers WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'message', '此 Email 已被註冊');
  END IF;
  INSERT INTO customers (email, password_hash, full_name, custom_data)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_full_name, p_custom_data)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', new_id, 'email', p_email, 'full_name', p_full_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [RPC] 客戶登入
CREATE OR REPLACE FUNCTION login_customer(p_email TEXT, p_password TEXT) 
RETURNS JSONB AS $$
DECLARE target_customer RECORD;
BEGIN
  SELECT * INTO target_customer FROM customers WHERE email = p_email;
  IF target_customer IS NULL OR target_customer.password_hash != crypt(p_password, target_customer.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'message', '帳號或密碼錯誤');
  END IF;
  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', target_customer.id, 'email', target_customer.email, 'full_name', target_customer.full_name, 'custom_data', target_customer.custom_data));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [Trigger] 管理員帳號自動同步
CREATE OR REPLACE FUNCTION handle_new_admin_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Administrator'), 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_admin_user();


-- 5. 初始化預設資料 (含系統欄位定義)

-- 客戶資料欄位 (含 isSystem 標記)
INSERT INTO form_definitions (type, fields) VALUES 
('customer_profile', '[
  {"id": "sys_name", "name": "full_name", "label": "姓名", "type": "text", "required": true, "isSystem": true},
  {"id": "sys_email", "name": "email", "label": "電子郵件", "type": "text", "required": true, "isSystem": true},
  {"id": "sys_phone", "name": "phone", "label": "聯絡電話", "type": "tel", "required": false, "isSystem": true}
]'::jsonb);

-- 預約表單欄位 (含 isSystem 標記)
INSERT INTO form_definitions (type, fields) VALUES 
('booking_form', '[
  {"id": "sys_date", "name": "date", "label": "預約日期", "type": "date", "required": true, "isSystem": true},
  {"id": "sys_time", "name": "time", "label": "預約時間", "type": "text", "required": true, "isSystem": true}
]'::jsonb);

-- 營業時間
INSERT INTO business_hours (day_of_week, is_open, start_time, end_time) VALUES
(0, false, '09:00', '18:00'), (1, true, '09:00', '18:00'), (2, true, '09:00', '18:00'),
(3, true, '09:00', '18:00'), (4, true, '09:00', '18:00'), (5, true, '09:00', '18:00'), (6, false, '09:00', '18:00');

-- 系統規則
INSERT INTO system_settings (key, value) VALUES 
('booking_rules', '{"time_slot_minutes": 60, "booking_window_days": 30}'::jsonb),
('email_config', '{"enabled": false, "user": "", "pass": "", "from_name": "預約系統"}'::jsonb);

-- CMS 內容
INSERT INTO page_content (section_key, content) VALUES 
('landing_page', $$
{
  "brand_name": "智慧預約",
  "hero": {
    "title": "簡單、快速、專業的 <span class='text-blue-600'>預約管理系統</span>",
    "subtitle": "為您的客戶提供最流暢的預約體驗，同時讓您能輕鬆管理所有預約與客戶資料。支援自定義欄位、Email 自動通知與行事曆同步。",
    "cta_booking": "立即預約服務",
    "cta_login": "會員登入"
  },
  "features": [
    {"title": "彈性預約流程", "desc": "客戶可以輕鬆選擇時段，並填寫您自定義的預約欄位，滿足各種業務需求。", "icon": "calendar"},
    {"title": "安全帳號管理", "desc": "採用高規格加密與權限控管，確保客戶資料安全，並提供完整的個人化預約紀錄。", "icon": "shield"},
    {"title": "即時 Email 通知", "desc": "整合 Gmail SMTP，當預約成功或狀態變更時，系統會自動發送通知郵件。", "icon": "bell"}
  ],
  "about": {
    "title": "強大的自定義欄位功能",
    "desc": "不需要寫程式，管理員就能直接在後台增減客戶資料欄位與預約填寫欄位。無論是電話、地址還是特殊需求，都能隨時調整。",
    "list": ["動態欄位定義", "JSONB 結構儲存", "支援多種輸入類型", "必填項彈性設定"]
  }
}
$$);
