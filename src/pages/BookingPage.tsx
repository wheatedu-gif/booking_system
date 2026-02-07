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

  // 動態表單資料
  const [customerDef, setCustomerDef] = useState<FormDefinition | null>(null);
  const [bookingDef, setBookingDef] = useState<FormDefinition | null>(null);
  
  // 填寫的資料
  const [customProfileData, setCustomProfileData] = useState<Record<string, any>>({});
  const [bookingData, setBookingData] = useState<Record<string, any>>({});

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // 安全地計算可預約的最大日期
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
    // 檢查是否登入，未登入則踢回客戶登入頁
    if (!authLoading && !customer) {
      navigate('/login');
    }
  }, [customer, authLoading, navigate]);

  useEffect(() => {
    // 載入表單與營業時間設定
    const fetchAll = async () => {
      try {
        // 載入表單定義
        const { data: defs } = await supabase.from('form_definitions').select('*');
        if (defs) {
          setCustomerDef(defs.find(d => d.type === 'customer_profile') || null);
          setBookingDef(defs.find(d => d.type === 'booking_form') || null);
        }
        
        // 載入營業時間
        const { data: hours } = await supabase.from('business_hours').select('*');
        if (hours) setBusinessHours(hours);

        // 載入特殊日期
        const { data: dates } = await supabase.from('special_dates').select('*');
        if (dates) setSpecialDates(dates);

        // 載入預約規則
        const { data: rules } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
        if (rules?.value) setBookingRules(rules.value);
      } catch (e) {
        console.error('Error fetching configuration:', e);
      }
    };
    fetchAll();
  }, []);

  // 當日期改變時，重新計算時段
  useEffect(() => {
    if (bookingDate && businessHours.length > 0) {
      generateTimeSlots(bookingDate);
    }
  }, [bookingDate, businessHours, specialDates, bookingRules]);

  // Helper Functions
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
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...

    // 1. 檢查是否有特殊例外 (公休或調整)
    const special = specialDates.find(d => d.date === dateStr);
    
    if (special && special.is_closed) {
      setAvailableSlots([]); // 當日公休
      setBookingTime('');
      return;
    }

    // 2. 取得當日營業規則
    let start = '09:00';
    let end = '18:00';
    let breakStart = null;
    let breakEnd = null;

    if (special) {
      // 特殊營業時間
      start = special.start_time || start;
      end = special.end_time || end;
    } else {
      // 常規營業時間
      const regular = businessHours.find(h => h.day_of_week === dayOfWeek);
      if (!regular || !regular.is_open) {
        setAvailableSlots([]); // 常規公休
        setBookingTime('');
        return;
      }
      start = regular.start_time;
      end = regular.end_time;
      breakStart = regular.break_start;
      breakEnd = regular.break_end;
    }

    // 3. 產生時段 (根據 time_slot_minutes)
    const slots: string[] = [];
    let current = parseTime(start);
    const endTime = parseTime(end);
    const bStart = breakStart ? parseTime(breakStart) : -1;
    const bEnd = breakEnd ? parseTime(breakEnd) : -1;
    const step = bookingRules.time_slot_minutes || 60; // 預設 60

    // 防止無窮迴圈
    let count = 0;
    while (current < endTime && count < 96) { // 96 slots = 24h / 15min
      count++;
      // 檢查是否在午休時間內 (如果時段的開始時間在午休內)
      // 邏輯優化：如果 current 時間點落在午休區間，就直接跳到午休結束時間
      if (bStart !== -1 && bEnd !== -1 && current >= bStart && current < bEnd) {
        current = bEnd; // 直接跳過午休
        continue;
      }
      
      // 確保時段結束時間不超過營業結束時間
      if (current + step <= endTime) {
         slots.push(formatTime(current));
      }
      
      current += step; 
    }
    
    setAvailableSlots(slots);
    
    // 自動選擇第一個時段，如果目前選的無效
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
      // 建立預約
      const { data: aptData, error: aptError } = await supabase.from('appointments').insert([
        {
          customer_id: customer.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_data: { ...bookingData, ...customProfileData },
          status: 'pending'
        }
      ]).select().single();

      if (aptError) throw aptError;

      setSuccessId(aptData.id);

    } catch (err: any) {
      alert('預約失敗：' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getGoogleCalendarUrl = () => {
    if (!bookingTime) return '#';
    const start = `${bookingDate.replace(/-/g, '')}T${bookingTime.replace(/:/g, '')}00`;
    // 結束時間 +1 小時
    const [h, m] = bookingTime.split(':').map(Number);
    const endH = h + 1;
    const endTimeStr = `${endH.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}00`;
    const end = `${bookingDate.replace(/-/g, '')}T${endTimeStr}`;
    
    const text = encodeURIComponent('預約服務');
    const details = encodeURIComponent(`預約人: ${customer?.full_name}\n預約編號: ${successId}`);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&sf=true&output=xml`;
  };

  if (authLoading) return <div className="p-12 text-center">載入中...</div>;

  if (successId) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-2xl shadow-lg border border-green-100">
        <div className="text-green-500 mb-6 flex justify-center">
          <CheckCircle size={80} className="drop-shadow-sm" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">預約已提交！</h2>
        <p className="text-slate-600 mb-8 text-lg">
          感謝您的預約，<span className="font-semibold">{customer?.full_name}</span>。<br/>
          我們已收到您的資訊。
        </p>
        
        <div className="space-y-4">
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg shadow-lg shadow-blue-200"
          >
            <ExternalLink size={20} /> 加入 Google 行事曆
          </a>
          <button
            onClick={() => {
                setSuccessId(null);
                // 重新載入時段狀態
                if (bookingDate && businessHours.length > 0) {
                    generateTimeSlots(bookingDate);
                }
                navigate('/booking');
            }}
            className="w-full py-3 text-slate-500 font-medium hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            再次預約
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-slate-500">歡迎回來，</span>
            <span className="font-bold text-slate-800">{customer?.full_name}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-red-500 hover:underline flex items-center gap-1">
            <LogOut size={14}/> 登出
          </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-8 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8" /> 預約服務
          </h1>
          <p className="text-green-100 mt-2 text-lg">
            請選擇您方便的時段
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* 客戶動態欄位 */}
          {customerDef?.fields && customerDef.fields.length > 0 && (
             <section>
               <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <User size={20} className="text-green-600" /> 補充資料
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                  {customerDef.fields.map(field => (
                    <div key={field.id} className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.type}
                        required={field.required}
                        className="input-field"
                        defaultValue={customer?.custom_data?.[field.label] || ''} 
                        onChange={e => setCustomProfileData({...customProfileData, [field.label]: e.target.value})}
                      />
                    </div>
                  ))}
               </div>
             </section>
          )}

          {/* 預約時間 */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-green-600" /> 選擇時間與內容
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日期 <span className="text-red-500">*</span></label>
                <div className="text-xs text-slate-500 mb-1">開放預約至 {maxDateStr}</div>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={bookingDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={maxDateStr} // 限制最大日期
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">時段 ({bookingRules.time_slot_minutes}分鐘) <span className="text-red-500">*</span></label>
                {availableSlots.length > 0 ? (
                  <select
                    className="input-field"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  >
                    {availableSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-100">
                    本日已無可預約時段或公休
                  </div>
                )}
              </div>
            </div>

            {/* 預約動態欄位 */}
            {bookingDef?.fields && bookingDef.fields.length > 0 && (
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                   <FileText size={16} /> 其他預約需求
                </h4>
                {bookingDef.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      className="input-field"
                      onChange={(e) => setBookingData({ ...bookingData, [field.label]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-4 text-xl font-bold shadow-lg shadow-green-200 mt-8"
          >
            {submitting ? '提交預約中...' : '確認送出預約'}
          </button>
        </form>
      </div>
    </div>
  );
};
