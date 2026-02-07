// ---------------------------------------------------------
// Supabase Edge Function: notify (極簡穩定版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 修復中文主旨亂碼
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

  try {
    const { record_id, type, target_email } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取發信設定
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    if (settingsError || !settings?.value) {
        throw new Error("找不到 Email 設定，請在後台設定 SMTP 帳密。");
    }

    const config = settings.value;
    if (!config.enabled) return new Response(JSON.stringify({ message: "Email Disabled" }), { headers: corsHeaders })

    let toEmail = ''
    let subject = ''
    let html = ''

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信功能測試';
      html = '<h3>🎉 測試成功！</h3>您的 Gmail SMTP 設定運作正常。';
    } else {
      const { data: apt, error: aptError } = await supabaseClient
        .from('appointments')
        .select('*, customers(email, full_name)')
        .eq('id', record_id)
        .single();

      if (aptError || !apt) throw new Error("找不到該筆預約資料");
      
      toEmail = apt.customers.email.trim();
      const info = `<br>日期：${apt.booking_date}<br>時間：${apt.booking_time.slice(0,5)}`;

      if (type === 'new') {
        subject = '已收到預約申請';
        html = `您好 ${apt.customers.full_name}，預約待確認中。${info}`;
      } else if (type === 'update') {
        subject = '預約狀態更新';
        html = `您的預約已確認。${info}`;
      } else if (type === 'cancel') {
        subject = '預約取消通知';
        html = `您的預約已取消。原因：${apt.cancellation_reason || '無'}${info}`;
      }
    }

    // 2. 執行發信
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

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error('Email Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
