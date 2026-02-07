import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2, Calendar as CalendarIcon, Settings, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '../components/Toast';

interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface SpecialDate {
  id: string;
  date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string;
}

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const AvailabilitySettings: React.FC = () => {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  const [rules, setRules] = useState({ 
    time_slot_minutes: 60, 
    booking_window_days: 30,
    max_concurrent_bookings: 1,
    allow_customer_cancel: true,
    cancel_before_hours: 24
  });
  
  const [newDate, setNewDate] = useState('');
  const [newDateNote, setNewDateNote] = useState('店休');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: hoursData } = await supabase.from('business_hours').select('*').order('day_of_week');
        const { data: datesData } = await supabase.from('special_dates').select('*').order('date');
        const { data: rulesData } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
        
        if (hoursData) setHours(hoursData);
        if (datesData) setSpecialDates(datesData);
        if (rulesData?.value) setRules({ ...rules, ...rulesData.value });
    } catch(e) {}
    setLoading(false);
  };

  const saveRules = async () => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'booking_rules', value: rules });
    if (error) showToast('儲存失敗', 'error'); else showToast('預約規則已更新');
  };

  const saveHours = async () => {
    const { error } = await supabase.from('business_hours').upsert(hours);
    if (error) showToast('儲存失敗', 'error'); else showToast('營業時間已更新');
  };

  const addSpecialDate = async () => {
    if (!newDate) return;
    const { error } = await supabase.from('special_dates').insert([{ date: newDate, note: newDateNote, is_closed: true }]);
    if (error) showToast('新增失敗', 'error');
    else { setNewDate(''); setNewDateNote('店休'); fetchData(); showToast('例外日期已新增'); }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* 預約核心規則 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Settings className="text-blue-600" /> 預約核心規則</h2>
          <button onClick={saveRules} className="btn-primary px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">儲存所有規則</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">每場服務時長 (分鐘)</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner" value={rules.time_slot_minutes} onChange={(e) => setRules({ ...rules, time_slot_minutes: parseInt(e.target.value) || 60 })} /></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">開放預約天數</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner" value={rules.booking_window_days} onChange={(e) => setRules({ ...rules, booking_window_days: parseInt(e.target.value) || 30 })} /></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">同時段最大容納人數</label><input type="number" min="1" className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white shadow-inner" value={rules.max_concurrent_bookings || 1} onChange={(e) => setRules({ ...rules, max_concurrent_bookings: parseInt(e.target.value) || 1 })} /></div>
        </div>

        {/* 新增：客戶取消政策 */}
        <div className="mt-10 pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3"><ShieldAlert className="text-amber-500"/><span className="font-bold text-slate-700">允許客戶自行取消</span></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={rules.allow_customer_cancel} onChange={e => setRules({...rules, allow_customer_cancel: e.target.checked})} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">開啟後，客戶可以在「我的預約」頁面中看到取消按鈕並自主操作。</p>
            </div>
            <div className={`p-6 rounded-[2rem] border transition-all ${rules.allow_customer_cancel ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-50 opacity-30 pointer-events-none'}`}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">最晚取消期限 (預約前 X 小時)</label>
                <div className="relative">
                    <input type="number" className="input-field bg-white border-none rounded-2xl py-4 shadow-sm" value={rules.cancel_before_hours} onChange={e => setRules({...rules, cancel_before_hours: parseInt(e.target.value) || 0})} />
                    <span className="absolute right-4 top-4 text-xs font-bold text-slate-300 uppercase">Hours</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-3 font-medium italic">* 預設 24 小時，即預約前一天內不可自行取消。</p>
            </div>
        </div>
      </section>

      {/* 常規營業時間 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Clock className="text-indigo-600" /> 每週常規營業時間</h2>
          <button onClick={saveHours} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">儲存營業時間</button>
        </div>
        <div className="grid gap-4">
          {hours.map((day, index) => (
            <div key={day.day_of_week} className={`flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-[2rem] border transition-all ${day.is_open ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-transparent grayscale opacity-60'}`}>
              <div className="w-28 font-black text-slate-700 flex items-center gap-3">
                <input type="checkbox" checked={day.is_open} onChange={(e) => { const n = [...hours]; n[index].is_open = e.target.checked; setHours(n); }} className="w-6 h-6 text-blue-600 rounded-lg border-slate-300" />
                {DAYS[day.day_of_week]}
              </div>
              {day.is_open ? (
                <div className="flex-1 flex flex-wrap gap-8 items-center">
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">營業</span><div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.start_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].start_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.end_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].end_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">休息</span><div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.break_start?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_start = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.break_end?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_end = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                </div>
              ) : <div className="text-slate-400 font-bold italic flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[10px] uppercase tracking-widest">Closed / 本日公休</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 特殊公休日 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8"><CalendarIcon className="text-red-500" /> 特殊公休日管理</h2>
        <div className="bg-slate-50 p-8 rounded-3xl mb-8 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">選擇日期</label><input type="date" className="input-field bg-white rounded-2xl py-4" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
            <div className="flex-1 space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">公休備註</label><input type="text" className="input-field bg-white rounded-2xl py-4" value={newDateNote} onChange={e => setNewDateNote(e.target.value)} /></div>
            <button onClick={addSpecialDate} disabled={!newDate} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all disabled:opacity-30">新增公休日期</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialDates.map(date => (
                <div key={date.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex justify-between items-center group hover:border-red-100 transition-all"><div><div className="text-lg font-black text-slate-800">{date.date}</div><div className="text-xs font-bold text-red-500 mt-1 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> {date.note}</div></div><button onClick={() => { supabase.from('special_dates').delete().eq('id', date.id).then(() => fetchData()); }} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button></div>
            ))}
        </div>
      </section>
    </div>
  );
};