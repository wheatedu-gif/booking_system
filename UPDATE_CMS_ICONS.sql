-- 更新 CMS 內容，加入預設圖示名稱
UPDATE page_content 
SET content = jsonb_set(
  content, 
  '{features}', 
  '[
    {"title": "彈性預約流程", "desc": "客戶可以輕鬆選擇時段，並填寫您自定義的預約欄位，滿足各種業務需求。", "icon": "calendar"},
    {"title": "安全帳號管理", "desc": "採用高規格加密與權限控管，確保客戶資料安全，並提供完整的個人化預約紀錄。", "icon": "shield"},
    {"title": "即時 Email 通知", "desc": "整合 Gmail SMTP，當預約成功或狀態變更時，系統會自動發送通知郵件。", "icon": "bell"}
  ]'::jsonb
)
WHERE section_key = 'landing_page';
