import React from 'react';
import { EditableText } from './EditableText';
import { Link } from 'react-router-dom';

export interface LandingContent {
  brand_name?: string;
  hero?: { title?: string; subtitle?: string };
  features?: any[];
}

export const DEFAULT_CONTENT: LandingContent = {
  brand_name: '智慧預約',
  hero: { title: '專業預約管理', subtitle: '為您的客戶提供最流暢的預約體驗' },
  features: [],
};

interface LandingTemplateProps {
  content: any;
  onUpdate: (newContent: any) => void;
  isEditing?: boolean;
}

export const LandingTemplate: React.FC<LandingTemplateProps> = ({ content, onUpdate, isEditing = false }) => {
  const updateHero = (key: string, value: string) => {
    onUpdate({ ...content, hero: { ...content.hero, [key]: value } });
  };

  return (
    <div className="bg-white font-sans text-slate-900 overflow-x-hidden min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 px-4 overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] aspect-square bg-gradient-to-b from-blue-50/50 to-transparent rounded-full -z-10 blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
            <EditableText 
              value={content.hero?.title || '專業預約管理'} 
              onSave={(v) => updateHero('title', v)} 
              isEditing={isEditing}
              className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600"
            />
          </h1>
          
          <p className="text-lg lg:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            <EditableText 
              value={content.hero?.subtitle || '為您的客戶提供最流暢的預約體驗'} 
              onSave={(v) => updateHero('subtitle', v)} 
              isEditing={isEditing}
            />
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/booking" className="btn-primary px-12 py-5 rounded-2xl text-lg font-black shadow-2xl shadow-blue-200 hover:-translate-y-1 transition-all">
              立即預約服務
            </Link>
            <Link to="/my-appointments" className="px-12 py-5 rounded-2xl text-lg font-bold text-slate-500 hover:bg-slate-50 transition-all">
              查看我的紀錄
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};