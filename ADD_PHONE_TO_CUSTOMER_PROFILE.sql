-- 為既有資料庫的 customer_profile 表單加入「聯絡電話」鎖定欄位
-- 若您已在表單設定看到 姓名、電子郵件、聯絡電話 三個鎖定欄位，則不需執行此腳本
UPDATE form_definitions
SET fields = jsonb_insert(
  fields,
  '{2}',
  '{"id": "sys_phone", "name": "phone", "label": "聯絡電話", "type": "tel", "required": false, "isSystem": true}'::jsonb
)
WHERE type = 'customer_profile'
AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(fields) AS f WHERE f->>'id' = 'sys_phone');
