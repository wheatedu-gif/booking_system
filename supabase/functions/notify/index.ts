// ---------------------------------------------------------
// Supabase Edge Function: notify (最終亂碼修復版 - Base64編碼)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 輔助函式：將中文編碼為 Email Header 標準格式 (=?UTF-8?B?...?=)
const encodeHeader = (str: string) => {
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const binString = String.fromCodePoint(...data);
  return `=?UTF-8?B?${btoa(binString)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { record_id, type } = await req.json()
    
    // 初始化 Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取系統 Email 設定
    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    const config = settings?.value
    if (!config || !config.enabled || !config.user || !config.pass) {
      return new Response(JSON.stringify({ message: "Email settings missing" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      })
    }

    // 2. 讀取預約與客戶資料
    const { data: appointment, error: aptError } = await supabaseClient
      .from('appointments')
      .select('*, customers(email, full_name)')
      .eq('id', record_id)
      .single()

    if (aptError || !appointment) throw new Error("Appointment not found")
    const customer = appointment.customers

    let subject = ''
    let htmlContent = ''
    const details = `
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="margin: 5px 0;"><strong>📅 預約日期：</strong> ${appointment.booking_date}</p>
        <p style="margin: 5px 0;"><strong>⏰ 預約時間：</strong> ${appointment.booking_time.slice(0, 5)}</p>
      </div>
    `

    if (type === 'new') {
      subject = `[預約通知] 已收到您的預約申請`
      htmlContent = `<h3>您好 ${customer.full_name}，</h3><p>我們已收到您的預約申請，目前狀態為「<b>待處理</b>」，管理員確認後將會再次通知您。</p>${details}`
    } else if (type === 'update' && appointment.status === 'confirmed') {
      subject = `[預約確認] 您的預約已確認成功！`
      htmlContent = `<h3>您好 ${customer.full_name}，</h3><p>好消息！您的預約已通過審核，期待您的光臨。</p>${details}`
    } else if (type === 'cancel') {
      subject = `[預約取消] 您的預約已被取消`
      const reason = appointment.cancellation_reason ? `<p style="color: #ef4444;"><b>取消原因：</b> ${appointment.cancellation_reason}</p>` : ''
      htmlContent = `<h3>您好 ${customer.full_name}，</h3><p>您的預約已被取消。</p>${reason}${details}`
    }

    // 3. 建立 SMTP 連線
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user, password: config.pass },
      },
    })

    // 進行 Header 編碼以防止亂碼
    const fromName = config.from_name || '預約系統';
    const encodedFrom = `"${encodeHeader(fromName)}" <${config.user}>`;
    const encodedSubject = encodeHeader(subject);

    await client.send({
      from: encodedFrom,
      to: customer.email,
      subject: encodedSubject,
      html: `
        <div style="font-family: sans-serif; color: #334155; line-height: 1.6;">
          ${htmlContent}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">此信件由系統自動發送，請勿直接回覆。</p>
        </div>
      `,
    })

    await client.close()
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})