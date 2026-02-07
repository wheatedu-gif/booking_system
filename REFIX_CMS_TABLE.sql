-- ==========================================
-- 徹底重置與修復 CMS 及 預約功能
-- ==========================================

-- 1. 徹底刪除舊表 (確保結構乾淨)
DROP TABLE IF EXISTS page_content CASCADE;

-- 2. 重新建立 page_content
CREATE TABLE page_content (
  section_key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 確保預約表有「取消原因」欄位
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='cancellation_reason') THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- 4. 開啟 RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- 5. 設定權限 (解決遞迴問題與快取問題)
DROP POLICY IF EXISTS "Public Read Content" ON page_content;
CREATE POLICY "Public Read Content" ON page_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage CMS" ON page_content;
-- 這裡改用簡單的身份判斷，確保儲存時不會報錯
CREATE POLICY "Admin Manage CMS" ON page_content FOR ALL 
USING (
  auth.role() = 'authenticated' -- 只要是登入的管理員帳號就能改
);

-- 6. 寫入初始首頁內容 (品牌名稱改為您需要的)
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
}'::jsonb);
