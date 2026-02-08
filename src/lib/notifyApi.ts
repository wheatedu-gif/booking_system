/**
 * 直接呼叫 notify Edge Function，使用 anon key 避免 JWT 導致的 non-2xx 問題
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type NotifyPayload =
  | { type: 'test'; target_email?: string }
  | { type: 'password_reset'; target_email: string; site_url?: string }
  | { type: 'new' | 'update' | 'cancel'; record_id: string };

export async function callNotify(payload: NotifyPayload): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: '缺少 Supabase 設定' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    if (data?.error) {
      return { ok: false, error: data.message || data.error };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || '連線失敗' };
  }
}
