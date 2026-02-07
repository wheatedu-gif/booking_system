// ---------------------------------------------------------
// Supabase Edge Function: notify (支援測試模式 + 亂碼修復 + 完整分支)
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
    const { record_id, type, target_email } = await req.json()
    console.log(`收到通知請求: Type=${type}, ID=${record_id}`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取 Email 設定
    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    const config = settings?.value
    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ message: "Email system is disabled" }), { headers: corsHeaders, status: 200 })
    }

    // 2. 根據類型準備資料
    let toEmail = ''
    let subject = ''
    let html = ''

    if (type === 'test') {
      toEmail = target_email || config.user
      subject = '[系統測試] 預約系統發信測試成功'
      html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10b981;">🎉 恭喜！發信功能運作正常</h2>
          <p>這是一封來自您的預約系統的測試信件。</p>
          <p>這代表您的 SMTP (Gmail) 設定已正確連結。</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            發送時間: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    } else {
      // 正式預約通知
      const { data: apt, error: aptError } = await supabaseClient
        .from('appointments')
        .select('*, customers(email, full_name)')
        .eq('id', record_id)
        .single()

      if (aptError || !apt) throw new Error("找不到預約資料")
      
      toEmail = apt.customers.email
      const customerName = apt.customers.full_name
      const info = `<div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0;">
        <b>預約日期：</b>${apt.booking_date}<br>
        <b>預約時間：</b>${apt.booking_time.slice(0,5)}
      </div>`

      if (type === 'new') {
        subject = '預約通知：已收到您的預約申請'
        html = `<h3>您好 ${customerName}，</h3><p>我們已收到您的預約申請，目前狀態為<b>待處理</b>，請靜候管理員確認。</p>${info}`
      } else if (type === 'update' && apt.status === 'confirmed') {
        subject = '預約確認：您的預約已確認成功'
        html = `<h3>您好 ${customerName}，</h3><p>好消息！您的預約已<b>確認成功</b>，期待您的光臨。</p>${info}`
      } else if (type === 'cancel') {
        subject = '預約取消：您的預約已被取消'
        const reason = apt.cancellation_reason ? `<p style="color:red;">原因：${apt.cancellation_reason}</p>` : ''
        html = `<h3>您好 ${customerName}，</h3><p>您的預約已被取消。</p>${reason}${info}`
      } else {
        return new Response(JSON.stringify({ message: "No action needed" }), { headers: corsHeaders })
      }
    }

    // 3. 執行 SMTP 發信
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user, password: config.pass },
      },
    })

    await client.send({
      from: { name: config.from_name || '預約系統', email: config.user },
      to: toEmail,
      subject: subject,
      html: html,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
