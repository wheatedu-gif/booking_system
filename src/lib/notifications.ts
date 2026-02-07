import { supabase } from './supabase';

export const sendNotification = async (appointmentId: string, type: 'new' | 'update' | 'cancel') => {
  try {
    console.log(`正在發送通知 (Type: ${type}, ID: ${appointmentId})...`);
    
    // 呼叫 Supabase Edge Function
    // 我們使用 invoke 時會自動帶入 Auth Header
    const { data, error } = await supabase.functions.invoke('notify', {
      body: { 
        record_id: appointmentId, 
        type: type 
      }
    });

    if (error) {
      console.error('Notification Error:', error);
    } else {
      console.log('Notification sent response:', data);
    }
  } catch (err) {
    console.error('Notification Exception:', err);
  }
};