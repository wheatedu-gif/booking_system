import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 穩定的主旨編碼函式 (處理中文)
function encodeSubject(str: string): string {
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

  console.log("收到發信請求...");

  try {
    const payload = await req.json()
    const { record_id, type, target_email } = payload
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("環境變數 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 缺失")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 讀取設定
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    if (settingsError || !settings?.value) {
      throw new Error("資料庫中找不到 email_config 設定")
    }

    const config = settings.value
    if (!config.enabled) {
      return new Response(JSON.stringify({ message: "功能未啟用" }), { headers: corsHeaders })
    }

    let toEmail = ''
    let subject = ''
    let html = ''

    if (type === 'test') {
      toEmail = (target_email || config.user).trim()
      subject = "系統發信測試"
      html = "<h3>🎉 測試成功</h3>您的預約系統已可以正常發送郵件。"
    } else {
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('*, customers(email, full_name)')
        .eq('id', record_id)
        .single()

      if (aptError || !apt) throw new Error("找不到預約資料: " + record_id)
      
      toEmail = apt.customers.email.trim()
      const info = `<br>日期：${apt.booking_date}<br>時間：${apt.booking_time.slice(0,5)}`

      if (type === 'new') {
        subject = "收到預約申請"
        html = `您好 ${apt.customers.full_name}，預約待處理中。${info}`
      } else if (type === 'update') {
        subject = "預約狀態更新"
        html = `預約已確認。${info}`
      } else if (type === 'cancel') {
        subject = "預約取消通知"
        html = `預約已取消。原因：${apt.cancellation_reason || '無'}${info}`
      }
    }

    // 2. 建立 SMTP 連線
    console.log(`正在連線到 Gmail SMTP (帳號: ${config.user})...`);
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

    // 3. 執行發送
    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: encodeSubject(subject),
      html: `<html><body style="font-family: sans-serif;">${html}</body></html>`,
    })

    console.log("發送成功！");
    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 })

  } catch (error: any) {
    console.error("發信失敗詳細原因:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
