import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LandingTemplate, DEFAULT_CONTENT, LandingContent } from '../components/cms/LandingTemplate';
import { EditableText } from '../components/cms/EditableText';
import { Save, Eye, RefreshCw } from 'lucide-react';

export const WebsiteEditor: React.FC = () => {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('page_content')
      .select('content')
      .eq('section_key', 'landing_page')
      .single();

    if (data?.content) {
      setContent(data.content);
    }
    setLoading(false);
    setHasChanges(false);
  };

  const handleUpdate = (newContent: LandingContent) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('page_content')
      .upsert({ 
        section_key: 'landing_page', 
        content: content 
      });

    if (error) {
      alert('儲存失敗：' + error.message);
    } else {
      setHasChanges(false);
      // alert('網站內容已更新！'); // 為了體驗流暢，可以選擇不跳 alert，或用 toast
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">載入編輯器中...</div>;

  return (
    <div className="relative min-h-screen bg-slate-100">
      {/* 頂部工具列 */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Eye size={20} className="text-blue-600"/> 
            首頁內容編輯器
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">所見即所得模式</span>
        </h2>
        <div className="flex items-center gap-3">
            {hasChanges && (
                <span className="text-sm text-amber-600 font-medium animate-pulse">
                    有未儲存的變更
                </span>
            )}
            <button 
                onClick={fetchContent}
                disabled={saving || !hasChanges}
                className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                title="重置變更"
            >
                <RefreshCw size={20} />
            </button>
            <button 
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="btn-primary flex items-center gap-2 px-6 py-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
            >
                {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <Save size={18} />
                        儲存發布
                    </>
                )}
            </button>
        </div>
      </div>

      {/* 編輯區域 (模擬首頁外觀) */}
      <div className="border-x border-slate-200 max-w-[100%] mx-auto bg-white min-h-[calc(100vh-80px)]">
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-center text-xs text-yellow-800">
              提示：點擊任何文字即可開始編輯。編輯後請記得按右上角的「儲存發布」。
          </div>

          {/* 品牌名稱編輯區 (模擬 Navbar 位置) */}
          <div className="bg-slate-50 border-b border-slate-100 px-8 py-4 flex items-center gap-4">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">網站 Logo 文字:</span>
              <div className="bg-white px-4 py-2 rounded-lg border border-blue-200 flex items-center gap-2">
                  <EditableText 
                    value={content.brand_name || '智慧預約'} 
                    isEditing={true} 
                    onSave={(val) => handleUpdate({ ...content, brand_name: val })}
                    className="text-xl font-bold text-blue-600"
                  />
              </div>
          </div>

          <LandingTemplate 
            content={content} 
            isEditing={true} 
            onUpdate={handleUpdate} 
          />
      </div>
    </div>
  );
};
