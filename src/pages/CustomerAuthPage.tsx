import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Phone, FileText, CheckSquare, Square, X } from 'lucide-react';
import { FormDefinition } from '../types';
import { useToast } from '../components/Toast';

export const CustomerAuthPage: React.FC = () => {
  const { login, register } = useCustomer();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAllowTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState({ terms: '', privacy: '' });
  
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('form_definitions').select('*').eq('type', 'customer_profile').single().then(({ data }) => { if (data) setFormDef(data); });
    supabase.from('page_content').select('content').eq('section_key', 'terms_and_privacy').single().then(({ data }) => { if (data?.content) setTermsContent(data.content); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !agreeTerms) { showToast('請先閱讀並同意服務條款', 'error'); return; }
    
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await register(email, password, fullName, JSON.stringify({ ...dynamicData, phone }));
        showToast('註冊成功！歡迎加入');
      } else {
        await login(email, password);
        showToast('歡迎回來');
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
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-6"><User size={32} /></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{isSignUp ? '建立新帳號' : '歡迎回來'}</h2>
          <p className="text-slate-400 font-medium mt-2">{isSignUp ? '立即註冊享受完整預約服務' : '請登入您的會員帳號'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">全名</label>
              <div className="relative"><input type="text" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="您的姓名" /><User size={20} className="absolute left-4 top-4 text-slate-300" /></div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">電子郵件</label>
            <div className="relative"><input type="email" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" /><Mail size={20} className="absolute left-4 top-4 text-slate-300" /></div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">密碼</label>
            <div className="relative"><input type="password" required className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="您的密碼" /><Lock size={20} className="absolute left-4 top-4 text-slate-300" /></div>
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">聯絡電話</label>
                <div className="relative"><input type="tel" className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none focus:bg-white transition-all shadow-inner" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx-xxx-xxx" /><Phone size={20} className="absolute left-4 top-4 text-slate-300" /></div>
              </div>

              {formDef?.fields.filter(f => !f.isSystem).map((field) => (
                <div key={field.id}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                  <div className="relative">{field.type === 'select' ? (<select required={field.required} className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none appearance-none" onChange={(e) => setDynamicData({ ...dynamicData, [field.label]: e.target.value })}><option value="">請選擇...</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>) : (<input type={field.type} required={field.required} className="input-field pl-12 py-4 rounded-2xl bg-slate-50 border-none shadow-inner" onChange={(e) => setDynamicData({ ...dynamicData, [field.label]: e.target.value })} placeholder={field.label} />)}<FileText size={20} className="absolute left-4 top-4 text-slate-300" /></div>
                </div>
              ))}

              <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="hidden" checked={agreeTerms} onChange={e => setAllowTerms(e.target.checked)} />
                      <div className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreeTerms ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 group-hover:border-blue-400'}`}>
                          {agreeTerms && <CheckSquare size={16} />}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">我已閱讀並同意 <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-600 font-bold hover:underline">服務條款與隱私政策</button></span>
                  </label>
              </div>
            </>
          )}

          {error && <div className="flex items-center gap-3 text-red-500 text-xs bg-red-50 p-4 rounded-2xl border border-red-100 font-bold"><AlertCircle size={16} /> {error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98] mt-4">{loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : (isSignUp ? '立即建立帳號' : '登入會員中心')}</button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-slate-50">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors">{isSignUp ? '已有帳號？ 返回登入' : '還沒有帳號？ 點此註冊'}</button>
        </div>
      </div>

      {/* 條款 Modal */}
      {showTermsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
              <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="text-2xl font-black text-slate-800">服務條款與隱私政策</h3>
                      <button onClick={() => setShowTermsModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X/></button>
                  </div>
                  <div className="p-10 overflow-y-auto space-y-8 prose prose-slate">
                      <section>
                          <h4 className="text-lg font-bold text-slate-800 mb-4">一、服務條款</h4>
                          <div className="text-slate-500 whitespace-pre-wrap leading-relaxed">{termsContent.terms}</div>
                      </section>
                      <section>
                          <h4 className="text-lg font-bold text-slate-800 mb-4">二、隱私權政策</h4>
                          <div className="text-slate-500 whitespace-pre-wrap leading-relaxed">{termsContent.privacy}</div>
                      </section>
                  </div>
                  <div className="p-8 bg-slate-50 text-center">
                      <button onClick={() => { setAllowTerms(true); setShowTermsModal(false); }} className="btn-primary px-12 py-4 rounded-2xl font-black">我已了解並同意</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};