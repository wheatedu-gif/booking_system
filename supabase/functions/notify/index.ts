// ---------------------------------------------------------
// Supabase Edge Function: notify (維運強化版 - 加入 Email Logs)
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
  for (const b of data) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let logId: string | null = null;

  try {
    const { record_id, type, target_email } = await req.json()

    // 1. 讀取設定
    const { data: settings } = await supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates'])
    const config = settings?.find(s => s.key === 'email_config')?.value;
    const templates = settings?.find(s => s.key === 'email_templates')?.value;

    if (!config || !config.enabled) return new Response(JSON.stringify({ message: "Disabled" }), { headers: corsHeaders })

    let toEmail = '', subject = '', body = '';

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信功能測試';
      body = '🎉 測試信發送成功。';
    } else {
      const { data: apt } = await supabase.from('appointments').select('*, customers(*)').eq('id', record_id).single()
      if (!apt) throw new Error("Appointment not found");
      toEmail = apt.customers.email.trim();
      let tplKey = (type === 'update' && apt.status === 'confirmed') ? 'confirmed' : (type === 'cancel' ? 'cancelled' : 'new_booking');
      const tpl = templates?.[tplKey] || { subject: '預約通知', body: '您的預約已更新。' };
      const replaceVars = (text: string) => text.replace(/{name}/g, apt.customers.full_name).replace(/{date}/g, apt.booking_date).replace(/{time}/g, apt.booking_time.slice(0,5)).replace(/{reason}/g, apt.cancellation_reason || '無');
      subject = replaceVars(tpl.subject);
      body = replaceVars(tpl.body);
    }

    // 2. 預先建立 Log (狀態為 pending)
    const { data: logData } = await supabase.from('email_logs').insert([{
        recipient: toEmail,
        subject: subject,
        type: type,
        status: 'pending'
    }]).select().single();
    logId = logData?.id;

    // 3. 執行發信
    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: config.user.trim(), password: config.pass.trim() } },
    })

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body style="font-family:sans-serif;">${body.replace(/\n/g, '<br>')}</body></html>`,
    })

    await client.close()

    // 4. 更新 Log 狀態為 sent
    if (logId) await supabase.from('email_logs').update({ status: 'sent' }).eq('id', logId);

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    console.error(error);
    // 5. 紀錄失敗原因
    if (logId) {
        await supabase.from('email_logs').update({ status: 'failed', error_message: error.message }).eq('id', logId);
    } else {
        await supabase.from('email_logs').insert([{ recipient: 'system', status: 'failed', error_message: error.message, type: 'error_report' }]);
    }
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
