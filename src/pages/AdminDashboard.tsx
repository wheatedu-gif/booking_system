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
      const { data: aptRes } = await supabase.from('appointments').select('*, customers(*)').order('booking_date', { ascending: false });
      setAppointments(aptRes || []);
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
          {loading && !['cms', 'availability', 'settings', 'home'].includes(activeTab) ? (
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

    // 計算未來 7 天的趨勢數據
    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(new Date(), i);
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
            label: format(d, 'MM/dd'),
            count: appointments.filter(a => a.booking_date === dateStr && a.status !== 'cancelled').length
        };
    });
    const maxCount = Math.max(...next7Days.map(d => d.count), 1);

    const total = appointments.length || 1;
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">營運儀表板</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<CalendarIcon />} title="今日預約" value={stats.today} color="blue" />
                <StatCard icon={<AlertCircle />} title="待處理" value={stats.pending} color="amber" />
                <StatCard icon={<CheckCircle2 />} title="已完成服務" value={stats.completed} color="green" />
                <StatCard icon={<Users />} title="本月新客" value={stats.newMonth} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 真實趨勢圖表 */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col h-full shadow-inner">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2"><BarChart3 size={16}/> 未來七日預約趨勢</h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 min-h-[180px]">
                        {next7Days.map(d => (
                            <div key={d.label} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">{d.count} 組</div>
                                <div 
                                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '8px' : '2px' }} 
                                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${d.label === format(new Date(), 'MM/dd') ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-300'}`}
                                ></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase">{d.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 h-full">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center lg:text-left">預約狀態佔比</h3>
                    <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner mb-8">
                        <div style={{ width: (appointments.filter(a => a.status === 'completed').length / total) * 100 + '%' }} className="bg-green-500 h-full"></div>
                        <div style={{ width: (appointments.filter(a => a.status === 'confirmed').length / total) * 100 + '%' }} className="bg-blue-500 h-full"></div>
                        <div style={{ width: (appointments.filter(a => a.status === 'pending').length / total) * 100 + '%' }} className="bg-amber-500 h-full"></div>
                        <div style={{ width: (appointments.filter(a => a.status === 'cancelled').length / total) * 100 + '%' }} className="bg-red-400 h-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {['completed', 'confirmed', 'pending', 'cancelled'].map(s => (
                            <div key={s} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-white shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${s === 'completed' ? 'bg-green-500' : s === 'confirmed' ? 'bg-blue-500' : s === 'pending' ? 'bg-amber-500' : 'bg-red-400'}`}></div>
                                <span className="text-[10px] font-black uppercase text-slate-500">{STATUS_MAP[s]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number, color: string }> = ({ icon, title, value, color }) => {
    const bgMap: any = { blue: 'bg-blue-50', amber: 'bg-amber-50', green: 'bg-green-50', purple: 'bg-purple-50' };
    const textMap: any = { blue: 'text-blue-600', amber: 'text-amber-600', green: 'text-green-600', purple: 'text-purple-600' };
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgMap[color]} ${textMap[color]}`}>{icon}</div>
            <div><div className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</div><div className="text-4xl font-black text-slate-800 mt-1">{value}</div></div>
        </div>
    );
};

