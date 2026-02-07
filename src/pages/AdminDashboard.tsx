import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, Appointment } from '../types';
import { Plus, Trash2, Save, Settings, Users, Calendar as CalendarIcon, FormInput, Clock, LayoutTemplate } from 'lucide-react';
import { AvailabilitySettings } from './AvailabilitySettings';
import { WebsiteEditor } from './WebsiteEditor';

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

  // 如果是 CMS 模式，我們給它全螢幕或更大的空間，或者保持一致。
  // 這裡選擇保持在 Dashboard 框架內。

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
            {/* CMS 編輯器因為很大，我們把 padding 拿掉或設小一點 */}
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

const AppointmentManager: React.FC<{ appointments: Appointment[], onStatusChange: (id: string, s: string, reason?: string) => void }> = ({ appointments, onStatusChange }) => {
  const handleCancel = (id: string) => {
    const reason = window.prompt('請輸入取消原因：');
    if (reason !== null) {
      onStatusChange(id, 'cancelled', reason);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">預約列表</h2>
      <div className="overflow-x-auto">
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
                  <div className="text-slate-500">{apt.booking_time}</div>
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
    </div>
  );
};

const FormManager: React.FC<{ formDefs: FormDefinition[], onRefresh: () => void }> = ({ formDefs, onRefresh }) => {
  const [editingDef, setEditingDef] = useState<FormDefinition | null>(null);

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

          <div className="space-y-4">
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
  
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'customer').then(({ data }) => setCustomers(data || []));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">客戶管理</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 px-4 font-semibold text-slate-600">客戶名稱</th>
              <th className="py-3 px-4 font-semibold text-slate-600">Email</th>
              <th className="py-3 px-4 font-semibold text-slate-600">註冊時間</th>
              <th className="py-3 px-4 font-semibold text-slate-600">自定義資料</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="py-4 px-4 text-sm font-medium">{c.full_name}</td>
                <td className="py-4 px-4 text-sm text-slate-500">{c.email}</td>
                <td className="py-4 px-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="py-4 px-4 text-xs text-slate-400">
                  <pre>{JSON.stringify(c.custom_data, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
