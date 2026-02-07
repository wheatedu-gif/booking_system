-- ==========================================
-- 系統功能增強補丁 (補足缺失欄位與 CMS 表)
-- ==========================================

-- 1. 建立 CMS 內容管理表 (如果不存在)
CREATE TABLE IF NOT EXISTS page_content (
  section_key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 增加預約表的「取消原因」欄位 (如果不存在)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='cancellation_reason') THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- 3. 確保 RLS 政策正確 (針對 CMS 表)
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取網站內容
DROP POLICY IF EXISTS "Public Read Content" ON page_content;
CREATE POLICY "Public Read Content" ON page_content FOR SELECT USING (true);

-- 允許管理員修改網站內容 (解決潛在權限問題)
DROP POLICY IF EXISTS "Admin Manage CMS" ON page_content;
CREATE POLICY "Admin Manage CMS" ON page_content FOR ALL 
USING (
  (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
);

-- 4. 插入首頁預設內容 (如果還沒資料)
INSERT INTO page_content (section_key, content) 
VALUES ('landing_page', '{
  "brand_name": "智慧預約",
  "hero": {
    "title": "簡單、快速、專業的 <span class="text-blue-600">預約管理系統</span>",
    "subtitle": "為您的客戶提供最流暢的預約體驗，同時讓您能輕鬆管理所有預約與客戶資料。支援自定義欄位、Email 自動通知與行事曆同步。",
    "cta_booking": "立即預約服務",
    "cta_login": "登入管理後台"
  },
  "features": [
    {"title": "彈性預約流程", "desc": "客戶可以輕鬆選擇時段，並填寫您自定義的預約欄位，滿足各種業務需求。"},
    {"title": "安全帳號管理", "desc": "採用高規格加密與權限控管，確保客戶資料安全，並提供完整的個人化預約紀錄。"},
    {"title": "即時 Email 通知", "desc": "整合 Gmail SMTP，當預約成功或狀態變更時，系統會自動發送通知郵件。"}
  ],
  "about": {
    "title": "強大的自定義欄位功能",
    "desc": "不需要寫程式，管理員就能直接在後台增減客戶資料欄位與預約填寫欄位。無論是電話、地址還是特殊需求，都能隨時調整。",
    "list": ["動態欄位定義", "JSONB 結構儲存", "支援多種輸入類型", "必填項彈性設定"]
  }
}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
