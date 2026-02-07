/*
  這段程式碼應部署為 Supabase Edge Function (例如命名為 send-booking-email)
  部署指令: supabase functions deploy send-booking-email
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

serve(async (req) => {
  try {
    const { record, old_record } = await req.json()

    // 判斷狀態變化
    const isConfirmed = record.status === 'confirmed' && old_record?.status !== 'confirmed';
    const isCancelled = record.status === 'cancelled' && old_record?.status !== 'cancelled';

    if (!isConfirmed && !isCancelled) {
      return new Response(JSON.stringify({ message: "No relevant status change" }), { status: 200 })
    }

    const supabase = createClient(...) // 略

    // ... 取得 config 與 profile (同之前邏輯) ...

    const subject = isConfirmed ? `[預約確認] 您的預約已確認成功！` : `[預約取消] 您的預約已被取消`;
    const statusText = isConfirmed ? '已確認成功' : '已被取消';
    const reasonText = isCancelled ? `\n取消原因：${record.cancellation_reason || '未提供'}\n` : '';

    await client.send({
      from: `${config.from_name} <${config.user}>`,
      to: profile.email,
      subject: subject,
      content: `
        您好 ${profile.full_name}，

        您的預約${statusText}！
        
        預約詳情：
        - 日期：${record.booking_date}
        - 時間：${record.booking_time}
        ${reasonText}
        如有任何疑問，請聯繫我們。
      `,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
