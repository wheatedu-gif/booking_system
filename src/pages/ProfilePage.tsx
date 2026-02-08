import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { User, Phone, Mail, Save, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '../components/Toast';
import { FormDefinition } from '../types';

export const ProfilePage: React.FC = () => {
  const { customer, logout } = useCustomer();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    custom_data: {} as any
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    supabase.from('form_definitions').select('*').eq('type', 'customer_profile').single().then(({ data }) => setFormDef(data || null));
  }, []);
  useEffect(() => {
    if (customer) {
      supabase.rpc('get_customer_profile', { p_customer_id: customer.id })
        .then(({ data }) => {
          if (data?.success && data?.data) {
            const d = data.data;
            setProfile({
              full_name: d.full_name || '',
              email: d.email || '',
              phone: d.phone || d.custom_data?.phone || '',
              custom_data: d.custom_data || {}
            });
          }
        });
    }
  }, [customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setLoading(true);

    const mergedCustom = { ...profile.custom_data, phone: profile.phone };
    const { data, error } = await supabase.rpc('update_customer_profile', {
      p_customer_id: customer.id,
      p_full_name: profile.full_name,
      p_phone: profile.phone,
      p_custom_data: mergedCustom
    });

    if (error || !data?.success) showToast(data?.message || '更新失敗', 'error');
    else showToast('基本資料已更新');
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showToast('新密碼與確認密碼不符', 'error');
        return;
    }
    setPassLoading(true);

    // 呼叫後端 RPC 修改密碼 (需建立 update_customer_password 函數)
    const { data, error } = await supabase.rpc('update_customer_password', {
        p_customer_id: customer?.id,
        p_old_password: passwordData.oldPassword,
        p_new_password: passwordData.newPassword
    });

    if (error || !data.success) {
        showToast(data?.message || '密碼修改失敗', 'error');
    } else {
        showToast('密碼已成功修改');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
    setPassLoading(false);
  };

  if (!customer) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
            <div className="bg-blue-600 p-10 text-white relative overflow-hidden">
                <h1 className="text-3xl font-black flex items-center gap-3 relative z-10"><User size={32} /> 資料設定</h1>
                <ShieldCheck className="absolute right-[-20px] bottom-[-20px] text-white/10 w-48 h-48" />
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
                <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">您的全名</label><input type="text" className="input-field bg-slate-50 border-none rounded-2xl py-4" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">聯絡電話</label><input type="tel" className="input-field bg-slate-50 border-none rounded-2xl py-4" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></div>
                {formDef?.fields.filter(f => !f.isSystem).map(field => (
                  <div key={field.id}>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                    {field.type === 'select' ? (
                      <select className="input-field bg-slate-50 border-none rounded-2xl py-4" value={profile.custom_data?.[field.label] || ''} onChange={e => setProfile({...profile, custom_data: {...profile.custom_data, [field.label]: e.target.value}})}>
                        <option value="">請選擇...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea className="input-field bg-slate-50 border-none rounded-2xl py-4 min-h-[100px]" value={profile.custom_data?.[field.label] || ''} onChange={e => setProfile({...profile, custom_data: {...profile.custom_data, [field.label]: e.target.value}})} />
                    ) : (
                      <input type={field.type || 'text'} className="input-field bg-slate-50 border-none rounded-2xl py-4" value={profile.custom_data?.[field.label] || ''} onChange={e => setProfile({...profile, custom_data: {...profile.custom_data, [field.label]: e.target.value}})} />
                    )}
                  </div>
                ))}
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 rounded-2xl font-black shadow-lg shadow-blue-100">儲存基本資料</button>
            </form>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Lock className="text-blue-600" /> 修改密碼</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
                <input type="password" placeholder="目前密碼" className="input-field bg-slate-50 border-none rounded-xl" value={passwordData.oldPassword} onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} />
                <input type="password" placeholder="新密碼" className="input-field bg-slate-50 border-none rounded-xl" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} />
                <input type="password" placeholder="確認新密碼" className="input-field bg-slate-50 border-none rounded-xl" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} />
                <button type="submit" disabled={passLoading} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-all">更新安全密碼</button>
            </form>
        </div>
        
        <button onClick={() => { logout(); window.location.href = '/'; }} className="w-full py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all">登出此帳號</button>
      </div>
    </div>
  );
};