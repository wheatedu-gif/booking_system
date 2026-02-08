import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate, List, ChevronLeft, ChevronRight, Lock, AlertCircle, Download, Send, Edit3, X, TrendingUp, Search, ExternalLink, LayoutDashboard, FileText, StickyNote, History, CheckCircle2, CalendarPlus, BarChart3, KeyRound, Mail, Eye, Filter } from 'lucide-react';
import { AvailabilitySettings } from './AvailabilitySettings';
import { WebsiteEditor } from './WebsiteEditor';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday, isPast, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { sendNotification } from '../lib/notifications';
import { useToast } from '../components/Toast';

const STATUS_MAP: any = {
    all: '全部狀態',
    pending: '待處理',
    confirmed: '已確認',
    completed: '服務完成',
    cancelled: '已取消'
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'forms' | 'settings' | 'customers' | 'availability' | 'cms'>('home');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (activeTab === 'cms' || activeTab === 'availability') { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: apts } = await supabase.from('appointments').select('*, customers(*)').order('booking_date', { ascending: false });
      setAppointments(apts || []);
      const { data: fDefs } = await supabase.from('form_definitions').select('*').order('type');
      setFormDefs(fDefs || []);
      if (activeTab === 'customers' || activeTab === 'home') {
        const { data: custs } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        setCustomers(custs || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateAppointmentStatus = async (id: string, status: string, reason?: string) => {
    const { error } = await supabase.from('appointments').update({ status, cancellation_reason: reason || null }).eq('id', id);
    if (error) showToast('更新失敗', 'error');
    else {
      showToast(`${STATUS_MAP[status]} 更新成功`);
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
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[700px]">
          {loading && !['cms', 'availability', 'settings'].includes(activeTab) ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : activeTab === 'cms' ? <WebsiteEditor /> : (
            <div className="p-8">
                {activeTab === 'home' && <DashboardHome appointments={appointments} customers={customers} />}
                {activeTab === 'appointments' && <AppointmentManager appointments={appointments} onStatusChange={updateAppointmentStatus} onRefresh={fetchData} formDefs={formDefs} />}
                {activeTab === 'availability' && <AvailabilitySettings />}
                {activeTab === 'forms' && <FormManager formDefs={formDefs} onRefresh={fetchData} />}
                {activeTab === 'settings' && <SettingsManager />}
                {activeTab === 'customers' && <CustomerManager customers={customers} onRefresh={fetchData} allAppointments={appointments} formDefs={formDefs} />}
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

const DashboardHome: React.FC<{ appointments: Appointment[], customers: any[] }> = ({ appointments, customers }) => {
    const stats = {
        today: appointments.filter(a => isToday(parseISO(a.booking_date)) && a.status !== 'cancelled').length,
        pending: appointments.filter(a => a.status === 'pending').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        newMonth: customers.filter(c => isSameMonth(parseISO(c.created_at), new Date())).length
    };
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">營運儀表板</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<CalendarIcon />} title="今日預約" value={stats.today} color="blue" />
                <StatCard icon={<AlertCircle />} title="待處理" value={stats.pending} color="amber" />
                <StatCard icon={<CheckCircle2 />} title="已完成" value={stats.completed} color="green" />
                <StatCard icon={<Users />} title="本月新客" value={stats.newMonth} color="purple" />
            </div>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 min-h-[300px] flex flex-col">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2"><BarChart3 size={16}/> 預約趨勢</h3>
                <p className="text-slate-400 text-sm">此處為示意趨勢圖空間</p>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number, color: string }> = ({ icon, title, value, color }) => {
    const cMap: any = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600' };
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cMap[color]}`}>{icon}</div>
            <div><div className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</div><div className="text-4xl font-black text-slate-800 mt-1">{value}</div></div>
        </div>
    );
};

const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void, onRefresh: () => void, formDefs: FormDefinition[] }> = ({ appointments, onStatusChange, onRefresh, formDefs }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  
  const filtered = appointments.filter(apt => {
      const matchSearch = (apt as any).customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || apt.booking_date.includes(searchTerm);
      const matchStatus = statusFilter === 'all' || apt.status === statusFilter;
      return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96"><input type="text" placeholder="搜尋姓名、Email、日期..." className="input-field pl-12 py-3 bg-slate-50 border-none rounded-2xl w-full focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search size={20} className="absolute left-4 top-3.5 text-slate-300" /></div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0"><button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>列表模式</button><button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>日曆模式</button></div>
      </div>

      {/* 狀態篩選列 */}
      <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS_MAP).map(key => (
              <button 
                key={key} 
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${statusFilter === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'}`}
              >
                  {STATUS_MAP[key]}
              </button>
          ))}
      </div>

      {viewMode === 'calendar' ? <AppointmentCalendar appointments={filtered} onSelect={setSelectedApt} /> : (
        <div className="overflow-hidden border border-slate-100 rounded-3xl"><table className="w-full text-left border-collapse"><thead className="bg-slate-50/50"><tr><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">時間</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">客戶</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">狀態</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">動作</th></tr></thead><tbody className="divide-y divide-slate-50">{filtered.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedApt(apt)}><td className="py-5 px-6"><div className="font-bold text-slate-700">{apt.booking_date}</div><div className="text-blue-500 text-xs font-medium">{apt.booking_time.slice(0,5)}</div></td><td className="py-5 px-6"><div className="font-bold text-slate-700">{(apt as any).customers?.full_name}</div><div className="text-slate-400 text-xs font-medium">{(apt as any).customers?.email}</div></td><td className="py-5 px-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : apt.status === 'completed' ? 'bg-slate-100 text-slate-600' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{STATUS_MAP[apt.status] || apt.status}</span></td><td className="py-5 px-6 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    {apt.status === 'pending' && <button onClick={() => onStatusChange(apt.id, 'confirmed')} className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold">確認</button>}
                    {apt.status === 'confirmed' && isPast(parseISO(apt.booking_date)) && <button onClick={() => onStatusChange(apt.id, 'completed')} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold">服務完成</button>}
                    {apt.status !== 'cancelled' && apt.status !== 'completed' && <button onClick={() => { const r = window.prompt('原因'); if(r!==null) onStatusChange(apt.id, 'cancelled', r); }} className="text-slate-400 hover:text-red-500 font-bold text-xs">取消</button>}
                </div></td></tr>))}</tbody></table></div>
      )}
      {selectedApt && <AppointmentDetailModal apt={selectedApt} onClose={() => setSelectedApt(null)} onStatusChange={onStatusChange} onRefresh={onRefresh} />}
    </div>
  );
};

