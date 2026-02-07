// ---------------------------------------------------------
// Supabase Edge Function: notify (除錯與穩定強化版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function encodeHeader(str: string): string {
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log("--- 收到通知請求 ---");

  try {
    const payload = await req.json();
    const { record_id, type, target_email } = payload;
    console.log("請求參數:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
        console.error("【關鍵錯誤】: 缺少環境變數 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
        throw new Error("環境變數未設定");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle();

    if (settingsError) throw settingsError;

    const config = settings?.value;
    if (!config || !config.enabled) {
        console.log("通知功能未啟用");
        return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders });
    }

    let toEmail = ''
    let subject = ''
    let html = ''

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '預約系統測試信';
      html = '<h3>測試成功！</h3>您的 Gmail SMTP 已正確連線。';
    } else {
      const { data: apt, error: aptError } = await supabaseClient
        .from('appointments')
        .select('*, customers(email, full_name)')
        .eq('id', record_id)
        .single();

      if (aptError || !apt) throw new Error("預約資料查詢失敗");
      
      toEmail = apt.customers.email.trim();
      const info = `<br>日期：${apt.booking_date}<br>時間：${apt.booking_time.slice(0,5)}`;

      if (type === 'new') {
        subject = '已收到預約申請';
        html = `您好 ${apt.customers.full_name}，預約待確認中。${info}`;
      } else if (type === 'update') {
        subject = '預約確認成功通知';
        html = `您的預約已確認。${info}`;
      } else if (type === 'cancel') {
        subject = '預約取消通知';
        html = `您的預約已取消。原因：${apt.cancellation_reason || '無'}${info}`;
      }
    }

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

    await client.send({
      from: `${config.from_name || '預約系統'} <${config.user.trim()}>`,
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body style="font-family:sans-serif;">${html}</body></html>`,
    })

    await client.close();
    console.log("郵件發送成功");
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error("【錯誤回報】:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})