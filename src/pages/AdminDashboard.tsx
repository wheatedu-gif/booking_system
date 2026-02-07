import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate, List, ChevronLeft, ChevronRight, Lock, AlertCircle, Download, Send, Edit3, X, TrendingUp, Search, ExternalLink, LayoutDashboard, FileText } from 'lucide-react';
import { AvailabilitySettings } from './AvailabilitySettings';
import { WebsiteEditor } from './WebsiteEditor';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { sendNotification } from '../lib/notifications';
import { useToast } from '../components/Toast';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'forms' | 'settings' | 'customers' | 'availability' | 'cms'>('home');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (activeTab === 'cms' || activeTab === 'availability') {
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      if (activeTab === 'appointments' || activeTab === 'home') {
        const { data } = await supabase.from('appointments').select('*, customers(*)').order('booking_date', { ascending: false });
        setAppointments(data || []);
      }
      if (activeTab === 'forms') {
        const { data } = await supabase.from('form_definitions').select('*').order('type');
        setFormDefs(data || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateAppointmentStatus = async (id: string, status: string, reason?: string) => {
    const { error } = await supabase.from('appointments').update({ status, cancellation_reason: reason || null }).eq('id', id);
    if (error) showToast('更新失敗', 'error');
    else {
      showToast(status === 'confirmed' ? '已確認並發送通知' : '已取消預約');
      await sendNotification(id, status === 'cancelled' ? 'cancel' : 'update');
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-2 shrink-0">
          <SidebarButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<LayoutDashboard size={20}/>} label="營運概況" />
          <SidebarButton active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} icon={<CalendarIcon size={20}/>} label="預約管理" />
          <SidebarButton active={activeTab === 'availability'} onClick={() => setActiveTab('availability')} icon={<Clock size={20}/>} label="時段設定" />
          <SidebarButton active={activeTab === 'cms'} onClick={() => setActiveTab('cms')} icon={<LayoutTemplate size={20}/>} label="內容編輯" />
          <SidebarButton active={activeTab === 'forms'} onClick={() => setActiveTab('forms')} icon={<FormInput size={20}/>} label="表單設定" />
          <SidebarButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20}/>} label="客戶管理" />
          <SidebarButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系統設定" />
        </div>
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[700px]">
          {loading && activeTab !== 'cms' && activeTab !== 'availability' ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : activeTab === 'cms' ? <WebsiteEditor /> : (
            <div className="p-8">
                {activeTab === 'home' && <DashboardHome appointments={appointments} />}
                {activeTab === 'appointments' && <AppointmentManager appointments={appointments} onStatusChange={updateAppointmentStatus} />}
                {activeTab === 'availability' && <AvailabilitySettings />}
                {activeTab === 'forms' && <FormManager formDefs={formDefs} onRefresh={fetchData} />}
                {activeTab === 'settings' && <SettingsManager />}
                {activeTab === 'customers' && <CustomerManager />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]' : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
    {icon}<span>{label}</span>
  </button>
);

const DashboardHome: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
    const stats = {
        today: appointments.filter(a => isToday(parseISO(a.booking_date)) && a.status !== 'cancelled').length,
        pending: appointments.filter(a => a.status === 'pending').length,
        total: appointments.filter(a => a.status === 'confirmed').length,
        newMonth: appointments.filter(a => isSameMonth(parseISO(a.created_at), new Date())).length
    };
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">營運儀表板</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<CalendarIcon />} title="今日預約" value={stats.today} color="blue" />
                <StatCard icon={<AlertCircle />} title="待處理" value={stats.pending} color="amber" />
                <StatCard icon={<TrendingUp />} title="已完成" value={stats.total} color="green" />
                <StatCard icon={<Users />} title="本月新客" value={stats.newMonth} color="purple" />
            </div>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6">近期預約動態</h3>
                <div className="space-y-3">
                    {appointments.slice(0, 5).map(apt => (
                        <div key={apt.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-white hover:border-blue-100 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold">{(apt as any).customers?.full_name?.[0]}</div>
                                <div><div className="font-bold text-slate-800">{(apt as any).customers?.full_name}</div><div className="text-xs text-slate-400">{apt.booking_date} {apt.booking_time.slice(0,5)}</div></div>
                            </div>
                            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500">{apt.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number, color: string }> = ({ icon, title, value, color }) => {
    const bgColors: any = { blue: 'bg-blue-50', amber: 'bg-amber-50', green: 'bg-green-50', purple: 'bg-purple-50' };
    const textColors: any = { blue: 'text-blue-600', amber: 'text-amber-600', green: 'text-green-600', purple: 'text-purple-600' };
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${bgColors[color]} ${textColors[color]}`}>{icon}</div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</div>
            <div className="text-4xl font-black text-slate-800 mt-1">{value}</div>
        </div>
    );
};

const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const filteredApts = appointments.filter(apt => (apt as any).customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || (apt as any).customers?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || apt.booking_date.includes(searchTerm));
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6">
        <div className="relative w-full md:w-96"><input type="text" placeholder="搜尋姓名、Email 或日期..." className="input-field pl-12 py-3 bg-slate-50 border-none rounded-2xl w-full focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search size={20} className="absolute left-4 top-3.5 text-slate-300" /></div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0"><button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><List size={18} />列表</button><button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CalendarIcon size={18} />日曆</button></div>
      </div>
      {viewMode === 'calendar' ? <AppointmentCalendar appointments={filteredApts} onStatusChange={onStatusChange} onSelect={setSelectedApt} /> : (
        <div className="overflow-hidden border border-slate-100 rounded-3xl"><table className="w-full text-left border-collapse"><thead className="bg-slate-50/50"><tr><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">時間</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">客戶</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">狀態</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">動作</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredApts.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedApt(apt)}><td className="py-5 px-6"><div className="font-bold text-slate-700">{apt.booking_date}</div><div className="text-blue-500 text-xs font-medium">{apt.booking_time.slice(0,5)}</div></td><td className="py-5 px-6"><div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors flex items-center gap-2">{(apt as any).customers?.full_name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div><div className="text-slate-400 text-xs">{(apt as any).customers?.email}</div></td><td className="py-5 px-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}</span></td><td className="py-5 px-6 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">{apt.status === 'pending' && <button onClick={() => onStatusChange(apt.id, 'confirmed')} className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm shadow-green-100 hover:bg-green-600 transition-all">確認</button>}{apt.status !== 'cancelled' && <button onClick={() => { const r = window.prompt('原因'); if(r !== null) onStatusChange(apt.id, 'cancelled', r); }} className="text-slate-400 hover:text-red-500 font-bold text-xs">取消</button>}</div></td></tr>))}</tbody></table></div>
      )}
      {selectedApt && <AppointmentDetailModal apt={selectedApt} onClose={() => setSelectedApt(null)} onStatusChange={onStatusChange} />}
    </div>
  );
};

const AppointmentDetailModal: React.FC<{ apt: Appointment, onClose: () => void, onStatusChange: (id: string, s: string, r?: string) => void }> = ({ apt, onClose, onStatusChange }) => {
    const customer = (apt as any).customers;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="bg-slate-900 p-10 text-white flex justify-between items-start"><div><div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">預約詳情</div><h3 className="text-3xl font-black">{customer?.full_name}</h3><p className="text-slate-400 mt-1">{customer?.email}</p></div><button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X /></button></div><div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10"><section className="space-y-6"><div className="flex gap-4 items-start"><Clock className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約時間</div><div className="text-lg font-bold">{apt.booking_date} {apt.booking_time.slice(0,5)}</div></div><div className="flex gap-4 items-start"><AlertCircle className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">當前狀態</div><div className="text-lg font-bold uppercase">{apt.status}</div></div></section><section className="bg-slate-50 rounded-3xl p-6"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">客戶填寫內容</h4><div className="space-y-3">{Object.entries(apt.booking_data || {}).map(([k, v]) => (<div key={k} className="flex justify-between text-sm border-b border-slate-200/50 pb-2"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800">{String(v)}</span></div>))}</div></section></div><div className="bg-slate-50 p-8 flex justify-end gap-4">{apt.status === 'pending' && <button onClick={() => { onStatusChange(apt.id, 'confirmed'); onClose(); }} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-green-200 hover:bg-green-700 transition-all">確認預約</button>}{apt.status !== 'cancelled' && <button onClick={() => { const r = window.prompt('原因'); if(r!==null) { onStatusChange(apt.id, 'cancelled', r); onClose(); } }} className="bg-white text-red-500 border border-red-100 px-8 py-3 rounded-2xl font-black transition-all">取消預約</button>}<button onClick={onClose} className="text-slate-400 font-bold px-4 hover:text-slate-600">關閉</button></div></div></div>
    );
};

const AppointmentCalendar: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void, onSelect: (a: Appointment) => void }> = ({ appointments, onStatusChange, onSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
  const getDayAppointments = (day: Date) => appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day) && apt.status !== 'cancelled');
  return (
    <div className="bg-white animate-in fade-in duration-500"><div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-slate-800">{format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}</h3><div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border"><button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronLeft size={20}/></button><button onClick={() => setCurrentDate(new Date())} className="px-5 py-1 text-sm font-bold text-blue-600">今天</button><button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronRight size={20}/></button></div></div><div className="grid grid-cols-7 mb-4 text-center text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}</div><div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">{calendarDays.map((day, idx) => (<div key={idx} className={`min-h-[140px] p-3 bg-white ${isSameMonth(day, monthStart) ? '' : 'bg-slate-50/50 opacity-40'}`}><div className={`text-right text-xs font-bold mb-3 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-300'}`}>{format(day, 'd')}</div><div className="space-y-1.5">{getDayAppointments(day).map(apt => <div key={apt.id} className={`text-[10px] p-2 rounded-xl border-l-4 shadow-sm truncate font-bold cursor-pointer hover:scale-105 transition-transform ${apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-blue-50 text-blue-700 border-blue-500'}`} onClick={() => onSelect(apt)}>{apt.booking_time.slice(0,5)} {(apt as any).customers?.full_name}</div>)}</div></div>))}</div></div>
  );
};

const FormManager: React.FC<{ formDefs: FormDefinition[], onRefresh: () => void }> = ({ formDefs, onRefresh }) => {
  const [editingDef, setEditingDef] = useState<FormDefinition | null>(null);
  const { showToast } = useToast();
  const handleSave = async () => {
    if (!editingDef) return;
    const { error } = await supabase.from('form_definitions').update({ fields: editingDef.fields }).eq('id', editingDef.id);
    if (error) showToast('儲存失敗', 'error'); else { showToast('表單設定已儲存'); setEditingDef(null); onRefresh(); }
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-500"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><FormInput className="text-blue-600" /> 表單自定義管理</h2>{!editingDef ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{formDefs.map(def => (<div key={def.id} className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all group"><h3 className="font-bold text-xl text-slate-700 mb-4 flex items-center gap-3">{def.type === 'customer_profile' ? <Users /> : <CalendarIcon />}{def.type === 'customer_profile' ? '客戶註冊資料' : '預約填寫內容'}</h3><button onClick={() => setEditingDef(def)} className="w-full bg-white text-blue-600 border-2 border-blue-50 px-4 py-4 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm">編輯欄位</button></div>))}</div>) : (<div className="space-y-6"><div className="flex justify-between items-center bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100"><div><h3 className="font-bold text-xl">正在編輯：{editingDef.type}</h3><p className="text-xs text-blue-100 mt-2 font-medium opacity-80 flex items-center gap-1"><Lock size={12}/> 系統核心欄位已鎖定類型。</p></div><div className="flex gap-3"><button onClick={() => setEditingDef(null)} className="px-6 py-2 text-white font-bold hover:bg-white/10 rounded-xl transition-all">取消</button><button onClick={handleSave} className="bg-white text-blue-600 px-10 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all">儲存變更</button></div></div><div className="grid gap-4">{editingDef.fields.map((field: any, index) => (<div key={field.id} className={`flex gap-6 p-6 rounded-3xl border transition-all ${field.isSystem ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}><div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block flex items-center gap-1">{field.isSystem && <Lock size={10} />} 顯示標籤</label><input className="input-field bg-white" value={field.label} onChange={(e) => { const n = [...editingDef.fields]; n[index].label = e.target.value; setEditingDef({ ...editingDef, fields: n }); }} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">類型</label><div className="mt-1 text-sm font-bold text-slate-600 px-5 py-4 bg-slate-100/50 rounded-2xl border border-slate-100">{field.type} {field.isSystem && ' (核心)'}</div></div></div>{!field.isSystem && <button onClick={() => { const n = editingDef.fields.filter((_:any, i:any) => i !== index); setEditingDef({ ...editingDef, fields: n }); }} className="text-red-400 p-4 mt-8 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={24} /></button>}</div>))}</div><button onClick={() => { const n: FormField = { id: Math.random().toString(36).substr(2,9), name: `f_${Date.now()}`, label: '新欄位', type: 'text', required: false }; setEditingDef({ ...editingDef, fields: [...editingDef.fields, n] }); }} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center justify-center gap-3">增加更多欄位</button></div>)}</div>
  );
};

const SettingsManager: React.FC = () => {
  const [activeSubTab, setActiveSubSubTab] = useState<'smtp' | 'templates'>('smtp');
  const [config, setConfig] = useState({ enabled: false, user: '', pass: '', from_name: '' });
  const [templates, setTemplates] = useState({ new_booking: { subject: '', body: '' }, confirmed: { subject: '', body: '' }, cancelled: { subject: '', body: '' } });
  const [testing, setTesting] = useState(false);
  const { showToast } = useToast();
  useEffect(() => {
    supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates']).then(({ data }) => {
        data?.forEach(d => {
            if (d.key === 'email_config') setConfig(d.value);
            if (d.key === 'email_templates') setTemplates(d.value);
        });
    });
  }, []);
  const saveSettings = async () => { await supabase.from('system_settings').upsert([{ key: 'email_config', value: config }, { key: 'email_templates', value: templates }]); showToast('系統設定已儲存'); };
  const handleTestEmail = async () => {
    if (!config.user || !config.pass) { showToast('請填寫帳密', 'error'); return; }
    setTesting(true);
    try {
        await supabase.from('system_settings').upsert({ key: 'email_config', value: config });
        const { error } = await supabase.functions.invoke('notify', { body: { type: 'test', target_email: config.user } });
        if (error) throw error;
        showToast('測試郵件已送出！');
    } catch (err: any) { showToast('發送失敗：' + err.message, 'error'); } finally { setTesting(false); }
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Settings className="text-blue-600" /> 通知系統設定</h2><div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200"><button onClick={() => setActiveSubSubTab('smtp')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'smtp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>SMTP 帳號</button><button onClick={() => setActiveSubSubTab('templates')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>郵件範本</button></div></div>
      <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm max-w-2xl">
        {activeSubTab === 'smtp' ? (
            <div className="space-y-6"><label className="flex items-center gap-5 p-5 bg-white rounded-3xl cursor-pointer border border-slate-100 hover:border-blue-200 transition-all shadow-sm"><input type="checkbox" className="w-6 h-6 text-blue-600 rounded-xl" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} /><div className="flex-1"><div className="font-bold text-slate-700">啟用 Email 自動通知</div></div></label><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">寄件者名稱</label><input className="input-field bg-white" value={config.from_name} onChange={e => setConfig({...config, from_name: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">Gmail 帳號</label><input className="input-field bg-white" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">Gmail 應用程式密碼</label><input type="password" placeholder="16 位密碼" className="input-field bg-white" value={config.pass} onChange={e => setConfig({...config, pass: e.target.value})} /></div></div>
        ) : (
            <div className="space-y-8"><TemplateEditor label="新預約通知" tpl={templates.new_booking} onChange={v => setTemplates({...templates, new_booking: v})} hint="{name}, {date}, {time}" /><TemplateEditor label="確認成功通知" tpl={templates.confirmed} onChange={v => setTemplates({...templates, confirmed: v})} hint="{name}, {date}, {time}" /><TemplateEditor label="取消通知" tpl={templates.cancelled} onChange={v => setTemplates({...templates, cancelled: v})} hint="{name}, {date}, {time}, {reason}" /></div>
        )}
        <div className="flex gap-4 pt-8 border-t border-slate-200 mt-8">{activeSubTab === 'smtp' && <button onClick={handleTestEmail} disabled={testing} className="flex-1 bg-white text-slate-600 border-2 border-slate-100 py-4 rounded-2xl font-bold hover:bg-slate-50 hover:text-blue-600 transition-all">{testing ? '發送中...' : <><Send size={18} /> 測試發信</>}</button>}<button onClick={saveSettings} className="flex-1 btn-primary py-4 font-black rounded-2xl text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-200">儲存所有設定</button></div>
      </div>
    </div>
  );
};

