// ---------------------------------------------------------
// Supabase Edge Function: notify (最終穩定版 - 解決亂碼與 500 錯誤)
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

    const { data: settings } = await supabaseClient.from('system_settings').select('value').eq('key', 'email_config').maybeSingle()
    const config = settings?.value
    if (!config || !config.enabled) return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders })

    let toEmail = ''
    let subject = ''
    let html = ''

    if (type === 'test') {
      toEmail = (target_email || config.user).trim()
      subject = '預約系統：發信功能測試成功'
      html = `<h3>🎉 恭喜！測試信發送成功</h3><p>這代表您的 Gmail SMTP 與主旨編碼均已正確運作。</p><p>時間：${new Date().toLocaleString()}</p>`
    } else {
      const { data: apt } = await supabaseClient.from('appointments').select('*, customers(email, full_name)').eq('id', record_id).single()
      if (!apt) throw new Error("Appointment not found")
      toEmail = apt.customers.email.trim()
      const details = `<br>日期：${apt.booking_date}<br>時間：${apt.booking_time.slice(0,5)}`
      if (type === 'new') {
        subject = '已收到您的預約申請'
        html = `您好 ${apt.customers.full_name}，我們已收到您的預約申請，待確認中。${details}`
      } else if (type === 'update' && apt.status === 'confirmed') {
        subject = '預約確認成功通知'
        html = `您好 ${apt.customers.full_name}，您的預約已確認成功！${details}`
      } else if (type === 'cancel') {
        subject = '預約取消通知'
        html = `您好 ${apt.customers.full_name}，預約已取消。原因：${apt.cancellation_reason || '無'}${details}`
      }
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user.trim(), password: config.pass.trim() },
      },
    })

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body style="font-family: sans-serif; color: #334155;">${html}</body></html>`,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})