import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { FormDefinition } from '../types';
import { Calendar, Clock, CheckCircle, ExternalLink, FileText, User, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const BookingPage: React.FC = () => {
  const { customer, loading: authLoading, logout } = useCustomer();
  const navigate = useNavigate();

  // 基礎預約資訊
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('');
  
  // 動態時段邏輯
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [bookingRules, setBookingRules] = useState({ time_slot_minutes: 60, booking_window_days: 30 });

  // 表單欄位定義
  const [bookingDef, setBookingDef] = useState<FormDefinition | null>(null);
  
  // 填寫的資料
  const [formData, setFormData] = useState<Record<string, any>>({});

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const getMaxDateStr = () => {
    try {
      const days = bookingRules?.booking_window_days || 30;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + days);
      return format(maxDate, 'yyyy-MM-dd');
    } catch (e) {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const maxDateStr = getMaxDateStr();

  useEffect(() => {
    if (!authLoading && !customer) {
      navigate('/login');
    }
  }, [customer, authLoading, navigate]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: defs } = await supabase.from('form_definitions').select('*');
        if (defs) {
          setBookingDef(defs.find(d => d.type === 'booking_form') || null);
        }
        
        const { data: hours } = await supabase.from('business_hours').select('*');
        if (hours) setBusinessHours(hours);

        const { data: dates } = await supabase.from('special_dates').select('*');
        if (dates) setSpecialDates(dates);

        const { data: rules } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
        if (rules?.value) setBookingRules(rules.value);
      } catch (e) {
        console.error('Error fetching configuration:', e);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (bookingDate && businessHours.length > 0) {
      generateTimeSlots(bookingDate);
    }
  }, [bookingDate, businessHours, specialDates, bookingRules]);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const generateTimeSlots = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    const special = specialDates.find(d => d.date === dateStr);
    
    if (special && special.is_closed) {
      setAvailableSlots([]);
      setBookingTime('');
      return;
    }

    let start = '09:00';
    let end = '18:00';
    let breakStart = null;
    let breakEnd = null;

    if (special) {
      start = special.start_time || start;
      end = special.end_time || end;
    } else {
      const regular = businessHours.find(h => h.day_of_week === dayOfWeek);
      if (!regular || !regular.is_open) {
        setAvailableSlots([]);
        setBookingTime('');
        return;
      }
      start = regular.start_time;
      end = regular.end_time;
      breakStart = regular.break_start;
      breakEnd = regular.break_end;
    }

    const slots: string[] = [];
    let current = parseTime(start);
    const endTime = parseTime(end);
    const bStart = breakStart ? parseTime(breakStart) : -1;
    const bEnd = breakEnd ? parseTime(breakEnd) : -1;
    const step = bookingRules.time_slot_minutes || 60;

    let count = 0;
    while (current < endTime && count < 96) { 
      count++;
      if (bStart !== -1 && bEnd !== -1 && current >= bStart && current < bEnd) {
        current = bEnd;
        continue;
      }
      if (current + step <= endTime) {
         slots.push(formatTime(current));
      }
      current += step; 
    }
    
    setAvailableSlots(slots);
    if (slots.length > 0) {
      if (!bookingTime || !slots.includes(bookingTime)) {
        setBookingTime(slots[0]);
      }
    } else {
      setBookingTime('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!bookingTime) {
      alert('請選擇預約時段');
      return;
    }
    setSubmitting(true);

    try {
      const { data: aptData, error: aptError } = await supabase.from('appointments').insert([
        {
          customer_id: customer.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_data: formData,
          status: 'pending'
        }
      ]).select().single();

      import { sendNotification } from '../lib/notifications';

      

      // ... (省略中間代碼)

      

            if (aptError) throw aptError;

      

            // 發送新預約通知

            await sendNotification(aptData.id, 'new');

      

            setSuccessId(aptData.id);

      
    } catch (err: any) {
      alert('預約失敗：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getGoogleCalendarUrl = () => {
    if (!bookingTime) return '#';
    const start = `${bookingDate.replace(/-/g, '')}T${bookingTime.replace(/:/g, '')}00`;
    const [h, m] = bookingTime.split(':').map(Number);
    const end = `${bookingDate.replace(/-/g, '')}T${(h + 1).toString().padStart(2, '0')}${m.toString().padStart(2, '0')}00`;
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('預約服務')}&dates=${start}/${end}&details=${encodeURIComponent('預約人: ' + customer?.full_name)}&sf=true&output=xml`;
  };

  if (authLoading) return <div className="p-12 text-center">載入中...</div>;

  if (successId) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-2xl shadow-lg border border-green-100">
        <div className="text-green-500 mb-6 flex justify-center"><CheckCircle size={80} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">預約已提交！</h2>
        <p className="text-slate-600 mb-8 text-lg">感謝您的預約，<span className="font-semibold">{customer?.full_name}</span>。</p>
        <div className="space-y-4">
          <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"><ExternalLink size={20} /> 加入 Google 行事曆</a>
          <button onClick={() => { setSuccessId(null); navigate('/booking'); }} className="w-full py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-lg">再次預約</button>
        </div>
      </div>
    );
  }

  // 取得特定系統欄位的標籤
  const getLabel = (name: string, defaultLabel: string) => {
    return bookingDef?.fields.find(f => (f as any).name === name)?.label || defaultLabel;
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-6">
          <div><span className="text-slate-500">歡迎回來，</span><span className="font-bold text-slate-800">{customer?.full_name}</span></div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-red-500 hover:underline flex items-center gap-1"><LogOut size={14}/> 登出</button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-8 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Calendar /> 預約服務</h1>
          <p className="text-green-100 mt-2 text-lg">請選擇您方便的時段</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-green-600" /> 選擇時間與內容</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{getLabel('date', '預約日期')} <span className="text-red-500">*</span></label>
                <div className="text-xs text-slate-500 mb-1">開放預約至 {maxDateStr}</div>
                <input type="date" required className="input-field" value={bookingDate} min={format(new Date(), 'yyyy-MM-dd')} max={maxDateStr} onChange={(e) => setBookingDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{getLabel('time', '預約時間')} <span className="text-red-500">*</span></label>
                {availableSlots.length > 0 ? (
                  <select className="input-field" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}>
                    {availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-100">本日已無可預約時段或公休</div>}
              </div>
            </div>

            {/* 其他自定義欄位 */}
            {bookingDef?.fields.filter((f:any) => !f.isSystem).map((field) => (
              <div key={field.id} className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                <input type={field.type} required={field.required} className="input-field" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} />
              </div>
            ))}
          </section>

          <button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-4 text-xl font-bold shadow-lg shadow-green-200 mt-8">
            {submitting ? '提交預約中...' : '確認送出預約'}
          </button>
        </form>
      </div>
    </div>
  );
};