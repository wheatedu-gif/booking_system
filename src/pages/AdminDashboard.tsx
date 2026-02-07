import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate, List, ChevronLeft, ChevronRight, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { AvailabilitySettings } from './AvailabilitySettings';
import { WebsiteEditor } from './WebsiteEditor';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

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
    else fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <button onClick={() => setActiveTab('appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'appointments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <CalendarIcon size={20} /><span className="font-medium">預約管理</span>
          </button>
          <button onClick={() => setActiveTab('availability')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'availability' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Clock size={20} /><span className="font-medium">預約時段設定</span>
          </button>
          <button onClick={() => setActiveTab('cms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'cms' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <LayoutTemplate size={20} /><span className="font-medium">網站內容編輯</span>
          </button>
          <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <FormInput size={20} /><span className="font-medium">表單欄位設定</span>
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Users size={20} /><span className="font-medium">客戶管理</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
            <Settings size={20} /><span className="font-medium">系統與 Email 設定</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          {activeTab === 'cms' ? (
              <WebsiteEditor />
          ) : (
            <div className="p-6">
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

// --- 子元件 ---

const AppointmentCalendar: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const getDayAppointments = (day: Date) => appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day));

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-700">{format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md">今天</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b mb-2">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-2 text-center text-sm font-bold text-slate-50">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => (
          <div key={idx} className={`min-h-[100px] border rounded-lg p-2 ${isSameMonth(day, monthStart) ? 'bg-white' : 'bg-slate-50 opacity-50'}`}>
            <div className="text-right text-sm font-medium">{format(day, 'd')}</div>
            {getDayAppointments(day).map(apt => (
              <div key={apt.id} className="text-[10px] p-1 mb-1 bg-blue-50 text-blue-700 rounded border-l-2 border-blue-500 truncate">
                {apt.booking_time.slice(0,5)} {(apt as any).customers?.full_name}
              </div>
            ))}
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">預約管理</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><List size={16} className="inline mr-2" />列表</button>
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CalendarIcon size={16} className="inline mr-2" />日曆</button>
        </div>
      </div>
      {viewMode === 'calendar' ? <AppointmentCalendar appointments={appointments} onStatusChange={onStatusChange} /> : (
        <table className="w-full text-left">
          <thead><tr className="border-b"><th className="py-3 px-4">時間</th><th className="py-3 px-4">客戶</th><th className="py-3 px-4">狀態</th><th className="py-3 px-4">操作</th></tr></thead>
          <tbody>
            {appointments.map(apt => (
              <tr key={apt.id} className="border-b hover:bg-slate-50">
                <td className="py-4 px-4 text-sm font-medium">{apt.booking_date} {apt.booking_time.slice(0,5)}</td>
                <td className="py-4 px-4 text-sm">{(apt as any).customers?.full_name}</td>
                <td className="py-4 px-4"><span className={`px-2 py-1 rounded-full text-xs ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100'}`}>{apt.status}</span></td>
                <td className="py-4 px-4">
                  {apt.status === 'pending' && <button onClick={() => onStatusChange(apt.id, 'confirmed')} className="text-green-600 mr-2">確認</button>}
                  <button onClick={() => { const r = window.prompt('原因'); if(r) onStatusChange(apt.id, 'cancelled', r); }} className="text-red-600">取消</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    else { alert('儲存成功'); setEditingDef(null); onRefresh(); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">表單欄位定義</h2>
      {!editingDef ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formDefs.map(def => (
            <div key={def.id} className="p-6 bg-slate-50 border rounded-xl hover:border-blue-300 transition-all">
              <h3 className="font-bold text-slate-700 mb-2">{def.type === 'customer_profile' ? '👤 客戶基本資料' : '📅 預約表單填寫'}</h3>
              <p className="text-sm text-slate-500 mb-4">包含系統與自定義共 {def.fields?.length || 0} 個欄位</p>
              <button onClick={() => setEditingDef(def)} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition-all">編輯欄位文字</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl">
            <div>
                <h3 className="font-bold text-blue-900">正在編輯：{editingDef.type === 'customer_profile' ? '客戶資料' : '預約表單'}</h3>
                <p className="text-xs text-blue-700">帶有 🔒 的為系統核心欄位，僅能修改顯示文字。</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingDef(null)} className="px-4 py-2 text-slate-600">取消</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={18} /> 儲存</button>
            </div>
          </div>

          <div className="space-y-3">
            {editingDef.fields.map((field: any, index) => (
              <div key={field.id} className={`flex gap-4 p-4 rounded-xl border items-center ${field.isSystem ? 'bg-amber-50/20 border-amber-100' : 'bg-white'}`}>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                        {field.isSystem && <Lock size={10} />} 顯示名稱 (Label)
                    </label>
                    <input className="input-field mt-1" value={field.label} onChange={(e) => {
                        const newFields = [...editingDef.fields];
                        newFields[index].label = e.target.value;
                        setEditingDef({ ...editingDef, fields: newFields });
                    }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">欄位類型</label>
                    <div className="mt-2 text-sm font-medium text-slate-600 bg-slate-100/50 px-3 py-2 rounded-lg">
                        {field.type} {field.isSystem && '(系統鎖定)'}
                    </div>
                  </div>
                </div>
                {!field.isSystem && (
                  <button onClick={() => {
                    const newFields = editingDef.fields.filter((_:any, i:any) => i !== index);
                    setEditingDef({ ...editingDef, fields: newFields });
                  }} className="text-red-400 p-2 mt-4"><Trash2 size={18} /></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => {
            const newField: FormField = { id: Math.random().toString(36).substr(2, 9), name: `field_${Date.now()}`, label: '新欄位', type: 'text', required: false };
            setEditingDef({ ...editingDef, fields: [...editingDef.fields, newField] });
          }} className="w-full py-4 border-2 border-dashed rounded-xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-500 transition-all"><Plus size={20} /> 新增欄位</button>
        </div>
      )}
    </div>
  );
};

const SettingsManager: React.FC = () => {
  const [config, setConfig] = useState({ enabled: false, user: '', pass: '', from_name: '' });
  useEffect(() => { supabase.from('system_settings').select('*').eq('key', 'email_config').single().then(({ data }) => data && setConfig(data.value)); }, []);
  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-xl font-bold text-slate-800">Email 設定</h2>
      <input className="input-field" placeholder="寄件者名稱" value={config.from_name} onChange={e => setConfig({...config, from_name: e.target.value})} />
      <input className="input-field" placeholder="Gmail 帳號" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} />
      <input type="password" className="input-field" placeholder="應用程式密碼" value={config.pass} onChange={e => setConfig({...config, pass: e.target.value})} />
      <button onClick={async () => { await supabase.from('system_settings').upsert({key: 'email_config', value: config}); alert('已儲存'); }} className="btn-primary w-full py-3 font-bold">儲存設定</button>
    </div>
  );
};

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  useEffect(() => { supabase.from('customers').select('*').order('created_at', { ascending: false }).then(({ data }) => setCustomers(data || [])); }, []);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">會員列表</h2>
      <div className="grid gap-4">
        {customers.map(c => (
          <div key={c.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center">
            <div><div className="font-bold">{c.full_name}</div><div className="text-xs text-slate-500">{c.email}</div></div>
            <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};