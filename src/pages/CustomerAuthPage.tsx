import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Phone } from 'lucide-react';

export const CustomerAuthPage: React.FC = () => {
  const { login, register } = useCustomer();
  const navigate = useNavigate();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({
    full_name: '您的全名',
    email: '電子郵件',
    phone: '聯絡電話'
  });

  useEffect(() => {
    // 讀取客戶資料表單定義以取得自訂標籤
    supabase.from('form_definitions')
      .select('fields')
      .eq('type', 'customer_profile')
      .single()
      .then(({ data }) => {
        if (data?.fields) {
          const newLabels = { ...labels };
          data.fields.forEach((f: any) => {
            if (f.isSystem) newLabels[f.name] = f.label;
          });
          setLabels(newLabels);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await register(email, password, fullName);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-600 p-3 rounded-xl text-white mb-4 shadow-lg shadow-green-200"><User size={32} /></div>
          <h2 className="text-2xl font-bold text-slate-800">{isSignUp ? '註冊會員帳號' : '會員登入'}</h2>
          <p className="text-slate-500 text-sm mt-2">{isSignUp ? '註冊後即可開始預約服務' : '請輸入您的帳號密碼'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{labels.full_name}</label>
              <div className="relative">
                <input type="text" required className="input-field pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="王大明" />
                <User size={18} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{labels.email}</label>
            <div className="relative">
              <input type="email" required className="input-field pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">密碼</label>
            <div className="relative">
              <input type="password" required className="input-field pl-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg"><AlertCircle size={16} /> {error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors mt-4">
            {loading ? '處理中...' : (isSignUp ? '立即註冊' : '登入')}
          </button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-slate-100">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-green-600 hover:text-green-800 font-medium text-sm transition-colors">
            {isSignUp ? '已經有帳號了？返回登入' : '還沒有帳號？立即註冊'}
          </button>
        </div>
        <div className="mt-4 text-center"><a href="/admin/login" className="text-slate-400 text-xs hover:text-slate-600">我是管理員？點此登入後台</a></div>
      </div>
    </div>
  );
};