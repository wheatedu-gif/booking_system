import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { showToast('連結無效', 'error'); return; }
    if (newPassword.length < 6) { showToast('密碼至少 6 個字元', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('兩次輸入的密碼不一致', 'error'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_password_with_token', { p_token: token, p_new_password: newPassword });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || '重設失敗');
      setDone(true);
      showToast('密碼已重設成功');
      setTimeout(() => navigate('/customer-auth'), 2000);
    } catch (err: any) {
      showToast(err?.message || '重設失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-800 mb-2">連結無效</h2>
          <p className="text-slate-500 mb-6">請重新從登入頁面申請「忘記密碼」。</p>
          <Link to="/customer-auth" className="btn-primary inline-block px-8 py-3 rounded-2xl font-bold">返回登入</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-800 mb-2">密碼已重設</h2>
          <p className="text-slate-500">即將導向登入頁面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6"><Lock size={32} /></div>
          <h2 className="text-2xl font-black text-slate-800">設定新密碼</h2>
          <p className="text-slate-500 mt-2 text-sm">請輸入您的新密碼</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">新密碼</label>
            <input type="password" required minLength={6} className="input-field w-full pl-4 py-4 rounded-2xl bg-slate-50 border-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少 6 個字元" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">確認密碼</label>
            <input type="password" required className="input-field w-full pl-4 py-4 rounded-2xl bg-slate-50 border-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次輸入新密碼" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-4 rounded-2xl font-black">{loading ? '處理中...' : '重設密碼'}</button>
        </form>
        <p className="mt-6 text-center"><Link to="/customer-auth" className="text-slate-400 hover:text-blue-600 text-sm font-bold">返回登入</Link></p>
      </div>
    </div>
  );
};