const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void, onRefresh: () => void, formDefs: FormDefinition[] }> = ({ appointments, onStatusChange, onRefresh, formDefs }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = appointments.filter(apt => {
      const matchSearch = (apt as any).customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || apt.booking_date.includes(searchTerm);
      const matchStatus = statusFilter === 'all' || apt.status === statusFilter;
      return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96"><input type="text" placeholder="搜尋姓名、Email、日期..." className="input-field pl-12 py-3 bg-slate-50 border-none rounded-2xl w-full focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search size={20} className="absolute left-4 top-3.5 text-slate-300" /></div>
        <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all"><Plus size={18}/> 新增預約</button>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0"><button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>列表</button><button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>日曆</button></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS_MAP).map(key => (
              <button key={key} onClick={() => setStatusFilter(key)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${statusFilter === key ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'}`}>{STATUS_MAP[key]}</button>
          ))}
      </div>

      {viewMode === 'calendar' ? <AppointmentCalendar appointments={filtered} onSelect={setSelectedApt} /> : (
        <div className="overflow-hidden border border-slate-100 rounded-3xl"><table className="w-full text-left border-collapse"><thead className="bg-slate-50/50"><tr><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">時間</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">客戶</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">狀態</th><th className="py-5 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">動作</th></tr></thead><tbody className="divide-y divide-slate-50">{filtered.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedApt(apt)}><td className="py-5 px-6"><div className="font-bold text-slate-700">{apt.booking_date}</div><div className="text-blue-500 text-xs font-medium">{apt.booking_time.slice(0,5)}</div></td><td className="py-5 px-6"><div className="font-bold text-slate-700 group-hover:text-blue-600 transition-all flex items-center gap-2">{(apt as any).customers?.full_name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" /></div><div className="text-slate-400 text-xs font-medium">{(apt as any).customers?.email}</div></td><td className="py-5 px-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : apt.status === 'completed' ? 'bg-slate-100 text-slate-600' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{STATUS_MAP[apt.status] || apt.status}</span></td><td className="py-5 px-6 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    {apt.status === 'pending' && <button onClick={() => onStatusChange(apt.id, 'confirmed')} className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-green-600">確認</button>}
                    {apt.status === 'confirmed' && isPast(parseISO(apt.booking_date)) && <button onClick={() => onStatusChange(apt.id, 'completed')} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700">完成</button>}
                    {apt.status !== 'cancelled' && apt.status !== 'completed' && <button onClick={() => { const r = window.prompt('原因'); if(r!==null) onStatusChange(apt.id, 'cancelled', r); }} className="text-slate-400 hover:text-red-500 font-bold text-xs">取消</button>}
                </div></td></tr>))}</tbody></table></div>
      )}
      {selectedApt && <AppointmentDetailModal apt={selectedApt} onClose={() => setSelectedApt(null)} onStatusChange={onStatusChange} onRefresh={onRefresh} />}
      {showAddModal && <ManualBookingModal onClose={() => setShowAddModal(false)} onRefresh={onRefresh} formDefs={formDefs} />}
    </div>
  );
};

const ManualBookingModal: React.FC<{ onClose: () => void, onRefresh: () => void, initialCustomerId?: string, formDefs: FormDefinition[] }> = ({ onClose, onRefresh, initialCustomerId, formDefs }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId || '');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [rules, setRules] = useState<any>(null);
    const { showToast } = useToast();
    const bookingFormDef = formDefs.find(d => d.type === 'booking_form');
    useEffect(() => { supabase.from('customers').select('id, full_name, email').then(({ data }) => setCustomers(data || [])); }, []);
    useEffect(() => {
        if (!date) return;
        const fetchAvailability = async () => {
            const { data: rRes } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
            const { data: business } = await supabase.from('business_hours').select('*');
            const { data: occupied } = await supabase.from('appointments').select('booking_time').eq('booking_date', date).neq('status', 'cancelled');
            if (!rRes?.value || !business) return;
            setRules(rRes.value);
            const r = rRes.value; const day = new Date(date).getDay(); const hours = business.find(b => b.day_of_week === day);
            if (!hours?.is_open) { setAvailableSlots([]); return; }
            const slots: string[] = []; let curr = parseT(hours.start_time); const end = parseT(hours.end_time);
            const step = r.slot_interval || 15; const duration = r.service_duration || 50; const capacity = r.max_concurrent_bookings || 1;
            while (curr + duration <= end) {
                const currEnd = curr + duration;
                const count = occupied?.filter(o => {
                    const oS = parseT(o.booking_time.slice(0,5)); const oE = oS + duration;
                    return (curr < oE && currEnd > oS);
                }).length || 0;
                if (count < capacity) slots.push(formatT(curr));
                curr += step;
            }
            setAvailableSlots(slots);
        };
        fetchAvailability();
    }, [date]);
    const parseT = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const formatT = (m: number) => { const hh = Math.floor(m / 60).toString().padStart(2, '0'); const mm = (m % 60).toString().padStart(2, '0'); return `${hh}:${mm}`; };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!selectedCustomer || !time) return; setLoading(true);
        const { error } = await supabase.from('appointments').insert([{ customer_id: selectedCustomer, booking_date: date, booking_time: time, status: 'confirmed', source: 'manual', booking_data: dynamicData }]);
        if (error) showToast('建立失敗', 'error'); else { showToast('預約已建立'); onRefresh(); onClose(); }
        setLoading(false);
    };
    return (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">手動建立預約</h3><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X /></button></div><form onSubmit={handleSubmit} className="space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">1. 選擇會員</label><select className="input-field rounded-2xl py-4 bg-slate-50 border-none shadow-inner" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} required><option value="">請選擇客戶...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">2. 日期</label><input type="date" className="input-field rounded-2xl py-4 bg-slate-50 border-none shadow-inner" value={date} onChange={e => setDate(e.target.value)} required /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">3. 時段 {rules && <span className="text-blue-500 normal-case">(每場 {rules.service_duration} 分)</span>}</label><select className="input-field rounded-2xl py-4 bg-slate-50 border-none shadow-inner" value={time} onChange={e => setTime(e.target.value)} required disabled={availableSlots.length === 0}><option value="">請選擇時段...</option>{availableSlots.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div className="pt-4 border-t border-slate-50"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-1">4. 填寫詳細資料</label><div className="space-y-4">{bookingFormDef?.fields.filter(f => !f.isSystem).map(field => (
                        <div key={field.id}><label className="text-xs font-bold text-slate-600 mb-2 block">{field.label}</label>{field.type === 'select' ? (<select className="input-field bg-slate-50 border-none rounded-xl py-3" onChange={e => setDynamicData({...dynamicData, [field.label]: e.target.value})}><option value="">請選擇...</option>{field.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>) : (<input type={field.type} className="input-field bg-slate-50 border-none rounded-xl py-3" onChange={e => setDynamicData({...dynamicData, [field.label]: e.target.value})} />)}</div>
                    ))}</div></div><button type="submit" disabled={loading || !time} className="w-full btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200">建立預約並直接確認</button></form></div></div>);
};

