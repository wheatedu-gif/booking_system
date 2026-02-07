import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, LayoutTemplate, FileText, Shield, Eye } from 'lucide-react';
import { useToast } from '../components/Toast';

export const WebsiteEditor: React.FC = () => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'legal'>('content');
  const [content, setContent] = useState<any>(null);
  const [legal, setLegal] = useState({ terms: '', privacy: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cData } = await supabase.from('page_content').select('*');
      if (cData) {
        cData.forEach(d => {
          if (d.section_key === 'landing_page') setContent(d.content);
          if (d.section_key === 'terms_and_privacy') setLegal(d.content);
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveContent = async () => {
    const { error } = await supabase.from('page_content').upsert({ section_key: 'landing_page', content });
    if (error) showToast('儲存失敗', 'error'); else showToast('內容已更新');
  };

  const handleSaveLegal = async () => {
    const { error } = await supabase.from('page_content').upsert({ section_key: 'terms_and_privacy', content: legal });
    if (error) showToast('儲存失敗', 'error'); else showToast('條款已更新');
  };

  if (loading) return <div className="p-20 text-center">載入中...</div>;

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3"><LayoutTemplate className="text-blue-600" /> 網站內容管理</h2>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveSubTab('content')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'content' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>首頁內容</button>
            <button onClick={() => setActiveSubTab('legal')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'legal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>條款與隱私</button>
        </div>
      </div>

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 max-w-4xl mx-auto">
        {activeSubTab === 'content' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center"><div><h3 className="text-xl font-black text-slate-800">首頁文案編輯</h3><p className="text-xs text-slate-400 mt-1">修改品牌名稱與 Hero 區塊</p></div><button onClick={handleSaveContent} className="btn-primary px-8 py-3 rounded-2xl font-black shadow-lg"><Save size={18}/></button></div>
            <div className="grid gap-6">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">品牌名稱 (Logo)</label><input className="input-field bg-white rounded-2xl py-4" value={content.brand_name} onChange={e => setContent({...content, brand_name: e.target.value})} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hero 標題</label><input className="input-field bg-white rounded-2xl py-4" value={content.hero.title} onChange={e => setContent({...content, hero: { ...content.hero, title: e.target.value }})} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hero 副標題</label><textarea rows={3} className="input-field bg-white rounded-2xl py-4" value={content.hero.subtitle} onChange={e => setContent({...content, hero: { ...content.hero, subtitle: e.target.value }})} /></div>
            </div>
            <div className="pt-6 text-center"><a href="/" target="_blank" className="text-blue-600 font-bold text-sm flex items-center justify-center gap-2 hover:underline"><Eye size={16}/> 預覽首頁效果</a></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center"><div><h3 className="text-xl font-black text-slate-800">服務條款與隱私政策</h3><p className="text-xs text-slate-400 mt-1">內容將顯示在註冊頁面的彈出視窗中</p></div><button onClick={handleSaveLegal} className="btn-primary px-8 py-3 rounded-2xl font-black shadow-lg"><Save size={18}/></button></div>
            <div className="grid gap-8">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={14}/> 服務條款內容</label><textarea rows={10} className="input-field bg-white rounded-2xl p-6 text-sm leading-relaxed" value={legal.terms} onChange={e => setLegal({...legal, terms: e.target.value})} placeholder="輸入您的服務條款..." /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield size={14}/> 隱私權政策內容</label><textarea rows={10} className="input-field bg-white rounded-2xl p-6 text-sm leading-relaxed" value={legal.privacy} onChange={e => setLegal({...legal, privacy: e.target.value})} placeholder="輸入您的隱私權政策..." /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};