import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { FormDefinition } from '../types';
import { Calendar, Clock, CheckCircle, ExternalLink, FileText, User, LogOut, ChevronRight, Users, Coffee } from 'lucide-react';
import { format, parseISO, addHours, isBefore, addMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { sendNotification } from '../lib/notifications';
import { useToast } from '../components/Toast';

export const BookingPage: React.FC = () => {
  const { customer, loading: authLoading, logout } = useCustomer();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState<{time: string, remaining: number}[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [rules, setRules] = useState({ 
    slot_interval: 15, 
    service_duration: 50, 
    buffer_time: 10, // 緩衝時間
    booking_window_days: 30, 
    min_lead_time_hours: 2,
    max_concurrent_bookings: 1 
  });
  const [occupiedIntervals, setOccupiedIntervals] = useState<{start: number, end: number}[]>([]);

  const [bookingDef, setBookingDef] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const parseT = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const formatT = (m: number) => { const hh = Math.floor(m / 60).toString().padStart(2, '0'); const mm = (m % 60).toString().padStart(2, '0'); return `${hh}:${mm}`; };

  const fetchOccupied = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    const { data } = await supabase.from('appointments').select('booking_time').eq('booking_date', targetDate).neq('status', 'cancelled'); 
    
    // 核心邏輯：每個預約佔用 = 服務時長 + 緩衝時間
    const intervals = data?.map(d => {
        const startMin = parseT(d.booking_time.slice(0, 5));
        const totalDuration = (rules.service_duration || 50) + (rules.buffer_time || 0);
        return { start: startMin, end: startMin + totalDuration };
    }) || [];
    setOccupiedIntervals(intervals);
  }, [rules.service_duration, rules.buffer_time]);

  useEffect(() => {
    supabase.from('form_definitions').select('*').then(({ data }) => setBookingDef(data?.find(d => d.type === 'booking_form') || null));
    supabase.from('business_hours').select('*').then(({ data }) => setBusinessHours(data || []));
    supabase.from('special_dates').select('*').then(({ data }) => setSpecialDates(data || []));
    supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle().then(({ data }) => {
        if (data?.value) setRules(data.value);
    });
  }, []);

  useEffect(() => { fetchOccupied(bookingDate); }, [bookingDate, fetchOccupied]);

  useEffect(() => {
    if (bookingDate && businessHours.length > 0) {
      const day = new Date(bookingDate).getDay();
      const spec = specialDates.find(d => d.date === bookingDate);
      if (spec?.is_closed) { setAvailableSlots([]); return; }

      const hours = businessHours.find(h => h.day_of_week === day);
      if (!hours?.is_open) { setAvailableSlots([]); return; }

      const slots: {time: string, remaining: number}[] = [];
      let curr = parseT(hours.start_time);
      const end = parseT(hours.end_time);
      
      const interval = rules.slot_interval || 15;
      const duration = rules.service_duration || 50;
      const buffer = rules.buffer_time || 0;
      const capacity = rules.max_concurrent_bookings || 1;
      
      const cutOffTime = addHours(new Date(), rules.min_lead_time_hours || 0);

      while (curr + duration <= end) {
          const currEnd = curr + duration + buffer; // 檢查包含緩衝的時間區間
          const slotDateTime = parseISO(`${bookingDate}T${formatT(curr)}:00`);

          if (!isBefore(slotDateTime, cutOffTime)) {
              // 檢查此區間內與其他預約的重疊情況
              const overlapCount = occupiedIntervals.filter(occ => (curr < occ.end && currEnd > occ.start)).length;
              if (overlapCount < capacity) {
                  slots.push({ time: formatT(curr), remaining: capacity - overlapCount });
              }
          }
          curr += interval;
      }
      setAvailableSlots(slots);
    }
  }, [bookingDate, businessHours, specialDates, rules, occupiedIntervals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!customer || !bookingTime) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('appointments').insert([{ customer_id: customer.id, booking_date: bookingDate, booking_time: bookingTime, booking_data: formData, status: 'pending' }]).select().single();
      if (error) throw error;
      showToast('預約已送出，請等候通知！');
      await sendNotification(data.id, 'new');
      setSuccessId(data.id);
    } catch (err: any) { showToast('預約失敗：' + err.message, 'error'); } finally { setSubmitting(false); }
  };

  if (successId) return (
    <div className="max-w-md mx-auto mt-20 text-center p-10 bg-white rounded-[3rem] shadow-xl animate-in zoom-in-95">
        <CheckCircle size={80} className="text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black mb-4">預約成功</h2>
        <p className="text-slate-500 mb-8 font-medium">我們已收到您的申請，<br/>確認後將會透過 Email 通知您。</p>
        <button onClick={() => navigate('/my-appointments')} className="btn-primary w-full py-4 rounded-2xl font-bold">查看我的預約</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-black flex items-center gap-3"><Calendar className="text-blue-600"/> 選擇預約時段</h2>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                        <Coffee size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">內含 {rules.buffer_time} 分鐘場後整理</span>
                    </div>
                </div>
                
                <div className="space-y-8">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">1. 選擇預約日期</label><input type="date" className="input-field rounded-2xl py-4 bg-slate-50 border-none shadow-inner" value={bookingDate} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setBookingDate(e.target.value)} /></div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-1">2. 選擇可用時段 (服務約 {rules.service_duration} 分鐘)</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {availableSlots.map(s => (
                                <button key={s.time} onClick={() => setBookingTime(s.time)} className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center ${bookingTime === s.time ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 shadow-sm'}`}>
                                    <span className="font-bold">{s.time}</span>
                                    <span className={`text-[8px] font-black uppercase mt-1 ${bookingTime === s.time ? 'text-blue-200' : 'text-slate-300'}`}>{s.remaining} 餘額</span>
                                </button>
                            ))}
                        </div>
                        {availableSlots.length === 0 && <p className="text-center text-slate-300 py-10 font-bold italic">本日期目前無符合條件的時段</p>}
                    </div>
                </div>
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 sticky top-24">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><FileText className="text-blue-600"/> 填寫資料</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {bookingDef?.fields.filter(f => !f.isSystem).map(f => (
                        <div key={f.id}><label className="text-xs font-bold text-slate-500 mb-2 block">{f.label}</label>{f.type === 'select' ? (<select required={f.required} className="input-field bg-slate-50 border-none rounded-xl py-3" onChange={e => setFormData({...formData, [f.label]: e.target.value})}><option value="">請選擇...</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>) : (<input className="input-field bg-slate-50 border-none rounded-xl py-3" required={f.required} type={f.type} onChange={e => setFormData({...formData, [f.label]: e.target.value})} />)}</div>
                    ))}
                    <div className="bg-blue-50 p-5 rounded-2xl space-y-2 border border-blue-100 shadow-inner">
                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">日期</span><span className="text-blue-600">{bookingDate}</span></div>
                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">時段</span><span className="text-blue-600">{bookingTime || '未選擇'}</span></div>
                    </div>
                    <button type="submit" disabled={submitting || !bookingTime} className="w-full btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200 disabled:opacity-30 transition-all">{submitting ? '提交中...' : '送出預約申請'}</button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};