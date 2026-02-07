import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { User, Phone, Mail, Save, ShieldCheck } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { customer, logout } = useCustomer();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    custom_data: {} as any
  });

  useEffect(() => {
    if (customer) {
      // 從資料庫重新讀取最新資料，確保不是舊的 session 快取
      supabase.from('customers').select('*').eq('id', customer.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile({
              full_name: data.full_name,
              email: data.email,
              phone: data.phone || '',
              custom_data: data.custom_data || {}
            });
          }
        });
    }
  }, [customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setLoading(true);

    const { error } = await supabase
      .from('customers')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        custom_data: profile.custom_data
      })
      .eq('id', customer.id);

    if (error) {
      alert('更新失敗：' + error.message);
    } else {
      alert('個人資料已成功更新！');
      // 更新本地 Session 資料 (可選)
      const updated = { ...customer, full_name: profile.full_name };
      localStorage.setItem('customer_session', JSON.stringify(updated));
    }
    setLoading(false);
  };

  if (!customer) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="bg-blue-600 p-10 text-white relative">
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <User size={32} /> 個人資料設定
            </h1>
            <p className="text-blue-100 mt-2 opacity-80 font-medium">管理您的帳號資訊與聯絡方式</p>
          </div>
          <ShieldCheck className="absolute right-[-20px] bottom-[-20px] text-white/10 w-48 h-48" />
        </div>

        <form onSubmit={handleSave} className="p-10 space-y-8">
          <div className="grid grid-cols-1 gap-6">
            {/* 固定欄位 */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">帳號 Email (不可修改)</label>
              <div className="relative">
                <input type="email" disabled className="input-field bg-slate-50 border-none text-slate-400 cursor-not-allowed pl-12 py-4 rounded-2xl" value={profile.email} />
                <Mail size={20} className="absolute left-4 top-4 text-slate-300" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">您的全名</label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner focus:shadow-none" 
                  value={profile.full_name} 
                  onChange={e => setProfile({...profile, full_name: e.target.value})}
                />
                <User size={20} className="absolute left-4 top-4 text-slate-300" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">聯絡電話</label>
              <div className="relative">
                <input 
                  type="tel" 
                  className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner focus:shadow-none" 
                  value={profile.phone} 
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                />
                <Phone size={20} className="absolute left-4 top-4 text-slate-300" />
              </div>
            </div>

            {/* 動態資料欄位編輯 (以文字框呈現) */}
            {Object.keys(profile.custom_data).length > 0 && (
              <div className="pt-4 border-t border-slate-50 space-y-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">其他詳細資訊</h3>
                {Object.entries(profile.custom_data).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{key}</label>
                    <input 
                      type="text"
                      className="input-field pl-6 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner" 
                      value={String(value)} 
                      onChange={e => {
                        const next = { ...profile.custom_data, [key]: e.target.value };
                        setProfile({ ...profile, custom_data: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Save size={20} /> 儲存變更並更新</>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => { logout(); window.location.href = '/'; }}
              className="text-slate-400 text-sm font-bold hover:text-red-500 transition-colors py-2"
            >
              安全登出帳號
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
