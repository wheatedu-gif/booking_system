import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { FormDefinition } from '../types';
import { Calendar, Clock, CheckCircle, ExternalLink, FileText, User, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { sendNotification } from '../lib/notifications';

export const BookingPage: React.FC = () => {
  const { customer, loading: authLoading, logout } = useCustomer();
  const navigate = useNavigate();

  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [bookingRules, setBookingRules] = useState({ time_slot_minutes: 60, booking_window_days: 30 });
  const [occupiedIntervals, setOccupiedIntervals] = useState<{start: number, end: number}[]>([]);

  const [bookingDef, setBookingDef] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 封裝查詢佔用邏輯
  const fetchOccupied = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    const { data } = await supabase
        .from('appointments')
        .select('booking_time')
        .eq('booking_date', targetDate)
        .neq('status', 'cancelled'); 
    
    const serviceDuration = bookingRules.time_slot_minutes || 60;
    const intervals = data?.map(d => {
        const startMin = parseTime(d.booking_time.slice(0, 5));
        return { start: startMin, end: startMin + serviceDuration };
    }) || [];
    setOccupiedIntervals(intervals);
  }, [bookingRules]);

  useEffect(() => {
    if (!authLoading && !customer) navigate('/login');
  }, [customer, authLoading, navigate]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: defs } = await supabase.from('form_definitions').select('*');
        if (defs) setBookingDef(defs.find(d => d.type === 'booking_form') || null);
        const { data: hours } = await supabase.from('business_hours').select('*');
        if (hours) setBusinessHours(hours);
        const { data: dates } = await supabase.from('special_dates').select('*');
        if (dates) setSpecialDates(dates);
        const { data: rules } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
        if (rules?.value) setBookingRules(rules.value);
      } catch (e) { console.error(e); }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    fetchOccupied(bookingDate);
  }, [bookingDate, fetchOccupied]);

  useEffect(() => {
    if (bookingDate && businessHours.length > 0) {
      generateTimeSlots(bookingDate);
    }
  }, [bookingDate, businessHours, specialDates, bookingRules, occupiedIntervals]);

  const generateTimeSlots = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const special = specialDates.find(d => d.date === dateStr);
    if (special && special.is_closed) { setAvailableSlots([]); setBookingTime(''); return; }

    let start = '09:00', end = '18:00', bStart = -1, bEnd = -1;
    if (special) {
      start = special.start_time || start; end = special.end_time || end;
    } else {
      const regular = businessHours.find(h => h.day_of_week === dayOfWeek);
      if (!regular || !regular.is_open) { setAvailableSlots([]); setBookingTime(''); return; }
      start = regular.start_time; end = regular.end_time;
      if (regular.break_start && regular.break_end) { bStart = parseTime(regular.break_start); bEnd = parseTime(regular.break_end); }
    }

    const slots: string[] = [];
    let current = parseTime(start);
    const endTime = parseTime(end);
    const step = bookingRules.time_slot_minutes || 60;

    let count = 0;
    while (current < endTime && count < 96) { 
      count++;
      const currentEnd = current + step;
      if (bStart !== -1 && bEnd !== -1 && current < bEnd && currentEnd > bStart) {
         current = bEnd; continue;
      }
      if (currentEnd <= endTime) {
         const isOccupied = occupiedIntervals.some(interval => current < interval.end && currentEnd > interval.start);
         if (!isOccupied) slots.push(formatTime(current));
      }
      current += step; 
    }
    setAvailableSlots(slots);
    if (slots.length > 0 && (!bookingTime || !slots.includes(bookingTime))) setBookingTime(slots[0]);
    else if (slots.length === 0) setBookingTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !bookingTime) return;
    setSubmitting(true);
    try {
      const { data: aptData, error: aptError } = await supabase.from('appointments').insert([{
          customer_id: customer.id, booking_date: bookingDate, booking_time: bookingTime, booking_data: formData, status: 'pending'
      }]).select().single();
      if (aptError) throw aptError;
      
      // 先觸發 Email
      await sendNotification(aptData.id, 'new');
      
      // 成功後立即重新查詢佔用狀態
      await fetchOccupied(bookingDate);
      
      setSuccessId(aptData.id);
    } catch (err: any) { alert('預約失敗：' + err.message); }
    finally { setSubmitting(false); }
  };

  const maxDateStr = format(new Date(new Date().setDate(new Date().getDate() + (bookingRules.booking_window_days || 30))), 'yyyy-MM-dd');

  if (authLoading) return <div className="p-12 text-center">載入中...</div>;

  if (successId) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-2xl shadow-lg border border-green-100">
        <div className="text-green-500 mb-6 flex justify-center"><CheckCircle size={80} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">預約已提交！</h2>
        <p className="text-slate-600 mb-8 text-lg">感謝您的預約，<span className="font-semibold">{customer?.full_name}</span>。</p>
        <div className="space-y-4">
          <button onClick={() => { 
              setSuccessId(null); 
              setBookingTime(''); 
              setFormData({});
              fetchOccupied(bookingDate); // 點擊再次預約時，再次強制刷新
          }} className="w-full btn-primary py-4 text-lg font-bold shadow-lg shadow-blue-200">再次預約</button>
          <button onClick={() => navigate('/my-appointments')} className="w-full py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-lg border border-slate-200">查看預約紀錄</button>
        </div>
      </div>
    );
  }

  const getLabel = (name: string, defaultLabel: string) => {
    return bookingDef?.fields?.find((f: any) => f.name === name)?.label || defaultLabel;
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-6">
          <div><span className="text-slate-500">歡迎回來，</span><span className="font-bold text-slate-800">{customer?.full_name}</span></div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-red-500 hover:underline flex items-center gap-1"><LogOut size={14}/> 登出</button>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Calendar /> 預約服務</h1>
          <p className="text-blue-100 mt-2 text-lg">請選擇日期與時段</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{getLabel('date', '預約日期')} <span className="text-red-500">*</span></label>
              <input type="date" required className="input-field" value={bookingDate} min={format(new Date(), 'yyyy-MM-dd')} max={maxDateStr} onChange={(e) => setBookingDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{getLabel('time', '預約時間')} <span className="text-red-500">*</span></label>
              {availableSlots.length > 0 ? (
                <select className="input-field" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}>
                  {availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-100 font-bold">本日已無可用時段</div>}
            </div>
          </div>
          {bookingDef?.fields?.filter((f:any) => !f.isSystem).map((field: any) => (
            <div key={field.id} className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
              {field.type === 'select' ? (
                <select required={field.required} className="input-field" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}>
                  <option value="">請選擇...</option>
                  {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : <input type={field.type} required={field.required} className="input-field" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} />}
            </div>
          ))}
          <button type="submit" disabled={submitting} className="w-full btn-primary py-4 text-xl font-bold shadow-lg shadow-blue-200 mt-8">
            {submitting ? '提交預約中...' : '確認送出預約'}
          </button>
        </form>
      </div>
    </div>
  );
};