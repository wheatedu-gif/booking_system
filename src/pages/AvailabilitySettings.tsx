import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2, Calendar as CalendarIcon, Settings, AlertCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
    max_concurrent_bookings: 1 
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
        if (rulesData?.value) setRules(rulesData.value);
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
    const { error } = await supabase.from('special_dates').insert([{
      date: newDate,
      note: newDateNote,
      is_closed: true
    }]);
    if (error) showToast('新增失敗', 'error');
    else { setNewDate(''); setNewDateNote('店休'); fetchData(); showToast('例外日期已新增'); }
  };

  const deleteSpecialDate = async (id: string) => {
    await supabase.from('special_dates').delete().eq('id', id);
    fetchData();
    showToast('例外日期已刪除');
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* 預約規則 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Settings className="text-blue-600" /> 預約核心規則</h2>
          <button onClick={saveRules} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100">儲存規則</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">時段間隔 (分鐘)</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4" value={rules.time_slot_minutes} onChange={(e) => setRules({ ...rules, time_slot_minutes: parseInt(e.target.value) || 60 })} /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">開放天數 (視窗)</label><input type="number" className="input-field bg-slate-50 border-none rounded-2xl py-4" value={rules.booking_window_days} onChange={(e) => setRules({ ...rules, booking_window_days: parseInt(e.target.value) || 30 })} /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">同時段人數上限</label><input type="number" min="1" className="input-field bg-slate-50 border-none rounded-2xl py-4" value={rules.max_concurrent_bookings || 1} onChange={(e) => setRules({ ...rules, max_concurrent_bookings: parseInt(e.target.value) || 1 })} /></div>
        </div>
      </section>

      {/* 營業時間 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Clock className="text-indigo-600" /> 每週常規營業時間</h2>
          <button onClick={saveHours} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100">儲存設定</button>
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
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">營業時段</span><div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.start_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].start_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.end_time.slice(0, 5)} onChange={(e) => { const n = [...hours]; n[index].end_time = e.target.value; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase">休息/午休</span><div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100"><input type="time" value={day.break_start?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_start = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /><span className="text-slate-300">-</span><input type="time" value={day.break_end?.slice(0, 5) || ''} onChange={(e) => { const n = [...hours]; n[index].break_end = e.target.value || null; setHours(n); }} className="bg-transparent border-none text-sm font-bold p-1 focus:ring-0" /></div></div>
                </div>
              ) : <div className="text-slate-400 font-bold italic flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-xs uppercase tracking-widest">Closed / 本日公休</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 例外日期 */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8"><CalendarIcon className="text-red-500" /> 特殊公休日/例外管理</h2>
        
        <div className="bg-slate-50 p-8 rounded-3xl mb-8 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">選擇日期</label>
                <input type="date" className="input-field bg-white rounded-2xl py-4" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="flex-1 space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">備註 (例如：員工旅遊)</label>
                <input type="text" className="input-field bg-white rounded-2xl py-4" value={newDateNote} onChange={e => setNewDateNote(e.target.value)} placeholder="店休 / 國定假日" />
            </div>
            <button onClick={addSpecialDate} disabled={!newDate} className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all disabled:opacity-30">新增公休</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialDates.map(date => (
                <div key={date.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex justify-between items-center group hover:border-red-100 transition-all">
                    <div>
                        <div className="text-lg font-black text-slate-800">{date.date}</div>
                        <div className="text-xs font-bold text-red-500 mt-1 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> {date.note}</div>
                    </div>
                    <button onClick={() => deleteSpecialDate(date.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                </div>
            ))}
            {specialDates.length === 0 && <div className="col-span-full p-12 text-center text-slate-300 font-bold italic">目前沒有設定例外日期</div>}
        </div>
      </section>
    </div>
  );
};
