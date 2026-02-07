import { supabase } from './supabase';

export const sendNotification = async (appointmentId: string, type: 'new' | 'update' | 'cancel') => {
  try {
    console.log(`正在發送通知 (Type: ${type}, ID: ${appointmentId})...`);
    
    // 呼叫 Supabase Edge Function
    // 注意：您必須先部署名為 'notify' 的 Function
    const { data, error } = await supabase.functions.invoke('notify', {
      body: { 
        record_id: appointmentId, 
        type: type 
      }
    });

    if (error) {
      console.error('Notification Error:', error);
      // 不要在這裡 throw error，以免阻斷原本的 UI 流程，Email 失敗不應導致操作失敗
    } else {
      console.log('Notification sent:', data);
    }
  } catch (err) {
    console.error('Notification Exception:', err);
  }
};
