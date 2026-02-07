// ---------------------------------------------------------
// Supabase Edge Function: notify (標準 Denomailer 版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { record_id, type } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabaseClient.from('system_settings').select('value').eq('key', 'email_config').maybeSingle()
    const config = settings?.value
    if (!config || !config.enabled) return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders })

    const { data: appointment } = await supabaseClient.from('appointments').select('*, customers(email, full_name)').eq('id', record_id).single()
    const customer = appointment.customers

    let subject = ''
    let htmlContent = ''
    const info = `<br><hr><br><b>預約詳情：</b><br>日期：${appointment.booking_date}<br>時間：${appointment.booking_time.slice(0,5)}`

    if (type === 'new') {
        subject = '預約通知：已收到您的預約申請'
        htmlContent = `您好 ${customer.full_name}，<br><br>我們已收到您的預約申請，目前狀態為<b>待處理</b>。<br>${info}`
    } else if (type === 'update' && appointment.status === 'confirmed') {
        subject = '預約確認：您的預約已成功'
        htmlContent = `您好 ${customer.full_name}，<br><br>您的預約已<b>確認成功</b>，期待您的光臨！<br>${info}`
    } else if (type === 'cancel') {
        subject = '預約取消：您的預約已被取消'
        htmlContent = `您好 ${customer.full_name}，<br><br>您的預約已被取消。<br>原因：${appointment.cancellation_reason || '無'}<br>${info}`
    } else {
        return new Response(JSON.stringify({ message: "Skipped" }), { headers: corsHeaders })
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user, password: config.pass },
      },
    })

    // 使用物件格式設定 from，讓套件自動處理編碼
    await client.send({
      from: {
        name: config.from_name || '預約系統',
        email: config.user
      },
      to: customer.email,
      subject: subject,
      html: htmlContent,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})