const TemplateEditor: React.FC<{ label: string, tpl: any, onChange: (v: any) => void, hint: string }> = ({ label, tpl, onChange, hint }) => (
    <div className="space-y-3"><div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700">{label}</label><span className="text-[10px] text-slate-400 italic">可用變數: {hint}</span></div><input className="input-field bg-white text-sm" placeholder="郵件主旨" value={tpl.subject} onChange={e => onChange({...tpl, subject: e.target.value})} /><textarea className="input-field bg-white text-sm" rows={3} placeholder="郵件內容" value={tpl.body} onChange={e => onChange({...tpl, body: e.target.value})} /></div>
);

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const { showToast } = useToast();
  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
  }, []);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('customers').update({ full_name: editingCustomer.full_name, phone: editingCustomer.phone, email: editingCustomer.email }).eq('id', editingCustomer.id);
    if (error) showToast('更新失敗', 'error'); else { showToast('會員資料已更新'); setEditingCustomer(null); fetchCustomers(); }
  };
  const downloadCSV = () => {
    if (!customers.length) return;
    const csvContent = "姓名,Email,電話,註冊時間\n" + customers.map(c => [c.full_name, c.email, c.phone || '', new Date(c.created_at).toLocaleDateString()].join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `客戶清單_${format(new Date(), 'yyyyMMdd')}.csv`; link.click();
  };
  return (
    <div className="space-y-8 relative animate-in fade-in duration-500"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Users className="text-blue-600" /> 會員資料庫</h2><button onClick={downloadCSV} className="flex items-center gap-2 px-6 py-2 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm border border-slate-100 hover:bg-white transition-all shadow-sm"><Download size={18}/> 匯出 CSV</button></div><div className="grid gap-4">{customers.map(c => (<div key={c.id} className="p-6 bg-slate-50/50 rounded-[2rem] flex justify-between items-center border border-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group"><div className="flex items-center gap-5"><div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shadow-blue-200/50">{c.full_name[0]}</div><div><div className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{c.full_name}</div><div className="text-xs text-slate-400 font-bold">{c.email} {c.phone && `| ${c.phone}`}</div></div></div><button onClick={() => setEditingCustomer(c)} className="opacity-0 group-hover:opacity-100 transition-all p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit3 size={20} /></button></div>))}</div>{editingCustomer && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">修改會員資料</h3><button onClick={() => setEditingCustomer(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X /></button></div><form onSubmit={handleUpdate} className="space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">會員姓名</label><input className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white" value={editingCustomer.full_name} onChange={e => setEditingCustomer({...editingCustomer, full_name: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">電子郵件</label><input className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white" value={editingCustomer.email} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">聯絡電話</label><input className="input-field bg-slate-50 border-none rounded-2xl py-4 focus:bg-white" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div><div className="flex gap-4 pt-6"><button type="button" onClick={() => setEditingCustomer(null)} className="flex-1 py-4 text-slate-400 font-bold">取消</button><button type="submit" className="flex-1 btn-primary py-4 rounded-2xl font-black shadow-xl shadow-blue-200">確認儲存</button></div></form></div></div>)}</div>
  );
};
