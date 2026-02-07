import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Phone, FileText } from 'lucide-react';
import { FormDefinition } from '../types';

export const CustomerAuthPage: React.FC = () => {
  const { login, register } = useCustomer();
  const navigate = useNavigate();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // 動態欄位狀態
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 讀取客戶註冊表單定義
    supabase.from('form_definitions')
      .select('*')
      .eq('type', 'customer_profile')
      .single()
      .then(({ data }) => {
        if (data) setFormDef(data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 合併靜態與動態資料
        const finalCustomData = { ...dynamicData, phone };
        await register(email, password, fullName, JSON.stringify(finalCustomData));
      } else {
        await login(email, password);
      }
      navigate('/booking');
    } catch (err: any) {
      setError(err.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-6">
            <User size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {isSignUp ? '建立新帳號' : '歡迎回來'}
          </h2>
          <p className="text-slate-400 font-medium mt-2">
            {isSignUp ? '立即註冊以享受完整預約服務' : '請登入您的會員帳號'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">全名</label>
              <div className="relative">
                <input type="text" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="您的姓名" />
                <User size={20} className="absolute left-4 top-4 text-slate-300" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">電子郵件</label>
            <div className="relative">
              <input type="email" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              <Mail size={20} className="absolute left-4 top-4 text-slate-300" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">密碼</label>
            <div className="relative">
              <input type="password" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="您的密碼" />
              <Lock size={20} className="absolute left-4 top-4 text-slate-300" />
            </div>
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">聯絡電話</label>
                <div className="relative">
                  <input type="tel" className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx-xxx-xxx" />
                  <Phone size={20} className="absolute left-4 top-4 text-slate-300" />
                </div>
              </div>

              {/* 渲染後台設定的自定義動態欄位 */}
              {formDef?.fields.filter(f => !f.isSystem).map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    {field.type === 'select' ? (
                      <select 
                        required={field.required}
                        className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all appearance-none"
                        onChange={(e) => setDynamicData({ ...dynamicData, [field.label]: e.target.value })}
                      >
                        <option value="">請選擇...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={field.type} 
                        required={field.required}
                        className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all"
                        onChange={(e) => setDynamicData({ ...dynamicData, [field.label]: e.target.value })}
                        placeholder={field.label}
                      />
                    )}
                    <FileText size={20} className="absolute left-4 top-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </>
          )}

          {error && (
            <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 p-4 rounded-2xl border border-red-100 font-bold">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              isSignUp ? '立即註冊帳號' : '登入會員中心'
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-slate-50">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors"
          >
            {isSignUp ? '已有帳號？ 返回登入' : '還沒有帳號？ 點此註冊'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
            <a href="/admin/login" className="text-slate-300 text-xs font-bold hover:text-slate-500 transition-colors uppercase tracking-tighter">Admin Portal</a>
        </div>
      </div>
    </div>
  );
};