const AppointmentDetailModal: React.FC<{ apt: Appointment, onClose: () => void, onStatusChange: (id: string, s: string, r?: string) => void, onRefresh: () => void }> = ({ apt, onClose, onStatusChange, onRefresh }) => {
    const customer = (apt as any).customers;
    const { showToast } = useToast();
    const [notes, setNotes] = useState(apt.admin_notes || '');
    const saveNotes = async () => { await supabase.from('appointments').update({ admin_notes: notes }).eq('id', apt.id); showToast('筆記已更新'); onRefresh(); };
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="bg-slate-900 p-10 text-white flex justify-between items-start"><div><div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">預約詳情</div><h3 className="text-3xl font-black">{customer?.full_name}</h3><p className="text-slate-400 mt-1">{customer?.email}</p></div><button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X /></button></div><div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10"><section className="space-y-6"><div className="flex gap-4 items-start"><Clock className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約時間</div><div className="text-lg font-bold">{apt.booking_date} {apt.booking_time.slice(0,5)}</div></div><div className="flex gap-4 items-start"><AlertCircle className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">當前狀態</div><div className="text-lg font-bold uppercase">{STATUS_MAP[apt.status]}</div></div></section><section className="bg-slate-50 rounded-3xl p-6"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">填寫內容</h4><div className="space-y-3">{Object.entries(apt.booking_data || {}).map(([k, v]) => (<div key={k} className="flex justify-between text-sm border-b border-slate-200/50 pb-2"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800">{String(v)}</span></div>))}</div></section></div><div className="bg-slate-50 p-8 flex justify-end gap-4">{apt.status === 'pending' && <button onClick={() => { onStatusChange(apt.id, 'confirmed'); onClose(); }} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black">確認預約</button>}{apt.status === 'confirmed' && <button onClick={() => { onStatusChange(apt.id, 'completed'); onClose(); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black">服務完成</button>}<button onClick={onClose} className="text-slate-400 font-bold px-4 hover:text-slate-600">關閉</button></div></div></div>
    );
};

const AppointmentCalendar: React.FC<{ appointments: Appointment[], onSelect: (a: Appointment) => void }> = ({ appointments, onSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
  // 關鍵：日曆僅顯示已確認預約
  const getDayAppointments = (day: Date) => appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day) && apt.status === 'confirmed');
  return (
    <div className="bg-white animate-in fade-in duration-500"><div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-slate-800">{format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}</h3><div className="flex gap-2"><button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft/></button><button onClick={() => setCurrentDate(new Date())} className="px-5 py-1 text-sm font-bold text-blue-600">今天</button><button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronRight/></button></div></div><div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">{calendarDays.map((day, idx) => (<div key={idx} className={`min-h-[140px] p-3 bg-white ${isSameMonth(day, monthStart) ? '' : 'bg-slate-50/50 opacity-40'}`}><div className={`text-right text-xs font-bold mb-3 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-300'}`}>{format(day, 'd')}</div><div className="space-y-1.5">{getDayAppointments(day).map(apt => <div key={apt.id} className="text-[10px] p-2 rounded-xl border-l-4 border-green-500 bg-green-50 text-green-700 font-bold cursor-pointer hover:scale-105 transition-transform" onClick={() => onSelect(apt)}>{apt.booking_time.slice(0,5)} {(apt as any).customers?.full_name}</div>)}</div></div>))}</div></div>
  );
};

// ... (FormManager, SettingsManager, CustomerManager 保持現狀，僅更新中文狀態顯示) ...

const CustomerManager: React.FC<{ customers: any[], onRefresh: () => void, allAppointments: Appointment[], formDefs: FormDefinition[] }> = ({ customers, onRefresh, allAppointments, formDefs }) => {
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [viewHistory, setViewHistory] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const filtered = customers.filter(c => c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-8 animate-in fade-in duration-500"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Users className="text-blue-600" /> 會員資料庫</h2><div className="relative w-full md:w-80"><input type="text" placeholder="搜尋姓名、Email..." className="input-field pl-12 py-3 bg-slate-50 border-none rounded-2xl w-full focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search size={20} className="absolute left-4 top-3.5 text-slate-300" /></div></div><div className="grid gap-4">{filtered.map(c => (
          <div key={c.id} className="p-6 bg-slate-50/50 rounded-[2rem] flex justify-between items-center border border-slate-50 hover:bg-white transition-all group"><div className="flex items-center gap-5 cursor-pointer" onClick={() => setViewHistory(c)}><div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shadow-blue-200/50">{c.full_name[0]}</div><div><div className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">{c.full_name} <History size={14} className="text-slate-300" /></div><div className="text-xs text-slate-400 font-bold">{c.email}</div></div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingCustomer(c)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="編輯資料"><Edit3 size={20} /></button></div></div>
        ))}</div>
      {viewHistory && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setViewHistory(null)}><div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="bg-blue-600 p-8 text-white flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-xl">{viewHistory.full_name[0]}</div><div><h3 className="text-xl font-black">{viewHistory.full_name} 的預約歷程</h3><p className="text-blue-100 text-xs">帳號：{viewHistory.email}</p></div></div><button onClick={() => setViewHistory(null)} className="p-2 hover:bg-white/10 rounded-full"><X/></button></div><div className="p-8 overflow-y-auto flex-1 space-y-4">{allAppointments.filter(a => a.customer_id === viewHistory.id).map(a => (<div key={a.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100"><div><div className="font-bold text-slate-800">{a.booking_date} {a.booking_time.slice(0,5)}</div></div><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : a.status === 'completed' ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-600'}`}>{STATUS_MAP[a.status]}</span></div>))}</div></div></div>)}
    </div>
  );
};
