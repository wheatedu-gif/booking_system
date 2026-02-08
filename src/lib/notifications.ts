import { callNotify } from './notifyApi';

export const sendNotification = async (appointmentId: string, type: 'new' | 'update' | 'cancel'): Promise<{ ok: boolean; error?: string }> => {
  return callNotify({ type, record_id: appointmentId });
};