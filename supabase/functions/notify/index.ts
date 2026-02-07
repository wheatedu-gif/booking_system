// ---------------------------------------------------------
// Supabase Edge Function: notify (除錯加強版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 輔助函式：解決中文亂碼
function encodeHeader(str: string): string {
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log("--- 收到發信請求 ---");

  try {
    const payload = await req.json();
    const { record_id, type, target_email } = payload;
    console.log("Payload:", JSON.stringify(payload));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取設定
    const { data: settings, error: settingsError } = await supabaseClient.from('system_settings').select('value').eq('key', 'email_config').maybeSingle();
    
    if (settingsError) {
        console.error("資料庫讀取設定失敗:", settingsError);
        throw new Error("Settings fetch failed");
    }

    const config = settings?.value;
    if (!config || !config.enabled) {
        console.log("Email 通知功能未啟用");
        return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders });
    }

    console.log("準備發送郵件，帳號:", config.user);

    let toEmail = (target_email || config.user).trim();
    let subject = type === 'test' ? '預約系統測試信' : '預約通知';
    let content = '這是一封自動發送的信件。';

    // 2. 建立 SMTP 連線並嘗試發信
    console.log("正在連線到 smtp.gmail.com:465...");
    
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { 
          username: config.user.trim(), 
          password: config.pass.trim() 
        },
      },
    })

    console.log("SMTP 連線物件已建立，準備傳送...");

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body>${content}</body></html>`,
    })

    await client.close();
    console.log("郵件發送成功！");
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error("【關鍵錯誤回報】:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
