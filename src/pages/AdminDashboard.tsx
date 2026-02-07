import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate, List, ChevronLeft, ChevronRight, Lock, AlertCircle, Download, Send } from 'lucide-react';
import { AvailabilitySettings } from './AvailabilitySettings';
import { WebsiteEditor } from './WebsiteEditor';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { sendNotification } from '../lib/notifications';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'forms' | 'settings' | 'customers' | 'availability' | 'cms'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    if (activeTab === 'cms' || activeTab === 'availability') {
        setLoading(false);
        return;
    }

    setLoading(true);
    if (activeTab === 'appointments') {
      const { data } = await supabase
        .from('appointments')
        .select('*, customers(full_name, email)') 
        .order('booking_date', { ascending: false });
      setAppointments(data || []);
    } else if (activeTab === 'forms') {
      const { data } = await supabase.from('form_definitions').select('*').order('type');
      setFormDefs(data || []);
    }
    setLoading(false);
  }

  const updateAppointmentStatus = async (id: string, status: string, reason?: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, cancellation_reason: reason || null })
      .eq('id', id);
    
    if (error) alert('更新失敗: ' + error.message);
    else {
      // 關鍵：觸發 Email 通知
      // status 為 'confirmed' 時，type 為 'update'
      // status 為 'cancelled' 時，type 為 'cancel'
      await sendNotification(id, status === 'cancelled' ? 'cancel' : 'update');
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <button onClick={() => setActiveTab('appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'appointments' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <CalendarIcon size={20} /><span className="font-medium">預約管理</span>
          </button>
          <button onClick={() => setActiveTab('availability')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'availability' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Clock size={20} /><span className="font-medium">預約時段設定</span>
          </button>
          <button onClick={() => setActiveTab('cms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'cms' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <LayoutTemplate size={20} /><span className="font-medium">網站內容編輯</span>
          </button>
          <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <FormInput size={20} /><span className="font-medium">表單欄位設定</span>
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Users size={20} /><span className="font-medium">客戶管理</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Settings size={20} /><span className="font-medium">系統與 Email 設定</span>
          </button>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          {activeTab === 'cms' ? <WebsiteEditor /> : (
            <div className="p-8">
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

const AppointmentCalendar: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
  const getDayAppointments = (day: Date) => appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day));

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">{format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}</h3>
        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-bold text-blue-600">今天</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-400 tracking-widest uppercase">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        {calendarDays.map((day, idx) => (
          <div key={idx} className={`min-h-[120px] p-2 bg-white ${isSameMonth(day, monthStart) ? '' : 'bg-slate-50/50 grayscale'}`}>
            <div className={`text-right text-sm font-medium mb-2 ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{format(day, 'd')}</div>
            <div className="space-y-1">
                {getDayAppointments(day).map(apt => (
                <div key={apt.id} className={`text-[10px] p-1.5 rounded-lg border-l-4 shadow-sm truncate font-medium ${apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-500' : apt.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-500 opacity-50' : 'bg-amber-50 text-amber-700 border-amber-500'}`} onClick={() => alert(`客戶: ${(apt as any).customers?.full_name}\n內容: ${JSON.stringify(apt.booking_data)}`)}>
                    {apt.booking_time.slice(0,5)} {(apt as any).customers?.full_name}
                </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">預約管理排程</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl border">
            <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><List size={18} className="inline mr-2" />列表模式</button>
            <button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CalendarIcon size={18} className="inline mr-2" />日曆模式</button>
        </div>
      </div>
      {viewMode === 'calendar' ? <AppointmentCalendar appointments={appointments} onStatusChange={onStatusChange} /> : (
        <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
                <tr><th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">時間</th><th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">客戶</th><th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">狀態</th><th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">動作</th></tr>
            </thead>
            <tbody>
                {appointments.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-50">
                    <td className="py-5 px-6"><div className="font-bold text-slate-700">{apt.booking_date}</div><div className="text-blue-500 text-xs">{apt.booking_time.slice(0,5)}</div></td>
                    <td className="py-5 px-6"><div className="font-bold text-slate-700">{(apt as any).customers?.full_name}</div><div className="text-slate-400 text-xs">{(apt as any).customers?.email}</div></td>
                    <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}</span>
                        {apt.cancellation_reason && <div className="text-[10px] text-red-400 mt-1 italic">{apt.cancellation_reason}</div>}
                    </td>
                    <td className="py-5 px-6">
                    <div className="flex gap-2">
                        {apt.status === 'pending' && <button onClick={() => onStatusChange(apt.id, 'confirmed')} className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors">確認</button>}
                        {apt.status !== 'cancelled' && <button onClick={() => { const r = window.prompt('取消原因'); if(r !== null) onStatusChange(apt.id, 'cancelled', r); }} className="text-red-500 hover:underline text-xs">取消</button>}
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

const FormManager: React.FC<{ formDefs: FormDefinition[], onRefresh: () => void }> = ({ formDefs, onRefresh }) => {
  const [editingDef, setEditingDef] = useState<FormDefinition | null>(null);
  const handleSave = async () => {
    if (!editingDef) return;
    const { error } = await supabase.from('form_definitions').update({ fields: editingDef.fields }).eq('id', editingDef.id);
    if (error) alert('儲存失敗');
    else { alert('表單設定已儲存'); setEditingDef(null); onRefresh(); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3"><FormInput className="text-blue-600" /> 表單自定義管理</h2>
      {!editingDef ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formDefs.map(def => (
            <div key={def.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all group">
              <h3 className="font-bold text-lg text-slate-700 mb-3 flex items-center gap-3">{def.type === 'customer_profile' ? <Users /> : <CalendarIcon />}{def.type === 'customer_profile' ? '客戶註冊欄位' : '預約填寫欄位'}</h3>
              <button onClick={() => setEditingDef(def)} className="w-full bg-white text-blue-600 border-2 border-blue-50 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all">編輯所有欄位</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-100">
            <div><h3 className="font-bold text-lg">{editingDef.type === 'customer_profile' ? '正在編輯：客戶資料' : '正在編輯：預約表單'}</h3><p className="text-xs text-blue-100 mt-1 opacity-80">帶有 🔒 的為系統核心欄位，僅能修改顯示名稱。</p></div>
            <div className="flex gap-3"><button onClick={() => setEditingDef(null)} className="px-4 py-2 text-white hover:bg-white/10 rounded-xl font-bold">取消</button><button onClick={handleSave} className="bg-white text-blue-600 px-8 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all shadow-md"><Save size={18} /> 儲存變更</button></div>
          </div>
          <div className="grid gap-4">
            {editingDef.fields.map((field: any, index) => (
              <div key={field.id} className={`flex gap-6 p-5 rounded-2xl border transition-all ${field.isSystem ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mb-2">{field.isSystem && <Lock size={10} />} 顯示標籤 (Label)</label><input className="input-field bg-white" value={field.label} onChange={(e) => { const newFields = [...editingDef.fields]; newFields[index].label = e.target.value; setEditingDef({ ...editingDef, fields: newFields }); }} /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">欄位類型</label><div className="mt-1 text-sm font-bold text-slate-600 px-4 py-3 bg-slate-100/50 rounded-xl">{field.type} {field.isSystem && ' (核心預設)'}</div></div>
                </div>
                {!field.isSystem && <button onClick={() => { const newFields = editingDef.fields.filter((_:any, i:any) => i !== index); setEditingDef({ ...editingDef, fields: newFields }); }} className="text-red-400 p-3 mt-6 hover:bg-red-50 rounded-xl"><Trash2 size={20} /></button>}
              </div>
            ))}
          </div>
          <button onClick={() => { const newField: FormField = { id: Math.random().toString(36).substr(2, 9), name: `field_${Date.now()}`, label: '新增欄位', type: 'text', required: false }; setEditingDef({ ...editingDef, fields: [...editingDef.fields, newField] }); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold flex items-center justify-center gap-3 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-all"><Plus size={24} /> 增加自定義填寫項</button>
        </div>
      )}
    </div>
  );
};

const SettingsManager: React.FC = () => {
  const [config, setConfig] = useState({ enabled: false, user: '', pass: '', from_name: '' });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from('system_settings').select('*').eq('key', 'email_config').maybeSingle()
      .then(({ data }) => data && setConfig(data.value));
  }, []);

  const saveSettings = async () => {
    await supabase.from('system_settings').upsert({ key: 'email_config', value: config });
    alert('設定已儲存');
  };

  const handleTestEmail = async () => {
    if (!config.user || !config.pass) {
        alert('請先填寫 Gmail 帳號與密碼');
        return;
    }
    setTesting(true);
    try {
        await supabase.from('system_settings').upsert({ key: 'email_config', value: config });
        const { data, error } = await supabase.functions.invoke('notify', {
            body: { type: 'test', target_email: config.user }
        });
        if (error) {
            let msg = error.message;
            try { const body = await (error as any).context.json(); if (body.error) msg = body.error; } catch(e){}
            throw new Error(msg);
        }
        alert(`測試信已發送至 ${config.user}！`);
    } catch (err: any) { alert('測試失敗：' + err.message); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Settings className="text-blue-600" />自動通知系統設定</h2>
      <div className="bg-slate-50 p-8 rounded-3xl space-y-6 border border-slate-100 shadow-sm">
        <label className="flex items-center gap-4 p-4 bg-white rounded-2xl cursor-pointer border border-slate-100 hover:border-blue-200 transition-all">
            <input type="checkbox" className="w-6 h-6 text-blue-600 rounded-lg" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} />
            <div className="flex-1"><div className="font-bold text-slate-700">啟用自動 Email 發送</div><div className="text-xs text-slate-400">當預約提交、確認或取消時自動通知</div></div>
        </label>
        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">寄件者名稱</label><input className="input-field bg-white" value={config.from_name} onChange={e => setConfig({...config, from_name: e.target.value})} /></div>
        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Gmail 帳號</label><input className="input-field bg-white" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} /></div>
        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">應用程式密碼</label><input type="password" placeholder="16 位密碼" className="input-field bg-white" value={config.pass} onChange={e => setConfig({...config, pass: e.target.value})} /></div>
        <div className="flex gap-3 pt-2">
            <button onClick={handleTestEmail} disabled={testing} className="flex-1 bg-white text-slate-600 border-2 border-slate-200 py-4 rounded-2xl font-bold hover:text-blue-600 flex items-center justify-center gap-2 transition-all">{testing ? '發送中...' : <><Send size={18} /> 測試發信</>}</button>
            <button onClick={saveSettings} className="flex-1 btn-primary py-4 font-bold rounded-2xl text-lg flex items-center justify-center gap-2"><Save size={18} /> 儲存設定</button>
        </div>
      </div>
    </div>
  );
};

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  useEffect(() => { supabase.from('customers').select('*').order('created_at', { ascending: false }).then(({ data }) => setCustomers(data || [])); }, []);
  const downloadCSV = () => {
    if (!customers.length) return;
    const csvContent = "姓名,Email,電話,註冊時間\n" + customers.map(c => [c.full_name, c.email, c.phone || '', new Date(c.created_at).toLocaleDateString()].join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `客戶清單_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> 會員資料管理</h2><button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all"><Download size={18}/> 匯出 CSV</button></div>
      <div className="grid gap-4">
        {customers.map(c => (
          <div key={c.id} className="p-6 bg-slate-50/50 rounded-3xl flex justify-between items-center border border-slate-100 hover:bg-white transition-all group">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl">{c.full_name[0]}</div><div><div className="font-bold text-slate-800">{c.full_name}</div><div className="text-xs text-slate-400 font-medium">{c.email} | {c.phone || '無電話'}</div></div></div>
            <div className="text-right"><div className="text-xs text-slate-400 font-bold uppercase">註冊日期</div><div className="text-sm text-slate-500 font-medium">{new Date(c.created_at).toLocaleDateString()}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
};