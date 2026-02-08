import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { FormDefinition } from '../types';
import { Calendar, Clock, CheckCircle, FileText, User, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, addHours, isBefore, addMinutes, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, isPast } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { sendNotification } from '../lib/notifications';
import { useToast } from '../components/Toast';

export const BookingPage: React.FC = () => {
  const { customer, loading: authLoading, logout } = useCustomer();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [selectedServiceItem, setSelectedServiceItem] = useState('');
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [bookingTime, setBookingTime] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState<{time: string, remaining: number}[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [specialLeaves, setSpecialLeaves] = useState<{ date_start: string; date_end: string; time_start: string | null; time_end: string | null }[]>([]);
  const [rules, setRules] = useState({ 
    slot_interval: 15, 
    buffer_time: 10, // 緩衝時間
    booking_window_days: 30, 
    min_lead_time_hours: 2,
    max_concurrent_bookings: 1 
  });
  const [occupiedIntervals, setOccupiedIntervals] = useState<{start: number, end: number}[]>([]);
  const selectedService = serviceItems.find(s => s.id === selectedServiceItem);
  const serviceDuration = selectedService?.duration_minutes || 50;

  const [bookingDef, setBookingDef] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const parseT = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const formatT = (m: number) => { const hh = Math.floor(m / 60).toString().padStart(2, '0'); const mm = (m % 60).toString().padStart(2, '0'); return `${hh}:${mm}`; };

  const isDateAvailable = (day: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart < today) return false;
    const windowEnd = addDays(today, rules.booking_window_days || 30);
    if (dayStart > windowEnd) return false;
    const dateStr = format(day, 'yyyy-MM-dd');
    const spec = specialDates.find(d => d.date === dateStr);
    if (spec?.is_closed) return false;
    const fullDayLeave = specialLeaves.find(l => !l.time_start && !l.time_end && dateStr >= l.date_start && dateStr <= l.date_end);
    if (fullDayLeave) return false;
    const hours = businessHours.find(h => h.day_of_week === day.getDay());
    if (!hours?.is_open) return false;
    return true;
  };

  const fetchOccupied = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    const { data } = await supabase.from('appointments').select('booking_time, service_items(duration_minutes)').eq('booking_date', targetDate).neq('status', 'cancelled'); 
    const intervals = data?.map((d: any) => {
        const startMin = parseT(d.booking_time?.slice(0, 5) || '00:00');
        const dur = d.service_items?.duration_minutes || 50;
        return { start: startMin, end: startMin + dur + (rules.buffer_time || 0) };
    }) || [];
    setOccupiedIntervals(intervals);
  }, [rules.buffer_time]);

  useEffect(() => {
    supabase.from('form_definitions').select('*').then(({ data }) => setBookingDef(data?.find(d => d.type === 'booking_form') || null));
    supabase.from('business_hours').select('*').then(({ data }) => setBusinessHours(data || []));
    supabase.from('special_dates').select('*').then(({ data }) => setSpecialDates(data || []));
    supabase.from('special_leaves').select('date_start, date_end, time_start, time_end').then(({ data }) => setSpecialLeaves(data || []));
    supabase.from('service_items').select('*').order('sort_order').then(({ data }) => setServiceItems(data || []));
    supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle().then(({ data }) => {
        if (data?.value) setRules(data.value);
    });
  }, []);

  useEffect(() => { fetchOccupied(bookingDate); }, [bookingDate, fetchOccupied]);

  useEffect(() => {
    if (!selectedServiceItem || !bookingDate || businessHours.length === 0) { setAvailableSlots([]); return; }
    const day = new Date(bookingDate).getDay();
    const spec = specialDates.find(d => d.date === bookingDate);
    if (spec?.is_closed) { setAvailableSlots([]); return; }

    const fullDayLeave = specialLeaves.find(l => !l.time_start && !l.time_end && bookingDate >= l.date_start && bookingDate <= l.date_end);
    if (fullDayLeave) { setAvailableSlots([]); return; }

    const hours = businessHours.find(h => h.day_of_week === day);
    if (!hours?.is_open) { setAvailableSlots([]); return; }

    const slots: {time: string, remaining: number}[] = [];
    let curr = parseT(hours.start_time);
    const end = parseT(hours.end_time);
    
    const interval = rules.slot_interval || 15;
    const duration = serviceDuration;
    const buffer = rules.buffer_time || 0;
    const capacity = rules.max_concurrent_bookings || 1;
    
    const cutOffTime = addHours(new Date(), rules.min_lead_time_hours || 0);

    const isBlockedByTimeSlot = (slotMin: number) => {
      const slotEnd = slotMin + duration + buffer;
      return specialLeaves.some(l => {
        if (l.time_start == null || l.time_end == null) return false;
        if (bookingDate < l.date_start || bookingDate > l.date_end) return false;
        const blockStart = parseT(l.time_start.slice(0, 5));
        const blockEnd = parseT(l.time_end.slice(0, 5));
        return slotMin < blockEnd && slotEnd > blockStart;
      });
    };

    while (curr + duration <= end) {
          const currEnd = curr + duration + buffer; // 檢查包含緩衝的時間區間
          const slotDateTime = parseISO(`${bookingDate}T${formatT(curr)}:00`);

          if (!isBefore(slotDateTime, cutOffTime) && !isBlockedByTimeSlot(curr)) {
              // 檢查此區間內與其他預約的重疊情況
              const overlapCount = occupiedIntervals.filter(occ => (curr < occ.end && currEnd > occ.start)).length;
              if (overlapCount < capacity) {
                  slots.push({ time: formatT(curr), remaining: capacity - overlapCount });
              }
          }
          curr += interval;
      }
    setAvailableSlots(slots);
  }, [bookingDate, selectedServiceItem, serviceDuration, businessHours, specialDates, specialLeaves, rules, occupiedIntervals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!customer || !bookingTime || !selectedServiceItem) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('appointments').insert([{ customer_id: customer.id, service_item_id: selectedServiceItem, booking_date: bookingDate, booking_time: bookingTime, booking_data: formData, status: 'pending' }]).select().single();
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

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  );

  if (!customer) return (
    <div className="max-w-md mx-auto mt-20 text-center p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 animate-in zoom-in-95">
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <User size={40} />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-3">請先登入</h2>
      <p className="text-slate-500 mb-8 font-medium">登入會員後才能進行預約</p>
      <button onClick={() => navigate('/customer-auth', { state: { from: '/booking' } })} className="btn-primary w-full py-5 rounded-2xl font-black shadow-lg shadow-blue-100">前往登入 / 註冊</button>
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
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">1. 選擇服務項目</label>
                        <select className="input-field rounded-2xl py-4 bg-slate-50 border-none shadow-inner w-full" value={selectedServiceItem} onChange={e => { setSelectedServiceItem(e.target.value); setBookingTime(''); }} required>
                            <option value="">請選擇服務...</option>
                            {serviceItems.map(s => <option key={s.id} value={s.id}>{s.name} {s.description && `— ${s.description}`} ({s.duration_minutes} 分鐘)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">2. 選擇預約日期</label>
                        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <button type="button" onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20} className="text-slate-600"/></button>
                                <span className="text-lg font-black text-slate-800">{format(calendarMonth, 'yyyy 年 M 月', { locale: zhTW })}</span>
                                <button type="button" onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20} className="text-slate-600"/></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {eachDayOfInterval({ start: startOfWeek(startOfMonth(calendarMonth)), end: endOfWeek(endOfMonth(calendarMonth)) }).map((day) => {
                                    const available = isDateAvailable(day);
                                    const isCurrMonth = isSameMonth(day, calendarMonth);
                                    const isSelected = format(day, 'yyyy-MM-dd') === bookingDate;
                                    const isToday = isSameDay(day, new Date());
                                    const canClick = available && isCurrMonth && !!selectedServiceItem;
                                    return (
                                        <button key={day.toISOString()} type="button" disabled={!canClick}
                                            onClick={() => canClick && setBookingDate(format(day, 'yyyy-MM-dd'))}
                                            className={`min-h-[44px] rounded-xl text-sm font-bold transition-all flex items-center justify-center
                                                ${!isCurrMonth ? 'text-slate-200' : available
                                                    ? isSelected ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-50 text-red-400 cursor-not-allowed'}
                                                ${isToday && isCurrMonth && !isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}>
                                            {format(day, 'd')}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => { const t = new Date(); setCalendarMonth(t); if (isDateAvailable(t)) setBookingDate(format(t, 'yyyy-MM-dd')); }} className="text-xs font-bold text-blue-600 hover:text-blue-700">今天</button>
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-3 h-3 rounded bg-green-200"></span>可預約</span>
                                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-3 h-3 rounded bg-red-100"></span>不可預約</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-1">3. 選擇可用時段 {selectedService && <span className="text-blue-500 normal-case">(約 {serviceDuration} 分鐘)</span>}</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {availableSlots.map(s => (
                                <button key={s.time} onClick={() => setBookingTime(s.time)} className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center ${bookingTime === s.time ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 shadow-sm'}`}>
                                    <span className="font-bold">{s.time}</span>
                                    <span className={`text-[8px] font-black uppercase mt-1 ${bookingTime === s.time ? 'text-blue-200' : 'text-slate-300'}`}>{s.remaining} 餘額</span>
                                </button>
                            ))}
                        </div>
                        {!selectedServiceItem && <p className="text-center text-slate-300 py-6 font-bold italic">請先選擇服務項目</p>}
                        {selectedServiceItem && availableSlots.length === 0 && <p className="text-center text-slate-300 py-10 font-bold italic">本日期目前無符合條件的時段</p>}
                    </div>
                </div>
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 sticky top-24">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><FileText className="text-blue-600"/> 填寫資料</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {bookingDef?.fields.filter(f => !f.isSystem).map(f => (
                        <div key={f.id}><label className="text-xs font-bold text-slate-500 mb-2 block">{f.label}</label>{f.type === 'select' ? (<select required={f.required} className="input-field bg-slate-50 border-none rounded-xl py-3" value={formData[f.label] || ''} onChange={e => setFormData({...formData, [f.label]: e.target.value})}><option value="">請選擇...</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>) : f.type === 'textarea' ? (<textarea className="input-field bg-slate-50 border-none rounded-xl py-3 min-h-[100px]" placeholder="可換行輸入" value={formData[f.label] || ''} onChange={e => setFormData({...formData, [f.label]: e.target.value})} />) : (<input className="input-field bg-slate-50 border-none rounded-xl py-3" required={f.required} type={f.type || 'text'} value={formData[f.label] || ''} onChange={e => setFormData({...formData, [f.label]: e.target.value})} />)}</div>
                    ))}
                    <div className="bg-blue-50 p-5 rounded-2xl space-y-2 border border-blue-100 shadow-inner">
                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">服務項目</span><span className="text-blue-600">{selectedService?.name || '未選擇'}</span></div>
                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">日期</span><span className="text-blue-600">{bookingDate}</span></div>
                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">時段</span><span className="text-blue-600">{bookingTime || '未選擇'}</span></div>
                    </div>
                    <button type="submit" disabled={submitting || !bookingTime || !selectedServiceItem} className="w-full btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200 disabled:opacity-30 transition-all">{submitting ? '提交中...' : '送出預約申請'}</button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};