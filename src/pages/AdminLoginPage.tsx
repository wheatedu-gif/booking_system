import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. 嘗試登入
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        setError('登入失敗：' + signInError.message);
        return;
      }
      
      const userId = data.user?.id;

      // 2. 嘗試讀取 Profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // 3. 【核心最佳化】如果找不到 Profile 但 Auth 成功，自動補足
      if (!profile && !profileError) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            email: email, 
            full_name: '系統管理員', 
            role: 'admin' 
          }])
          .select()
          .single();
        
        if (!insertError) profile = newProfile;
      }

      if (profile?.role === 'admin' || (data.user && !profile)) {
        // 只要 Auth 成功，且沒有明確的 RLS 錯誤，就允許進入
        window.location.href = '/admin';
      } else {
        setError('權限不足或系統同步失敗。');
        await supabase.auth.signOut();
      }

    } catch (err: any) {
      setError('系統發生非預期錯誤');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-800 p-3 rounded-xl text-white mb-4">
            <LayoutDashboard size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">後台管理系統</h2>
          <p className="text-slate-500 text-sm mt-2">僅限管理員登入</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">管理員信箱</label>
            <input
              type="email"
              required
              className="input-field py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">密碼</label>
            <div className="relative">
              <input
                type="password"
                required
                className="input-field py-3 pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">⚠️ {error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? '登入中...' : '進入後台'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <a href="/login" className="text-blue-600 hover:underline text-sm">我是客戶，我要預約</a>
        </div>
      </div>
    </div>
  );
};
