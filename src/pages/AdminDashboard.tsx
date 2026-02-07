import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate, List, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
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
    // CMS 和 Availability 自行管理數據，不需要在這裡全域 fetch
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
      const { data } = await supabase.from('form_definitions').select('*');
      setFormDefs(data || []);
    }
    setLoading(false);
  }

  const updateAppointmentStatus = async (id: string, status: string, reason?: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ 
        status, 
        cancellation_reason: reason || null 
      })
      .eq('id', id);
    
    if (error) {
      alert('更新失敗: ' + error.message);
    } else {
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'appointments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <CalendarIcon size={20} />
            <span className="font-medium">預約管理</span>
          </button>
          
          <button
            onClick={() => setActiveTab('availability')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'availability' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <Clock size={20} />
            <span className="font-medium">預約時段設定</span>
          </button>

          <button
            onClick={() => setActiveTab('cms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'cms' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <LayoutTemplate size={20} />
            <span className="font-medium">網站內容編輯</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <FormInput size={20} />
            <span className="font-medium">表單欄位設定</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <Users size={20} />
            <span className="font-medium">客戶管理</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <Settings size={20} />
            <span className="font-medium">系統與 Email 設定</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'cms' ? (
              <WebsiteEditor />
          ) : (
            <div className="p-6">
                {activeTab === 'appointments' && (
                    <AppointmentManager appointments={appointments} onStatusChange={updateAppointmentStatus} />
                )}
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

// 1. 預約日曆視圖元件
const AppointmentCalendar: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayAppointments = (day: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.booking_date), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="bg-white">
      {/* 日曆頭部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-700">
          {format(currentDate, 'yyyy 年 M 月', { locale: zhTW })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100">今天</button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* 星期標頭 */}
      <div className="grid grid-cols-7 border-b border-slate-200 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="py-2 text-center text-sm font-bold text-slate-500">{d}</div>
        ))}
      </div>

      {/* 日期網格 */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2">
        {calendarDays.map((day, idx) => {
          const dayApts = getDayAppointments(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={idx} 
              className={`min-h-[100px] border rounded-lg p-2 ${
                isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="text-right text-sm mb-1 font-medium">{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayApts.map(apt => (
                  <div 
                    key={apt.id} 
                    className={`text-xs p-1.5 rounded cursor-pointer transition-all hover:scale-105 shadow-sm border-l-2 ${
                      apt.status === 'confirmed' ? 'bg-green-50 border-green-500 text-green-700' :
                      apt.status === 'cancelled' ? 'bg-red-50 border-red-500 text-red-700 opacity-60' : 
                      'bg-yellow-50 border-yellow-500 text-yellow-700'
                    }`}
                    onClick={() => {
                        // 簡單的點擊互動：這裡可以做成彈出 Modal，為了簡便先用 confirm
                        if(apt.status !== 'cancelled' && window.confirm(`處理預約：\n${(apt as any).customers?.full_name} (${apt.booking_time})\n\n要取消此預約嗎？`)) {
                            const reason = window.prompt('取消原因：');
                            if (reason) onStatusChange(apt.id, 'cancelled', reason);
                        }
                    }}
                    title={`${(apt as any).customers?.full_name} - ${apt.status}`}
                  >
                    <div className="font-bold">{apt.booking_time.slice(0, 5)}</div>
                    <div className="truncate">{(apt as any).customers?.full_name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 2. 預約管理主元件 (包含切換功能)
const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const handleCancel = (id: string) => {
    const reason = window.prompt('請輸入取消原因：');
    if (reason !== null) {
      onStatusChange(id, 'cancelled', reason);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">預約管理</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <List size={16} /> 列表
            </button>
            <button 
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <CalendarIcon size={16} /> 日曆
            </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
          <AppointmentCalendar appointments={appointments} onStatusChange={onStatusChange} />
      ) : (
        <div className="overflow-x-auto">
            {/* 列表視圖代碼 */}
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-slate-100">
                <th className="py-3 px-4 font-semibold text-slate-600">日期/時間</th>
                <th className="py-3 px-4 font-semibold text-slate-600">客戶資料</th>
                <th className="py-3 px-4 font-semibold text-slate-600">狀態</th>
                <th className="py-3 px-4 font-semibold text-slate-600">操作</th>
                </tr>
            </thead>
            <tbody>
                {appointments.map((apt) => (
                <tr key={apt.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-4 px-4 text-sm">
                    <div className="font-medium text-slate-900">{apt.booking_date}</div>
                    <div className="text-slate-500">{apt.booking_time.slice(0, 5)}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                    <div className="font-medium">{(apt as any).customers?.full_name || '未填寫'}</div>
                    <div className="text-xs">{(apt as any).customers?.email}</div>
                    </td>
                    <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}
                    </span>
                    {(apt as any).cancellation_reason && (
                        <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={(apt as any).cancellation_reason}>
                        原因: {(apt as any).cancellation_reason}
                        </div>
                    )}
                    </td>
                    <td className="py-4 px-4">
                    <div className="flex gap-2">
                        {apt.status !== 'confirmed' && apt.status !== 'cancelled' && (
                        <button 
                            onClick={() => onStatusChange(apt.id, 'confirmed')} 
                            className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                            確認
                        </button>
                        )}
                        {apt.status !== 'cancelled' && (
                        <button 
                            onClick={() => handleCancel(apt.id)} 
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                            取消
                        </button>
                        )}
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

  // 定義系統預設欄位 (僅供顯示)
  const SYSTEM_FIELDS: Record<string, {label: string, type: string, req: boolean}[]> = {
    customer_profile: [
      { label: '姓名 (full_name)', type: '文字', req: true },
      { label: '電子郵件 (email)', type: 'Email', req: true },
      { label: '電話 (phone)', type: '電話', req: false },
    ],
    booking_form: [
      { label: '預約日期 (date)', type: '日期', req: true },
      { label: '預約時間 (time)', type: '時間', req: true },
    ]
  };

  const handleSave = async () => {
    if (!editingDef) return;
    const { error } = await supabase
      .from('form_definitions')
      .update({ fields: editingDef.fields })
      .eq('id', editingDef.id);
    
    if (error) alert('儲存失敗');
    else {
      alert('儲存成功');
      setEditingDef(null);
      onRefresh();
    }
  };

  const addField = () => {
    if (!editingDef) return;
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      name: `field_${Date.now()}`,
      label: '新欄位',
      type: 'text',
      required: false
    };
    setEditingDef({ ...editingDef, fields: [...editingDef.fields, newField] });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">表單欄位定義</h2>
      {!editingDef ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formDefs.map((def) => (
            <div key={def.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
              <h3 className="font-bold text-slate-700 mb-2">
                {def.type === 'customer_profile' ? '👤 客戶基本資料欄位' : '📅 預約表單填寫欄位'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">共有 {def.fields.length} 個欄位</p>
              <button
                onClick={() => setEditingDef(def)}
                className="text-blue-600 text-sm font-semibold hover:underline"
              >
                編輯欄位
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">正在編輯：{editingDef.type === 'customer_profile' ? '客戶資料' : '預約表單'}</h3>
            <div className="space-x-2">
              <button onClick={() => setEditingDef(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Save size={18} /> 儲存變更
              </button>
            </div>
          </div>

          {/* 系統預設欄位顯示區 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Lock size={12} /> 系統預設欄位 (不可修改)
             </h4>
             <div className="space-y-2">
                {SYSTEM_FIELDS[editingDef.type]?.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 opacity-70">
                        <span className="w-1/3 font-medium">{field.label}</span>
                        <span className="w-1/3 bg-slate-100 px-2 py-0.5 rounded text-xs">{field.type}</span>
                        <span className="w-1/3 flex items-center gap-1">
                            {field.req && <span className="text-red-500 text-xs font-bold">* 必填</span>}
                        </span>
                    </div>
                ))}
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">自定義欄位</h4>
            {editingDef.fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 p-4 bg-slate-50 rounded-lg items-start">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    className="input-field"
                    placeholder="標籤名稱"
                    value={field.label}
                    onChange={(e) => {
                      const newFields = [...editingDef.fields];
                      newFields[index].label = e.target.value;
                      setEditingDef({ ...editingDef, fields: newFields });
                    }}
                  />
                  <select
                    className="input-field"
                    value={field.type}
                    onChange={(e) => {
                      const newFields = [...editingDef.fields];
                      newFields[index].type = e.target.value as any;
                      setEditingDef({ ...editingDef, fields: newFields });
                    }}
                  >
                    <option value="text">文字</option>
                    <option value="number">數字</option>
                    <option value="date">日期</option>
                    <option value="tel">電話</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const newFields = [...editingDef.fields];
                        newFields[index].required = e.target.checked;
                        setEditingDef({ ...editingDef, fields: newFields });
                      }}
                    />
                    必填
                  </label>
                </div>
                <button
                  onClick={() => {
                    const newFields = editingDef.fields.filter((_, i) => i !== index);
                    setEditingDef({ ...editingDef, fields: newFields });
                  }}
                  className="text-red-500 hover:bg-red-50 p-2 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addField}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2"
          >
            <Plus size={20} /> 新增欄位
          </button>
        </div>
      )}
    </div>
  );
};

const SettingsManager: React.FC = () => {
  const [config, setConfig] = useState({ enabled: false, user: '', pass: '', from_name: '' });

  useEffect(() => {
    supabase.from('system_settings').select('*').eq('key', 'email_config').single()
      .then(({ data }) => data && setConfig(data.value));
  }, []);

  const saveSettings = async () => {
    await supabase.from('system_settings').upsert({ key: 'email_config', value: config });
    alert('設定已儲存');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">系統與 Email 設定</h2>
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-700 mb-6">
        提示：Email 通知功能需要設定 Gmail 帳號與「應用程式密碼」。請確保您已在 Google 帳號中開啟 2FA 並產生應用程式密碼。
      </div>
      
      <div className="space-y-4 max-w-md">
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          />
          <span className="font-medium text-slate-700">啟用 Email 自動通知</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">寄件者顯示名稱</label>
          <input
            className="input-field"
            value={config.from_name}
            onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
            placeholder="例如：智慧預約中心"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gmail 帳號 (Email)</label>
          <input
            className="input-field"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            placeholder="your-email@gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gmail 應用程式密碼</label>
          <input
            type="password"
            className="input-field"
            value={config.pass}
            onChange={(e) => setConfig({ ...config, pass: e.target.value })}
            placeholder="16 位數應用程式密碼"
          />
        </div>

        <button onClick={saveSettings} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <Save size={18} /> 儲存設定
        </button>
      </div>
    </div>
  );
};

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers') // 改為讀取 customers 表
      .select('*')
      .order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">載入客戶資料中...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">客戶管理 (註冊會員)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 px-4 font-semibold text-slate-600">客戶名稱</th>
              <th className="py-3 px-4 font-semibold text-slate-600">Email</th>
              <th className="py-3 px-4 font-semibold text-slate-600">電話</th>
              <th className="py-3 px-4 font-semibold text-slate-600">註冊時間</th>
              <th className="py-3 px-4 font-semibold text-slate-600">詳細資料</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-4 px-4 text-sm font-medium text-slate-900">{c.full_name}</td>
                <td className="py-4 px-4 text-sm text-slate-500">{c.email}</td>
                <td className="py-4 px-4 text-sm text-slate-500">{c.phone || '-'}</td>
                <td className="py-4 px-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="py-4 px-4 text-xs text-slate-400">
                  <pre className="max-w-[200px] truncate" title={JSON.stringify(c.custom_data, null, 2)}>
                    {JSON.stringify(c.custom_data)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="text-center py-12 text-slate-400">尚無註冊會員</div>
        )}
      </div>
    </div>
  );
};