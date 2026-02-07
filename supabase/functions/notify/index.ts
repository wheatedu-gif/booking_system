// ---------------------------------------------------------
// Supabase Edge Function: notify (修復 From 地址格式錯誤)
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabaseClient.from('system_settings').select('value').eq('key', 'email_config').maybeSingle()
    const config = settings?.value
    if (!config || !config.enabled) return new Response(JSON.stringify({ message: "Email disabled" }), { headers: corsHeaders })

    let toEmail = ''
    let subject = ''
    let body = ''

    if (type === 'test') {
      toEmail = target_email || config.user
      subject = '[測試] 預約系統發信測試'
      body = '發信功能測試成功！代表設定正確。'
    } else {
      const { data: apt } = await supabaseClient.from('appointments').select('*, customers(email, full_name)').eq('id', record_id).single()
      if (!apt) throw new Error("Appointment missing")
      toEmail = apt.customers.email
      subject = '預約狀態更新通知'
      body = `您好 ${apt.customers.full_name}，您的預約狀態已更新為：${apt.status}。`
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user, password: config.pass },
      },
    })

    await client.send({
      from: config.user, 
      to: toEmail,
      subject: subject,
      content: body,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
