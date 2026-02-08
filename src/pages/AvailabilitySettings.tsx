import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Calendar as CalendarIcon, Settings, Clock, ShieldAlert, Zap, Hourglass, Coffee } from 'lucide-react';
import { useToast } from '../components/Toast';

interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const AvailabilitySettings: React.FC = () => {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  const [rules, setRules] = useState({ 
    slot_interval: 15, 
    service_duration: 50, 
    buffer_time: 10, // 緩衝休息時間
    booking_window_days: 30,
    min_lead_time_hours: 2,
    max_concurrent_bookings: 1,
    allow_customer_cancel: true,
    cancel_before_hours: 24
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: hoursRes } = await supabase.from('business_hours').select('*').order('day_of_week');
        const { data: rulesRes } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
        
        if (hoursRes) setHours(hoursRes);
        if (rulesRes?.value) setRules({ ...rules, ...rulesRes.value });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const saveRules = async () => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'booking_rules', value: rules });
    if (error) showToast('規則儲存失敗', 'error'); else showToast('預約排程規則已更新');
  };

  const saveHours = async () => {
    const { error } = await supabase.from('business_hours').upsert(hours);
    if (error) showToast('營業時間儲存失敗', 'error'); else showToast('常規營業時間已更新');
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* 排程核心參數 */}
      <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Zap size={24}/></div>
              <div><h2 className="text-2xl font-black text-slate-800">排程核心參數</h2><p className="text-xs text-slate-400 font-medium">決定時段密集度、服務時長與客間休息時間</p></div>
          </div>
          <button onClick={saveRules} className="btn-primary px-10 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">儲存規則</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">時段間隔 (分鐘)</label>
              <select className="input-field bg-slate-50 border-none rounded-2xl py-4 font-bold" value={rules.slot_interval} onChange={e => setRules({...rules, slot_interval: parseInt(e.target.value)})}>
                  <option value={15}>每 15 分鐘一格</option>
                  <option value={30}>每 30 分鐘一格</option>
                  <option value={60}>每 60 分鐘一格</option>
              </select>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-blue-600">服務時長 (分鐘)</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner font-bold" value={rules.service_duration} onChange={e => setRules({...rules, service_duration: parseInt(e.target.value) || 0})} /></div>
          
          <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-emerald-600 flex items-center gap-1"><Coffee size={10}/> 緩衝休息 (分鐘)</label>
              <div className="relative">
                <input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner font-bold" value={rules.buffer_time} onChange={e => setRules({...rules, buffer_time: parseInt(e.target.value) || 0})} />
                <span className="absolute right-4 top-4 text-[10px] font-black text-slate-300 uppercase">Mins</span>
              </div>
          </div>

          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">提前預約 (小時)</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner font-bold" value={rules.min_lead_time_hours} onChange={e => setRules({...rules, min_lead_time_hours: parseInt(e.target.value) || 0})} /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">開放預約天數</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner font-bold" value={rules.booking_window_days} onChange={e => setRules({...rules, booking_window_days: parseInt(e.target.value) || 30})} /></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">同時段容納人數</label><input type="number" min="1" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner font-bold" value={rules.max_concurrent_bookings} onChange={e => setRules({...rules, max_concurrent_bookings: parseInt(e.target.value) || 1})} /></div>
        </div>
      </section>

      {/* 營業時間 */}
      <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Clock size={24}/></div><div><h2 className="text-2xl font-black text-slate-800">週常營業時間</h2><p className="text-xs text-slate-400 font-medium">設定每週固定開放預約的時段</p></div></div>
          <button onClick={saveHours} className="btn-primary px-10 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95">儲存時間</button>
        </div>
        <div className="grid gap-4">
          {hours.map((day, index) => (
            <div key={day.day_of_week} className={`flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-[2rem] border transition-all ${day.is_open ? 'bg-white border-slate-100' : 'bg-slate-50/50 grayscale opacity-40'}`}>
              <div className="w-28 font-black text-slate-700 flex items-center gap-3">
                <input type="checkbox" checked={day.is_open} onChange={(e) => { const n = [...hours]; n[index].is_open = e.target.checked; setHours(n); }} className="w-6 h-6 text-blue-600 rounded-lg" />{DAYS[day.day_of_week]}
              </div>
              {day.is_open ? (
                <div className="flex-1 flex flex-wrap gap-8 items-center">
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">營業時段</span><div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.start_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].start_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.end_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].end_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">中間休息</span><div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.break_start?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_start = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.break_end?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_end = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                </div>
              ) : <div className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest px-4 py-2 bg-slate-100 rounded-xl">Closed / 店休中</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
