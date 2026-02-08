import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, Zap, Coffee, Plus, Trash2, Edit3, X } from 'lucide-react';
import { useToast } from '../components/Toast';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface SpecialLeave {
  id: string;
  date_start: string;
  date_end: string;
  time_start: string | null;
  time_end: string | null;
  note: string | null;
}

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const AvailabilitySettings: React.FC = () => {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [specialLeaves, setSpecialLeaves] = useState<SpecialLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  const [rules, setRules] = useState({ 
    slot_interval: 15, 
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
        const { data: leavesRes } = await supabase.from('special_leaves').select('*').order('date_start', { ascending: true });
        
        if (hoursRes) setHours(hoursRes);
        if (rulesRes?.value) setRules(r => ({ ...r, ...rulesRes.value }));
        setSpecialLeaves(leavesRes || []);
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
              <div><h2 className="text-2xl font-black text-slate-800">排程核心參數</h2><p className="text-xs text-slate-400 font-medium">時段密集度與客間休息時間（服務時長請於「服務項目」設定）</p></div>
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

      {/* 特別休假管理 */}
      <SpecialLeaveSection leaves={specialLeaves} onRefresh={fetchData} showToast={showToast} />
    </div>
  );
};

type LeaveType = 'full_day' | 'date_range' | 'time_slot';

const SpecialLeaveSection: React.FC<{ leaves: SpecialLeave[], onRefresh: () => void, showToast: (msg: string, type?: 'error') => void }> = ({ leaves, onRefresh, showToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SpecialLeave | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('full_day');
  const [dateStart, setDateStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeStart, setTimeStart] = useState('12:00');
  const [timeEnd, setTimeEnd] = useState('14:00');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setLeaveType('full_day');
    setDateStart(format(new Date(), 'yyyy-MM-dd'));
    setDateEnd(format(new Date(), 'yyyy-MM-dd'));
    setTimeStart('12:00');
    setTimeEnd('14:00');
    setNote('');
    setShowModal(false);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (l: SpecialLeave) => {
    setEditing(l);
    const isFullDay = !l.time_start && !l.time_end;
    const isSingleDate = l.date_start === l.date_end;
    if (isFullDay && isSingleDate) setLeaveType('full_day');
    else if (isFullDay && !isSingleDate) setLeaveType('date_range');
    else setLeaveType('time_slot');
    setDateStart(l.date_start);
    setDateEnd(l.date_end);
    setTimeStart(l.time_start?.slice(0, 5) || '12:00');
    setTimeEnd(l.time_end?.slice(0, 5) || '14:00');
    setNote(l.note || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (leaveType === 'full_day') {
      if (dateStart > dateEnd) { showToast('結束日期不可早於開始日期', 'error'); return; }
    }
    if (leaveType === 'date_range') {
      if (dateStart > dateEnd) { showToast('結束日期不可早於開始日期', 'error'); return; }
    }
    if (leaveType === 'time_slot') {
      if (dateStart > dateEnd) { showToast('結束日期不可早於開始日期', 'error'); return; }
      if (timeStart >= timeEnd) { showToast('結束時段須晚於開始時段', 'error'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        date_start: dateStart,
        date_end: leaveType === 'full_day' ? dateStart : dateEnd,
        time_start: (leaveType === 'time_slot' ? timeStart : null) as string | null,
        time_end: (leaveType === 'time_slot' ? timeEnd : null) as string | null,
        note: note || null
      };
      if (editing) {
        const { error } = await supabase.from('special_leaves').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('特別休假已更新');
      } else {
        const { error } = await supabase.from('special_leaves').insert([payload]);
        if (error) throw error;
        showToast('特別休假已新增');
      }
      resetForm();
      onRefresh();
    } catch (e: any) {
      showToast(e?.message || '儲存失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此特別休假嗎？')) return;
    const { error } = await supabase.from('special_leaves').delete().eq('id', id);
    if (error) showToast('刪除失敗', 'error');
    else { showToast('已刪除'); onRefresh(); }
  };

  const formatLeaveLabel = (l: SpecialLeave) => {
    const fmt = (d: string) => format(parseISO(d), 'M/d (EEE)', { locale: zhTW });
    if (!l.time_start && !l.time_end) {
      return l.date_start === l.date_end ? `全日休假 · ${fmt(l.date_start)}` : `全日休假 · ${fmt(l.date_start)}～${fmt(l.date_end)}`;
    }
    return `${fmt(l.date_start)} ${l.time_start?.slice(0, 5)}～${l.time_end?.slice(0, 5)}`;
  };

  return (
    <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner"><CalendarIcon size={24}/></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">特別休假管理</h2>
            <p className="text-xs text-slate-400 font-medium">設定全日休假、日期區間或特定時段休假</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary px-10 py-3 rounded-2xl font-black shadow-lg shadow-amber-100 flex items-center gap-2">
          <Plus size={20}/> 新增特別休假
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaves.map(l => (
          <div key={l.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-amber-50/50 transition-all flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800">{formatLeaveLabel(l)}</div>
              {l.note && <div className="text-xs text-slate-500 mt-1 truncate">{l.note}</div>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(l)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="編輯"><Edit3 size={16}/></button>
              <button onClick={() => handleDelete(l.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="刪除"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {leaves.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm rounded-2xl bg-slate-50 border border-dashed border-slate-200">尚無特別休假，點擊上方按鈕新增</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{editing ? '編輯特別休假' : '新增特別休假'}</h3>
              <button onClick={resetForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">休假類型</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { v: 'full_day' as LeaveType, l: '全日單日' },
                    { v: 'date_range' as LeaveType, l: '日期區間' },
                    { v: 'time_slot' as LeaveType, l: '某日某時段' }
                  ].map(o => (
                    <button key={o.v} type="button" onClick={() => setLeaveType(o.v)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${leaveType === o.v ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">開始日期</label>
                  <input type="date" className="input-field rounded-2xl py-3 bg-slate-50" value={dateStart} onChange={e => { setDateStart(e.target.value); if (leaveType === 'full_day') setDateEnd(e.target.value); }} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">結束日期</label>
                  <input type="date" className="input-field rounded-2xl py-3 bg-slate-50" value={dateEnd} onChange={e => setDateEnd(e.target.value)} disabled={leaveType === 'full_day'} />
                </div>
              </div>
              {leaveType === 'time_slot' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">開始時段</label>
                    <input type="time" className="input-field rounded-2xl py-3 bg-slate-50" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">結束時段</label>
                    <input type="time" className="input-field rounded-2xl py-3 bg-slate-50" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">備註（選填）</label>
                <input type="text" className="input-field rounded-2xl py-3 bg-slate-50" placeholder="例：春節連假" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={resetForm} className="flex-1 py-3 rounded-2xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-3 rounded-2xl font-black">{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
