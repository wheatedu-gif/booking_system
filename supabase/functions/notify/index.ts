// ---------------------------------------------------------
// Supabase Edge Function: notify (最終穩定修正版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 修正中文亂碼的編碼函式
function encodeHeader(str: string): string {
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (const b of data) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const { record_id, type, target_email } = payload
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 讀取設定與範本
    const { data: settings } = await supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates'])
    const config = settings?.find(s => s.key === 'email_config')?.value;
    const templates = settings?.find(s => s.key === 'email_templates')?.value;

    if (!config || !config.enabled || !config.user || !config.pass) {
        return new Response(JSON.stringify({ error: "SMTP config missing or disabled" }), { headers: corsHeaders, status: 400 })
    }

    let toEmail = '', subject = '', body = '';

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信功能測試成功';
      body = '🎉 這是一封測試信，代表您的 SMTP 設定已生效。';
    } else {
      const { data: apt } = await supabase.from('appointments').select('*, customers(*)').eq('id', record_id).single()
      if (!apt) throw new Error("Appointment not found")
      
      toEmail = apt.customers.email.trim();
      let tplKey = (type === 'update' && apt.status === 'confirmed') ? 'confirmed' : (type === 'cancel' ? 'cancelled' : 'new_booking');
      const tpl = templates?.[tplKey] || { subject: '預約通知', body: '您的預約狀態已更新。' };
      
      const replaceVars = (text: string) => text
        .replace(/{name}/g, apt.customers.full_name)
        .replace(/{date}/g, apt.booking_date)
        .replace(/{time}/g, apt.booking_time.slice(0,5))
        .replace(/{reason}/g, apt.cancellation_reason || '無');

      subject = replaceVars(tpl.subject);
      body = replaceVars(tpl.body);
    }

    // 2. 執行發信
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user.trim(), password: config.pass.trim() },
      },
    })

    await client.send({
      from: config.user.trim(), // 關鍵：直接使用 Email，不加任何名稱或括號以防止 Gmail 拒絕
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body style="font-family:sans-serif;line-height:1.6;color:#334155;">
        <div style="max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:12px;">
          ${body.replace(/\n/g, '<br>')}
          <br><br><hr style="border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#94a3b8;">此為系統自動發送，請勿直接回覆。</p>
        </div>
      </body></html>`,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