const AppointmentDetailModal: React.FC<{ apt: Appointment, onClose: () => void, onStatusChange: (id: string, s: string, r?: string) => void, onRefresh: () => void }> = ({ apt, onClose, onStatusChange, onRefresh }) => {
    const customer = (apt as any).customers;
    const { showToast } = useToast();
    const [notes, setNotes] = useState(apt.admin_notes || '');
    const saveNotes = async () => { await supabase.from('appointments').update({ admin_notes: notes }).eq('id', apt.id); showToast('筆記已更新'); onRefresh(); };
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="bg-slate-900 p-10 text-white flex justify-between items-start"><div><div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">預約詳情</div><h3 className="text-3xl font-black">{customer?.full_name}</h3><p className="text-slate-400 mt-1">{customer?.email}</p></div><button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X /></button></div><div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10"><section className="space-y-6"><div className="flex gap-4 items-start"><Clock className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約時間</div><div className="text-lg font-bold">{apt.booking_date} {apt.booking_time.slice(0,5)}</div></div><div className="flex gap-4 items-start"><AlertCircle className="text-blue-600 mt-1"/><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">當前狀態</div><div className="text-lg font-bold uppercase">{STATUS_MAP[apt.status]}</div></div><div className="p-6 bg-slate-50 rounded-3xl"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">填寫內容</h4><div className="space-y-3">{Object.entries(apt.booking_data || {}).map(([k, v]) => (<div key={k} className="flex justify-between text-sm border-b border-slate-200/50 pb-2"><span className="text-slate-500 font-bold">{k}</span><span className="text-slate-800">{String(v)}</span></div>))}</div></div></section><section className="space-y-6"><div className="flex flex-col h-full"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><StickyNote size={14} className="text-amber-500"/> 管理員筆記</label><textarea className="input-field bg-amber-50/50 border-amber-100 rounded-2xl p-4 flex-1 min-h-[200px] text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="記錄客戶偏好..." /></section></div><div className="bg-slate-50 p-8 flex justify-end gap-4">{apt.status === 'pending' && <button onClick={() => { onStatusChange(apt.id, 'confirmed'); onClose(); }} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black">確認預約</button>}{apt.status === 'confirmed' && <button onClick={() => { onStatusChange(apt.id, 'completed'); onClose(); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black">服務完成</button>}<button onClick={onClose} className="text-slate-400 font-bold px-4 hover:text-slate-600">關閉</button></div></div></div>
    );
};

const AppointmentCalendar: React.FC<{ appointments: Appointment[], onSelect: (a: Appointment) => void }> = ({ appointments, onSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
  const getDayAppointments = (day: Date) => appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day) && apt.status === 'confirmed');
  return (
    <div className="bg-white animate-in fade-in duration-500"><div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-slate-800">{format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}</h3><div className="flex gap-2"><button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft/></button><button onClick={() => setCurrentDate(new Date())} className="px-5 py-1 text-sm font-bold text-blue-600">今天</button><button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronRight/></button></div></div><div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">{calendarDays.map((day, idx) => (<div key={idx} className={`min-h-[140px] p-3 bg-white ${isSameMonth(day, monthStart) ? '' : 'bg-slate-50/50 opacity-40'}`}><div className={`text-right text-xs font-bold mb-3 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-300'}`}>{format(day, 'd')}</div><div className="space-y-1.5">{getDayAppointments(day).map(apt => <div key={apt.id} className="text-[10px] p-2 rounded-xl border-l-4 border-green-500 bg-green-50 text-green-700 font-bold cursor-pointer hover:scale-105 transition-transform" onClick={() => onSelect(apt)}>{apt.booking_time.slice(0,5)} {(apt as any).customers?.full_name}</div>)}</div></div>))}</div></div>
  );
};

