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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'email_config').maybeSingle()
    const config = settings?.value
    
    if (!config || !config.enabled) throw new Error("SMTP 設定未啟用");

    let toEmail = '', subject = '', body = '';

    if (type === 'test') {
      toEmail = (target_email || config.user).trim();
      subject = "Email Connection Test";
      body = "Testing connection from Supabase Edge Function.";
    } else {
      const { data: apt } = await supabase.from('appointments').select('*, customers(email, full_name)').eq('id', record_id).single()
      if (!apt) throw new Error("Appointment not found");
      toEmail = apt.customers.email.trim();
      subject = "Appointment Notification";
      body = `Hello ${apt.customers.full_name}, your appointment status has been updated.`;
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: config.user.trim(), password: config.pass.trim() },
      },
    })

    await client.send({
      from: config.user.trim(),
      to: toEmail,
      subject: subject,
      html: `<html><body>${body}</body></html>`,
    })

    await client.close()
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})