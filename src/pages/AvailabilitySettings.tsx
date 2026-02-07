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
  const [rules, setRules] = useState({ time_slot_minutes: 60, booking_window_days: 30 });
  
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
    const { data: rulesData } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').single();
    
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
      is_closed: true // 預設為公休
    }]);
    
    if (error) alert('新增失敗: ' + error.message);
    else {
      setNewDate('');
      setNewDateNote('');
      fetchData();
    }
  };

  const deleteSpecialDate = async (id: string) => {
    await supabase.from('special_dates').delete().eq('id', id);
    fetchData();
  };

  const updateSpecialDate = async (id: string, updates: Partial<SpecialDate>) => {
    await supabase.from('special_dates').update(updates).eq('id', id);
    // 為了流暢體驗，這裡直接更新本地 state，不重抓
    setSpecialDates(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-8">
      {/* 0. 預約規則設定 */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-purple-600" size={24} /> 預約規則設定
          </h2>
          <button onClick={saveRules} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Save size={16} /> 儲存規則
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">預約時段間隔 (分鐘)</label>
            <div className="text-xs text-slate-500 mb-2">例如設定 30，則選項為 09:00, 09:30, 10:00...</div>
            <select 
              className="input-field"
              value={rules.time_slot_minutes}
              onChange={(e) => setRules({ ...rules, time_slot_minutes: parseInt(e.target.value) })}
            >
              <option value="15">15 分鐘</option>
              <option value="30">30 分鐘</option>
              <option value="60">60 分鐘 (1小時)</option>
              <option value="120">120 分鐘 (2小時)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">開放預約天數 (Booking Window)</label>
            <div className="text-xs text-slate-500 mb-2">例如設定 30，客戶只能預約未來 30 天內的日期</div>
            <div className="relative">
               <input 
                 type="number" 
                 min="1" 
                 max="365"
                 className="input-field pr-12"
                 value={rules.booking_window_days}
                 onChange={(e) => setRules({ ...rules, booking_window_days: parseInt(e.target.value) })}
               />
               <span className="absolute right-4 top-2 text-slate-500 text-sm">天</span>
            </div>
          </div>
        </div>
      </section>

      {/* 1. 常規營業時間 */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" /> 常規營業時間
          </h2>
          <button onClick={saveHours} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Save size={16} /> 儲存設定
          </button>
        </div>

        <div className="space-y-4">
          {hours.map((day, index) => (
            <div key={day.day_of_week} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-24 font-bold text-slate-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={(e) => {
                    const newHours = [...hours];
                    newHours[index].is_open = e.target.checked;
                    setHours(newHours);
                  }}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                {DAYS[day.day_of_week]}
              </div>

              {day.is_open ? (
                <div className="flex-1 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">營業:</span>
                    <input
                      type="time"
                      value={day.start_time.slice(0, 5)}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[index].start_time = e.target.value;
                        setHours(newHours);
                      }}
                      className="input-field w-32"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="time"
                      value={day.end_time.slice(0, 5)}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[index].end_time = e.target.value;
                        setHours(newHours);
                      }}
                      className="input-field w-32"
                    />
                  </div>

                  <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                    <span className="text-sm text-slate-500">午休 (選填):</span>
                    <input
                      type="time"
                      value={day.break_start?.slice(0, 5) || ''}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[index].break_start = e.target.value || null;
                        setHours(newHours);
                      }}
                      className="input-field w-32"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="time"
                      value={day.break_end?.slice(0, 5) || ''}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[index].break_end = e.target.value || null;
                        setHours(newHours);
                      }}
                      className="input-field w-32"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 font-medium italic">本日公休</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. 特殊日期/假日 */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <CalendarIcon className="text-red-500" /> 特殊日期 / 公休設定
        </h2>

        <div className="flex gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">選擇日期</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">備註 (例如: 春節)</label>
            <input type="text" value={newDateNote} onChange={e => setNewDateNote(e.target.value)} className="input-field" placeholder="公休原因..." />
          </div>
          <button onClick={addSpecialDate} className="btn-primary py-2 px-4 h-10 flex items-center gap-1">
            <Plus size={16} /> 新增
          </button>
        </div>

        <div className="space-y-3">
          {specialDates.map((sd) => (
            <div key={sd.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
              <div className="w-32 font-bold text-slate-700">{sd.date}</div>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={sd.is_closed}
                    onChange={() => updateSpecialDate(sd.id, { is_closed: true })}
                    className="text-red-500"
                  />
                  <span className={sd.is_closed ? 'text-red-600 font-bold' : 'text-slate-600'}>公休</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="radio"
                    checked={!sd.is_closed}
                    onChange={() => updateSpecialDate(sd.id, { is_closed: false })}
                    className="text-green-500"
                  />
                  <span className={!sd.is_closed ? 'text-green-600 font-bold' : 'text-slate-600'}>調整營業時間</span>
                </label>
              </div>

              {!sd.is_closed && (
                 <div className="flex items-center gap-1 ml-4">
                    <input 
                      type="time" 
                      value={sd.start_time?.slice(0,5) || '09:00'} 
                      onChange={(e) => updateSpecialDate(sd.id, { start_time: e.target.value })}
                      className="input-field w-24 py-1 text-sm" 
                    />
                    -
                    <input 
                      type="time" 
                      value={sd.end_time?.slice(0,5) || '18:00'} 
                      onChange={(e) => updateSpecialDate(sd.id, { end_time: e.target.value })}
                      className="input-field w-24 py-1 text-sm" 
                    />
                 </div>
              )}

              <div className="flex-1 text-slate-500 text-sm px-4 border-l border-slate-200 ml-4">
                 {sd.note}
              </div>

              <button onClick={() => deleteSpecialDate(sd.id)} className="text-slate-400 hover:text-red-500 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {specialDates.length === 0 && <div className="text-center text-slate-400 py-4">無特殊日期設定</div>}
        </div>
      </section>
    </div>
  );
};
