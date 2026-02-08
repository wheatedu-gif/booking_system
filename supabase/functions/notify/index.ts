// ---------------------------------------------------------
// Supabase Edge Function: notify (最終維運穩定版)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 主旨：直接使用 UTF-8（Gmail 支援 SMTPUTF8），避免 RFC 2047 解碼問題
function formatSubject(str: string): string {
  return str || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let logId: string | null = null;

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch (_) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    const { record_id, type, target_email } = payload;

    // 1. 獲取設定與範本
    const { data: settings } = await supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates']);
    const config = settings?.find(s => s.key === 'email_config')?.value;
    const templates = settings?.find(s => s.key === 'email_templates')?.value;

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ error: "Email Disabled", message: "發信功能未啟用，請在後台開啟。" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    let toEmail = '', subject = '', body = '';

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信連線測試成功';
      body = '🎉 恭喜！您的 SMTP 設定已正確連線，中文顯示正常。';
    } else {
      if (!record_id) {
        return new Response(JSON.stringify({ error: "Missing record_id" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
      const { data: apt } = await supabase.from('appointments').select('*, customers(*)').eq('id', record_id).single();
      if (!apt) throw new Error("Apt data not found");
      toEmail = apt.customers.email.trim();
      
      let tplKey = (type === 'update' && apt.status === 'confirmed') ? 'confirmed' : (type === 'cancel' || apt.status === 'cancelled' ? 'cancelled' : 'new_booking');
      if (apt.status === 'completed') tplKey = 'completed';

      const tpl = templates?.[tplKey] || { subject: '預約通知', body: '您的預約狀態已更新。' };
      const replaceVars = (t: string) => t.replace(/{name}/g, apt.customers.full_name).replace(/{date}/g, apt.booking_date).replace(/{time}/g, apt.booking_time.slice(0,5)).replace(/{reason}/g, apt.cancellation_reason || '無');
      
      subject = replaceVars(tpl.subject);
      body = replaceVars(tpl.body);
    }

    // 2. 預先建立日誌 (非阻塞，失敗不影響發信)
    const { data: logData } = await supabase.from('email_logs').insert([{ recipient: toEmail, subject, type, status: 'pending' }]).select().single();
    if (logData?.id) logId = logData.id;

    // 3. 建立連線並發送
    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: config.user.trim(), password: config.pass.trim() } },
    });

    const safeBody = String(body || '').replace(/\n/g, '<br>');
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
<body style="font-family:sans-serif;line-height:1.6;color:#334155;">
  <div style="max-width:600px;margin:auto;padding:20px;border:1px solid #f1f5f9;border-radius:16px;">
    ${safeBody}
    <br><br><hr style="border:none;border-top:1px solid #eee;"><p style="font-size:12px;color:#94a3b8;">&#31995;&#32113;&#33258;&#21205;&#30332;&#36865;&#65292;&#35531;&#21247;&#30452;&#25509;&#22238;&#22797;&#12290;</p>
  </div>
</body>
</html>`;

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: formatSubject(subject),
      html: htmlBody,
    });

    await client.close();
    if (logId) await supabase.from('email_logs').update({ status: 'sent' }).eq('id', logId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    if (logId) await supabase.from('email_logs').update({ status: 'failed', error_message: error.message }).eq('id', logId);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})
