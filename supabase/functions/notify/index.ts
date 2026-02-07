// ---------------------------------------------------------
// Supabase Edge Function: notify (完美支援中文 - 最終修復版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 輔助函式：使用 Quoted-Printable 編碼處理中文主旨 (防止 SMTP 亂碼)
function encodeSubject(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let result = '';
  for (const byte of bytes) {
    result += '=' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return `=?UTF-8?Q?${result}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { record_id, type } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取設定
    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    const config = settings?.value
    if (!config || !config.enabled) return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders })

    // 2. 讀取預約資料
    const { data: appointment } = await supabaseClient
      .from('appointments')
      .select('*, customers(email, full_name)')
      .eq('id', record_id)
      .single()

    const customer = appointment.customers
    
    let subjectText = ''
    let bodyText = ''
    const info = `\n--- 預約詳情 ---\n日期：${appointment.booking_date}\n時間：${appointment.booking_time.slice(0,5)}\n---------------`

    if (type === 'new') {
        subjectText = `[預約通知] 已收到您的預約申請`
        bodyText = `您好 ${customer.full_name}，我們已收到您的預約申請，目前正在確認中。${info}`
    } else if (type === 'update' && appointment.status === 'confirmed') {
        subjectText = `[預約確認] 您的預約已確認成功！`
        bodyText = `您好 ${customer.full_name}，好消息！您的預約已確認成功，期待您的光臨。${info}`
    } else if (type === 'cancel') {
        subjectText = `[預約取消] 您的預約已被取消`
        bodyText = `您好 ${customer.full_name}，您的預約已被取消。\n原因：${appointment.cancellation_reason || '未提供'}\n${info}`
    }

    // 3. 執行發信
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: config.user,
      password: config.pass,
    });

    await client.send({
      from: config.user, 
      to: customer.email,
      subject: encodeSubject(subjectText), // 關鍵：手動編碼主旨
      content: bodyText,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
