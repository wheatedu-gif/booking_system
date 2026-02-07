// ---------------------------------------------------------
// Supabase Edge Function: notify (除錯與測試增強版)
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

    // 1. 讀取系統 Email 設定
    const { data: settings, error: configError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    if (configError) throw new Error(`資料庫讀取設定失敗: ${configError.message}`)

    const config = settings?.value
    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ message: "Email 通知功能未啟用" }), { headers: corsHeaders, status: 200 })
    }

    if (!config.user || !config.pass) {
        throw new Error("Gmail 帳號或應用程式密碼尚未設定")
    }

    // 2. 準備郵件內容
    let toEmail = ''
    let subject = ''
    let htmlContent = ''

    if (type === 'test') {
      toEmail = target_email || config.user
      subject = '[測試] 預約系統發信功能測試'
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; background: #f0fdf4;">
          <h2 style="color: #10b981;">✅ 發信功能測試成功</h2>
          <p>這是一封來自您的預約系統的測試郵件。</p>
          <p>看到這封信代表您的 SMTP 設定完全正確。</p>
          <hr style="border:none; border-top:1px solid #d1fae5; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">發送時間: ${new Date().toLocaleString()}</p>
        </div>
      `
    } else {
      if (!record_id) throw new Error("缺少 record_id，無法發送正式通知")
      
      const { data: apt, error: aptError } = await supabaseClient
        .from('appointments')
        .select('*, customers(email, full_name)')
        .eq('id', record_id)
        .single()

      if (aptError || !apt) throw new Error("找不到預約資料，請確認 ID 是否正確")
      
      toEmail = apt.customers.email
      const customerName = apt.customers.full_name
      const info = `<div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0; border:1px solid #e2e8f0;">
        <b>預約日期：</b>${apt.booking_date}<br>
        <b>預約時間：</b>${apt.booking_time.slice(0,5)}
      </div>`

      if (type === 'new') {
        subject = '預約通知：已收到您的預約申請'
        htmlContent = `<h3>您好 ${customerName}，</h3><p>我們已收到您的預約申請，目前狀態為<b>待處理</b>，請靜候確認。</p>${info}`
      } else if (type === 'update' && apt.status === 'confirmed') {
        subject = '預約確認：您的預約已確認成功'
        htmlContent = `<h3>您好 ${customerName}，</h3><p>好消息！您的預約已<b>確認成功</b>，期待您的光臨。</p>${info}`
      } else if (type === 'cancel') {
        subject = '預約取消通知'
        const reason = apt.cancellation_reason ? `<p style="color:red;">原因：${apt.cancellation_reason}</p>` : ''
        htmlContent = `<h3>您好 ${customerName}，</h3><p>您的預約已被取消。</p>${reason}${info}`
      } else {
        return new Response(JSON.stringify({ message: "無須發送郵件的狀態變更" }), { headers: corsHeaders, status: 200 })
      }
    }

    // 3. 執行 SMTP 發信
    console.log(`正在連線到 SMTP 發送郵件至: ${toEmail}`)
    
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
      html: htmlContent,
    })

    await client.close()
    console.log('Email 發送成功！')
    
    return new Response(JSON.stringify({ success: true, message: "Email sent" }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    // 回傳詳細錯誤訊息給前端 Alert
    return new Response(JSON.stringify({ 
        error: error.message,
        details: "請檢查 Gmail 帳號、密碼或 Supabase 日誌" 
    }), { headers: corsHeaders, status: 500 })
  }
})