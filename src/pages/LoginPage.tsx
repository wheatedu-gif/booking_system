import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Calendar, Mail, Lock, User, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      if (isSignUp) {
        // --- 註冊流程 ---
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName } // 這裡的資料會被 Trigger 讀取並寫入 profiles
          }
        });
        if (signUpError) throw signUpError;
        
        setMsg('註冊成功！請檢查您的信箱以驗證帳號，驗證後即可登入預約。');
        setIsSignUp(false); // 切換回登入模式
      } else {
        // --- 登入流程 ---
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // 登入成功，判斷身分
        if (data.user) {
          // 延遲一下讓 RLS 確保能讀取到
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
             console.error('Profile fetch error:', profileError);
             // 如果讀不到 Profile，通常是 Trigger 還沒跑完或者 RLS 問題
             // 但我們還是先讓使用者進去首頁，至少是登入狀態
             navigate('/'); 
          } else {
            if (profile?.role === 'admin') {
              navigate('/admin');
            } else {
              navigate('/booking'); // 客戶登入後直接去預約
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl text-white mb-4 shadow-lg shadow-blue-200">
            <Calendar size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isSignUp ? '註冊會員' : '登入系統'}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isSignUp ? '建立帳號以開始預約' : '歡迎回來，請登入繼續'}
          </p>
        </div>

        {msg && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
            {msg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">您的全名</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="input-field pl-10"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="王大明"
                />
                <User size={18} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">電子郵件</label>
            <div className="relative">
              <input
                type="email"
                required
                className="input-field pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">密碼</label>
            <div className="relative">
              <input
                type="password"
                required
                className="input-field pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-lg shadow-md mt-4"
          >
            {loading ? '處理中...' : (isSignUp ? '註冊帳號' : '登入')}
          </button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-slate-100">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMsg(null);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            {isSignUp ? '已經有帳號了？返回登入' : '還沒有帳號？立即免費註冊'}
          </button>
        </div>
      </div>
    </div>
  );
};
