-- 強制重置並同步系統欄位標籤
UPDATE form_definitions 
SET fields = '[
  {"id": "sys_name", "name": "full_name", "label": "姓名", "type": "text", "required": true, "isSystem": true},
  {"id": "sys_email", "name": "email", "label": "電子郵件", "type": "text", "required": true, "isSystem": true},
  {"id": "sys_phone", "name": "phone", "label": "聯絡電話", "type": "tel", "required": false, "isSystem": true}
]'::jsonb
WHERE type = 'customer_profile';

UPDATE form_definitions 
SET fields = '[
  {"id": "sys_date", "name": "date", "label": "預約日期", "type": "date", "required": true, "isSystem": true},
  {"id": "sys_time", "name": "time", "label": "預約時間", "type": "text", "required": true, "isSystem": true}
]'::jsonb
WHERE type = 'booking_form';
