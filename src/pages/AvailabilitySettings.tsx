import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2, Calendar as CalendarIcon, Settings } from 'lucide-react';
import { format } from 'date-fns';

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
  
  // 預約規則
  const [rules, setRules] = useState({ 
    time_slot_minutes: 60, 
    booking_window_days: 30,
    max_concurrent_bookings: 1 
  });
  
  // 新增例外日期
  const [newDate, setNewDate] = useState('');
  const [newDateNote, setNewDateNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: hoursData } = await supabase.from('business_hours').select('*').order('day_of_week');
    const { data: datesData } = await supabase.from('special_dates').select('*').order('date');
    const { data: rulesData } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
    
    if (hoursData) setHours(hoursData);
    if (datesData) setSpecialDates(datesData);
    if (rulesData?.value) setRules(rulesData.value);
    setLoading(false);
  };

  const saveRules = async () => {
    const { error } = await supabase.from('system_settings').upsert({ 
        key: 'booking_rules', 
        value: rules 
    });
    if (error) alert('儲存失敗: ' + error.message);
    else alert('預約規則已更新');
  };

  const saveHours = async () => {
    const { error } = await supabase.from('business_hours').upsert(hours);
    if (error) alert('儲存失敗: ' + error.message);
    else alert('營業時間已更新');
  };

  const addSpecialDate = async () => {
    if (!newDate) return;
    const { error } = await supabase.from('special_dates').insert([{
      date: newDate,
      note: newDateNote,
      is_closed: true
    }]);
    if (error) alert('新增失敗');
    else { setNewDate(''); setNewDateNote(''); fetchData(); }
  };

  const deleteSpecialDate = async (id: string) => {
    await supabase.from('special_dates').delete().eq('id', id);
    fetchData();
  };

  const updateSpecialDate = async (id: string, updates: Partial<SpecialDate>) => {
    await supabase.from('special_dates').update(updates).eq('id', id);
    setSpecialDates(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-purple-600" /> 預約規則設定</h2>
          <button onClick={saveRules} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"><Save size={16} /> 儲存規則</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">預約時段間隔 (分鐘)</label>
            <input type="number" className="input-field" value={rules.time_slot_minutes} onChange={(e) => setRules({ ...rules, time_slot_minutes: parseInt(e.target.value) || 60 })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">開放預約天數</label>
            <input type="number" className="input-field" value={rules.booking_window_days} onChange={(e) => setRules({ ...rules, booking_window_days: parseInt(e.target.value) || 30 })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">同時段最大人數 (容量)</label>
            <input type="number" min="1" className="input-field" value={rules.max_concurrent_bookings || 1} onChange={(e) => setRules({ ...rules, max_concurrent_bookings: parseInt(e.target.value) || 1 })} />
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarIcon className="text-blue-600" /> 常規營業時間</h2>
          <button onClick={saveHours} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"><Save size={16} /> 儲存設定</button>
        </div>
        <div className="space-y-4">
          {hours.map((day, index) => (
            <div key={day.day_of_week} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-24 font-bold text-slate-700 flex items-center gap-2"><input type="checkbox" checked={day.is_open} onChange={(e) => { const n = [...hours]; n[index].is_open = e.target.checked; setHours(n); }} className="w-5 h-5 text-blue-600 rounded" />{DAYS[day.day_of_week]}</div>
              {day.is_open ? (
                <div className="flex-1 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2"><span className="text-sm text-slate-500">營業:</span><input type="time" value={day.start_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].start_time = e.target.value; setHours(n); }} className="input-field w-32" /><span className="text-slate-400">-</span><input type="time" value={day.end_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].end_time = e.target.value; setHours(n); }} className="input-field w-32" /></div>
                  <div className="flex items-center gap-2 border-l pl-4 border-slate-200"><span className="text-sm text-slate-500">午休:</span><input type="time" value={day.break_start?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_start = e.target.value || null; setHours(n); }} className="input-field w-32" /><span className="text-slate-400">-</span><input type="time" value={day.break_end?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_end = e.target.value || null; setHours(n); }} className="input-field w-32" /></div>
                </div>
              ) : <span className="text-slate-400 font-medium italic">本日公休</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};