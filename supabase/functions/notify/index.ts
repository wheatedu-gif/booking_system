// ---------------------------------------------------------
// Supabase Edge Function: notify (V2.1 支援詳細資料變數)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 直接使用 UTF-8，Gmail SMTP 支援 SMTPUTF8
function formatSubject(str: string): string {
  return str || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let logId: string | null = null;

  try {
    const payload = await req.json();
    const { record_id, type, target_email, site_url: payloadSiteUrl } = payload;

    const { data: settings } = await supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates', 'site_url']);
    const config = settings?.find(s => s.key === 'email_config')?.value;
    const templates = settings?.find(s => s.key === 'email_templates')?.value;
    const siteUrl = (payloadSiteUrl || settings?.find(s => s.key === 'site_url')?.value?.url || '').toString().trim().replace(/\/$/, '');

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ error: "Email Disabled", message: "發信功能未啟用，請在後台開啟。" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    let toEmail = '', subject = '', body = '';

    if (type === 'password_reset') {
      toEmail = (target_email || '').trim().toLowerCase();
      if (!toEmail) throw new Error("Missing target_email for password_reset");
      const { data: resetRow } = await supabase.from('customer_password_resets').select('token').eq('email', toEmail).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single();
      if (!resetRow?.token) throw new Error("無效或已過期的重設連結，請重新申請");
      const resetLink = siteUrl ? `${siteUrl}/reset-password?token=${resetRow.token}` : '（請於後台設定站點網址以啟用重設連結）';
      subject = '重設密碼';
      body = `您已申請重設密碼，請點擊以下連結完成設定：\n\n${resetLink}\n\n連結有效期限為 1 小時。\n若您未申請此操作，請忽略此信件。`;
    } else if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信連線測試成功';
      body = '🎉 您的預約系統 Email 通知已設定完成！';
    } else {
      const { data: apt } = await supabase.from('appointments').select('*, customers(*), service_items(name)').eq('id', record_id).single();
      if (!apt) throw new Error("Apt not found");
      toEmail = apt.customers.email.trim();
      const si = apt.service_items ?? apt.service_item;
      const serviceName = (si && typeof si === 'object' && si.name) ? String(si.name) : '—';
      
      let tplKey = 'new_booking';
      if (apt.status === 'confirmed') tplKey = 'confirmed';
      if (apt.status === 'cancelled') tplKey = 'cancelled';
      if (apt.status === 'completed') tplKey = 'completed';

      const tpl = templates?.[tplKey] || { subject: '預約通知', body: '您的預約狀態已更新。' };
      
      // 整理自定義資料
      const detailsStr = Object.entries(apt.booking_data || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const replaceVars = (t: string) => t
        .replace(/{name}/g, apt.customers.full_name || '')
        .replace(/{date}/g, apt.booking_date || '')
        .replace(/{time}/g, (apt.booking_time || '').slice(0,5))
        .replace(/{service}/g, serviceName)
        .replace(/{reason}/g, apt.cancellation_reason || '無')
        .replace(/{details}/g, detailsStr || '無額外資訊');
      
      subject = replaceVars(tpl.subject);
      body = replaceVars(tpl.body);
    }

    const { data: logData } = await supabase.from('email_logs').insert([{ recipient: toEmail, subject, type, status: 'pending' }]).select().single();
    logId = logData?.id;

    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: config.user.trim(), password: config.pass.trim() } },
    });

    const htmlContent = `<html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.6;color:#334155;">
        <div style="max-width:600px;margin:auto;padding:30px;border:1px solid #f1f5f9;border-radius:24px;background-color:#ffffff;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
          <div style="font-size:24px;font-weight:900;color:#2563eb;margin-bottom:20px;border-bottom:2px solid #eff6ff;padding-bottom:10px;">${subject}</div>
          <div style="white-space:pre-wrap;">${body}</div>
          <br><br><hr style="border:none;border-top:1px solid #f1f5f9;"><p style="font-size:12px;color:#94a3b8;text-align:center;">&#27492;&#28858;&#31995;&#32113;&#33258;&#21205;&#30332;&#36865;&#35338;&#24687;&#65292;&#35531;&#21247;&#30452;&#25509;&#22238;&#35206;&#12290;</p>
        </div>
      </body></html>`;
    const htmlBase64 = base64Encode(new TextEncoder().encode(htmlContent));

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: formatSubject(subject),
      mimeContent: [{ mimeType: 'text/html; charset="UTF-8"', content: htmlBase64, transferEncoding: 'base64' }],
    });

    await client.close();
    if (logId) await supabase.from('email_logs').update({ status: 'sent' }).eq('id', logId);
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });

  } catch (error: any) {
    if (logId) await supabase.from('email_logs').update({ status: 'failed', error_message: error.message }).eq('id', logId);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 });
  }
})