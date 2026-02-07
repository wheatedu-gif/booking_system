import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 穩定的主旨編碼，解決中文亂碼
function encodeHeader(str: string): string {
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log("--- Email 傳送程序啟動 ---");

  try {
    const { record_id, type, target_email } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. 獲取設定
    const { data: settings } = await supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates']);
    const config = settings?.find(s => s.key === 'email_config')?.value;
    const templates = settings?.find(s => s.key === 'email_templates')?.value;

    if (!config || !config.enabled) {
        throw new Error("發信功能未啟用，請在後台開啟。");
    }

    let toEmail = '', subject = '', body = '';

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = '發信連線測試成功';
      body = '🎉 恭喜！您的 SMTP 已成功連線，且中文編碼正常。';
    } else {
      const { data: apt } = await supabase.from('appointments').select('*, customers(*)').eq('id', record_id).single()
      if (!apt) throw new Error("找不到預約資料");
      
      toEmail = apt.customers.email.trim();
      let tplKey = type === 'cancel' ? 'cancelled' : (apt.status === 'confirmed' ? 'confirmed' : (apt.status === 'completed' ? 'completed' : 'new_booking'));
      const tpl = templates?.[tplKey] || { subject: '預約通知', body: '您的預約狀態已更新。' };
      
      const replaceVars = (text: string) => text
        .replace(/{name}/g, apt.customers.full_name)
        .replace(/{date}/g, apt.booking_date)
        .replace(/{time}/g, apt.booking_time.slice(0,5))
        .replace(/{reason}/g, apt.cancellation_reason || '無');

      subject = replaceVars(tpl.subject);
      body = replaceVars(tpl.body);
    }

    // 2. 建立連線與發送
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user.trim(), password: config.pass.trim() },
      },
    })

    console.log("正在連線到 Gmail SMTP...");
    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: encodeHeader(subject),
      html: `<html><body style="font-family:sans-serif;line-height:1.6;">${body.replace(/\n/g, '<br>')}</body></html>`,
    })

    console.log("信件發送完成，正在關閉連線...");
    await client.close()
    
    return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
    })

  } catch (error: any) {
    console.error("【關鍵失敗原因】:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
    })
  }
})