const FormManager: React.FC<{ formDefs: FormDefinition[], onRefresh: () => void }> = ({ formDefs, onRefresh }) => {
  const [editingDef, setEditingDef] = useState<FormDefinition | null>(null);
  const { showToast } = useToast();
  const handleSave = async () => { if (!editingDef) return; const { error } = await supabase.from('form_definitions').update({ fields: editingDef.fields }).eq('id', editingDef.id); if (error) showToast('儲存失敗', 'error'); else { showToast('表單設定已儲存'); setEditingDef(null); onRefresh(); } };
  return (
    <div className="space-y-8 animate-in fade-in duration-500"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><FormInput className="text-blue-600" /> 表單自定義管理</h2>{!editingDef ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{formDefs.map(def => (<div key={def.id} className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all group"><h3 className="font-bold text-xl text-slate-700 mb-4 flex items-center gap-3">{def.type === 'customer_profile' ? <Users /> : <CalendarIcon />}{def.type === 'customer_profile' ? '客戶註冊資料' : '預約填寫內容'}</h3><button onClick={() => setEditingDef(def)} className="w-full bg-white text-blue-600 border-2 border-blue-50 px-4 py-4 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm">編輯欄位</button></div>))}</div>) : (<div className="space-y-6"><div className="flex justify-between items-center bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100"><div><h3 className="font-bold text-xl">正在編輯：{editingDef.type}</h3><p className="text-xs text-blue-100 mt-2 font-medium opacity-80 flex items-center gap-1"><Lock size={12}/> 系統核心欄位已鎖定類型。</p></div><div className="flex gap-3"><button onClick={() => setEditingDef(null)} className="px-6 py-2 text-white font-bold hover:bg-white/10 rounded-xl transition-all">取消</button><button onClick={handleSave} className="bg-white text-blue-600 px-10 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all">儲存變更</button></div></div><div className="grid gap-4">{editingDef.fields.map((field: any, index) => (<div key={field.id} className={`flex gap-6 p-6 rounded-3xl border transition-all ${field.isSystem ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}><div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block flex items-center gap-1">{field.isSystem && <Lock size={10} />} 顯示標籤</label><input className="input-field bg-white" value={field.label} onChange={(e) => { const n = [...editingDef.fields]; n[index].label = e.target.value; setEditingDef({ ...editingDef, fields: n }); }} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">類型</label><select className="input-field" disabled={field.isSystem} value={field.type} onChange={(e) => { const n = [...editingDef.fields]; n[index].type = e.target.value; setEditingDef({ ...editingDef, fields: n }); }}><option value="text">文字</option><option value="number">數字</option><option value="date">日期</option><option value="tel">電話</option><option value="select">選單</option></select></div></div>{!field.isSystem && <button onClick={() => { const n = editingDef.fields.filter((_:any, i:any) => i !== index); setEditingDef({ ...editingDef, fields: n }); }} className="text-red-400 p-4 mt-8 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={24} /></button>}</div>))}</div>
          {editingDef.fields.some((f: any) => f.type === 'select') && (
              <div className="p-10 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-6">
                  <h4 className="font-bold text-blue-800 flex items-center gap-2"><Settings size={18}/> 選單選項設定</h4>
                  {editingDef.fields.filter((f:any) => f.type === 'select').map((field: any) => {
                      const idx = editingDef.fields.findIndex((f:any) => f.id === field.id);
                      return (
                        <div key={field.id} className="space-y-2">
                            <label className="text-xs font-bold text-blue-600">欄位：{field.label}</label>
                            <input 
                                className="input-field bg-white border-blue-200" 
                                placeholder="項目A, 項目B, 項目C (請用逗號隔開)" 
                                value={field.options?.join(', ') || ''} 
                                onChange={e => {
                                    const n = [...editingDef.fields];
                                    n[idx].options = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                                    setEditingDef({ ...editingDef, fields: n });
                                }}
                            />
                        </div>
                      )
                  })}
              </div>
          )}
          <button onClick={() => { const n: FormField = { id: Math.random().toString(36).substr(2,9), name: `f_${Date.now()}`, label: '新欄位', type: 'text', required: false }; setEditingDef({ ...editingDef, fields: [...editingDef.fields, n] }); }} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center justify-center gap-3">增加更多欄位</button></div>)}</div>
  );
};

const SettingsManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'smtp' | 'templates' | 'logs'>('smtp');
  const [config, setConfig] = useState({ enabled: false, user: '', pass: '', from_name: '' });
  const [templates, setTemplates] = useState({ new_booking: { subject: '', body: '' }, confirmed: { subject: '', body: '' }, cancelled: { subject: '', body: '' }, completed: { subject: '', body: '' } });
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  const { showToast } = useToast();
  useEffect(() => {
    supabase.from('system_settings').select('*').in('key', ['email_config', 'email_templates']).then(({ data }) => {
        data?.forEach(d => { if (d.key === 'email_config') setConfig(d.value); if (d.key === 'email_templates') setTemplates(d.value); });
    });
    if (activeSubTab === 'logs') supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => setEmailLogs(data || []));
  }, [activeSubTab]);
  const saveSettings = async () => { await supabase.from('system_settings').upsert([{ key: 'email_config', value: config }, { key: 'email_templates', value: templates }]); showToast('系統設定已儲存'); };
  const handleTestEmail = async () => { if (!config.user || !config.pass) { showToast('請填寫帳密', 'error'); return; } setTesting(true); try { await supabase.from('system_settings').upsert({ key: 'email_config', value: config }); const { error } = await supabase.functions.invoke('notify', { body: { type: 'test', target_email: config.user } }); if (error) throw error; showToast('測試郵件已送出！'); } catch (err: any) { showToast('失敗：' + err.message, 'error'); } finally { setTesting(false); } };
  return (
    <div className="space-y-8 animate-in fade-in duration-500"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Settings className="text-blue-600" /> 通知系統設定</h2><div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200"><button onClick={() => setActiveSubTab('smtp')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'smtp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>SMTP</button><button onClick={() => setActiveSubTab('templates')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>範本</button><button onClick={() => setActiveSubTab('logs')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>日誌</button></div></div><div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm max-w-2xl">
        {activeSubTab === 'smtp' && (<div className="space-y-6"><label className="flex items-center gap-5 p-5 bg-white rounded-3xl cursor-pointer border border-slate-100 shadow-sm"><input type="checkbox" className="w-6 h-6 text-blue-600 rounded-xl" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} /><div className="flex-1"><div className="font-bold text-slate-700">啟用 Email 自動通知</div></div></label><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">寄件者名稱</label><input className="input-field bg-white" value={config.from_name} onChange={e => setConfig({...config, from_name: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">Gmail 帳號</label><input className="input-field bg-white" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block ml-1">Gmail 應用程式密碼</label><input type="password" placeholder="16 位密碼" className="input-field bg-white" value={config.pass} onChange={e => setConfig({...config, pass: e.target.value})} /></div><button onClick={handleTestEmail} disabled={testing} className="w-full bg-white text-slate-600 border-2 border-slate-100 py-4 rounded-2xl font-bold hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center gap-3 transition-all mt-4">{testing ? '發送中...' : <><Send size={18} /> 發送測試信</>}</button></div>)}
        {activeSubTab === 'templates' && (<div className="space-y-8"><TemplateEditor label="新預約通知" tpl={templates.new_booking} onChange={v => setTemplates({...templates, new_booking: v})} hint="{name}, {date}, {time}" /><TemplateEditor label="確認成功通知" tpl={templates.confirmed} onChange={v => setTemplates({...templates, confirmed: v})} hint="{name}, {date}, {time}" /><TemplateEditor label="取消通知" tpl={templates.cancelled} onChange={v => setTemplates({...templates, cancelled: v})} hint="{name}, {date}, {time}, {reason}" /><TemplateEditor label="完成感謝信" tpl={templates.completed} onChange={v => setTemplates({...templates, completed: v})} hint="{name}, {date}" /></div>)}
        {activeSubTab === 'logs' && (<div className="space-y-4 max-h-[400px] overflow-y-auto">{emailLogs.map(log => (<div key={log.id} className="p-4 bg-white rounded-2xl border border-white flex justify-between items-center shadow-sm"><div><div className="font-bold text-xs text-slate-700">{log.recipient}</div><div className="text-[10px] text-slate-400">{log.subject}</div>{log.error_message && <div className="text-[10px] text-red-500 mt-1 italic">Error: {log.error_message}</div>}</div><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${log.status === 'sent' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{log.status}</span></div>))}</div>)}
        <div className="flex gap-4 pt-8 border-t border-slate-200 mt-8"><button onClick={saveSettings} className="flex-1 btn-primary py-4 font-black rounded-2xl text-lg shadow-lg">儲存所有設定</button></div>
      </div>
    </div>
  );
};

const TemplateEditor: React.FC<{ label: string, tpl: any, onChange: (v: any) => void, hint: string }> = ({ label, tpl, onChange, hint }) => {
    const [showPreview, setShowPreview] = useState(false);
    const replaceVars = (text: string) => text.replace(/{name}/g, '王小明').replace(/{date}/g, '2026-02-14').replace(/{time}/g, '14:00');
    return (
        <div className="space-y-3 relative group">
            <div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700">{label}</label><div className="flex items-center gap-3"><span className="text-[10px] text-slate-400 italic">可用變數: {hint}</span><button onClick={() => setShowPreview(!showPreview)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="預覽範本"><Eye size={16}/></button></div></div>
            <input className="input-field bg-white text-sm font-bold" placeholder="郵件主旨" value={tpl?.subject || ''} onChange={e => onChange({...tpl, subject: e.target.value})} />
            <textarea className="input-field bg-white text-sm" rows={3} placeholder="郵件內容" value={tpl?.body || ''} onChange={e => onChange({...tpl, body: e.target.value})} />
            {showPreview && (<div className="absolute top-full left-0 right-0 z-50 mt-2 p-6 bg-slate-900 text-white rounded-2xl shadow-2xl animate-in slide-in-from-top-2"><div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10"><div className="text-[10px] font-black uppercase tracking-widest text-blue-400">範本效果預覽</div><button onClick={() => setShowPreview(false)}><X size={14}/></button></div><div className="font-bold text-sm mb-2">主旨：{replaceVars(tpl?.subject || '')}</div><div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{replaceVars(tpl?.body || '')}</div></div>)}
        </div>
    );
};

const CustomerManager: React.FC<{ customers: any[], onRefresh: () => void, allAppointments: Appointment[], formDefs: FormDefinition[] }> = ({ customers, onRefresh, allAppointments, formDefs }) => {
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [viewHistory, setViewHistory] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = customers.filter(c => c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-8 relative animate-in fade-in duration-500"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Users className="text-blue-600" /> 會員資料庫</h2><div className="relative w-full md:w-80"><input type="text" placeholder="搜尋姓名、Email..." className="input-field pl-12 py-3 bg-slate-50 border-none rounded-2xl w-full focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search size={20} className="absolute left-4 top-3.5 text-slate-300" /></div></div><div className="grid gap-4">{filtered.map(c => (
          <div key={c.id} className="p-6 bg-slate-50/50 rounded-[2rem] flex justify-between items-center border border-slate-50 hover:bg-white transition-all group"><div className="flex items-center gap-5 cursor-pointer" onClick={() => setViewHistory(c)}><div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shadow-blue-200/50">{c.full_name[0]}</div><div><div className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">{c.full_name} <History size={14} className="text-slate-300" /></div><div className="text-xs text-slate-400 font-bold">{c.email}</div></div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingCustomer(c)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="編輯資料"><Edit3 size={20} /></button></div></div>
        ))}</div>
      {viewHistory && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setViewHistory(null)}><div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="bg-blue-600 p-8 text-white flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-xl">{viewHistory.full_name[0]}</div><div><h3 className="text-xl font-black">{viewHistory.full_name} 的預約歷程</h3><p className="text-blue-100 text-xs">帳號：{viewHistory.email}</p></div></div><button onClick={() => setViewHistory(null)} className="p-2 hover:bg-white/10 rounded-full"><X/></button></div><div className="p-8 overflow-y-auto flex-1 space-y-4">{allAppointments.filter(a => a.customer_id === viewHistory.id).map(a => (<div key={a.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100"><div><div className="font-bold text-slate-800">{a.booking_date} {a.booking_time.slice(0,5)}</div></div><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : a.status === 'completed' ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-600'}`}>{STATUS_MAP[a.status]}</span></div>))}</div></div></div>)}
    </div>
  );
};
