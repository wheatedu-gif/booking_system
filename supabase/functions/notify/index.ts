// ---------------------------------------------------------
// Supabase Edge Function: Notify
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record_id, type } = await req.json()

    // 1. 初始化 Supabase Client
    const supabaseClient = createClient(
      // 這裡會自動讀取 Supabase 內建的環境變數
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. 讀取 Email 設定
    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .single()

    const config = settings?.value
    if (!config || !config.enabled) {
      console.log('Email通知未啟用')
      return new Response(JSON.stringify({ message: "Email disabled" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (!config.user || !config.pass) {
        throw new Error("SMTP settings (user/pass) are missing")
    }

    // 3. 讀取預約與客戶資料
    // 注意：我們現在要關聯 customers 表
    const { data: appointment, error: aptError } = await supabaseClient
      .from('appointments')
      .select('*, customers(email, full_name)')
      .eq('id', record_id)
      .single()

    if (aptError || !appointment) {
        throw new Error(`Appointment not found: ${aptError?.message}`)
    }

    const customer = appointment.customers
    if (!customer || !customer.email) {
        throw new Error("Customer email not found")
    }

    // 4. 準備郵件內容
    let subject = ''
    let content = ''
    const bookingInfo = `
      日期：${appointment.booking_date}
      時間：${appointment.booking_time}
    `

    switch (type) {
        case 'new':
            subject = `[預約成功] 我們已收到您的預約`
            content = `您好 ${customer.full_name}，

您的預約已提交成功，目前狀態為「待處理」。

${bookingInfo}

請等待管理員確認。`
            break
        case 'update':
            // 如果狀態變成 confirmed
            if (appointment.status === 'confirmed') {
                subject = `[預約確認] 您的預約已確認！`
                content = `您好 ${customer.full_name}，

好消息！您的預約已經被管理員確認。

${bookingInfo}

期待您的光臨。`
            } else {
                return new Response(JSON.stringify({ message: "No email needed for this update" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
            }
            break
        case 'cancel':
            subject = `[預約取消] 您的預約已取消`
            content = `您好 ${customer.full_name}，

您的預約已被取消。

${bookingInfo}

取消原因：${appointment.cancellation_reason || '無'}`
            break
        default:
            return new Response(JSON.stringify({ message: "Unknown type" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // 5. 發送郵件 (使用 Gmail SMTP)
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: config.user,
          password: config.pass,
        },
      },
    })

    await client.send({
      from: `${config.from_name || '預約系統'} <${config.user}>`,
      to: customer.email,
      subject: subject,
      content: content,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
