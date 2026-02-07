import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShieldCheck, Bell, Edit2, ArrowRight } from 'lucide-react';
import { EditableText } from './EditableText';
import { DynamicIcon, IconPicker, IconName } from './IconPicker';

export interface LandingContent {
  brand_name: string;
  hero: {
    title: string;
    subtitle: string;
    cta_booking: string;
    cta_login: string;
  };
  features: {
    title: string;
    desc: string;
    icon: string;
  }[];
}

export const DEFAULT_CONTENT: LandingContent = {
  brand_name: '智慧預約',
  hero: {
    title: '簡單、快速、專業的 <span class="text-blue-600">預約管理系統</span>',
    subtitle: '為您的客戶提供最流暢的預約體驗，同時讓您能輕鬆管理所有預約。支援自定義欄位、Email 自動通知與行事曆同步。',
    cta_booking: '立即預約服務',
    cta_login: '會員登入'
  },
  features: [
    { title: '彈性預約流程', desc: '客戶可以輕鬆選擇時段，並填寫您自定義的預約欄位，滿足各種業務需求。', icon: 'calendar' },
    { title: '安全帳號管理', desc: '採用高規格加密與權限控管，確保客戶資料安全，並提供完整的個人化預約紀錄。', icon: 'shield' },
    { title: '即時 Email 通知', desc: '整合 Gmail SMTP，當預約成功或狀態變更時，系統會自動發送通知郵件。', icon: 'bell' }
  ]
};

interface LandingTemplateProps {
  content: LandingContent;
  isEditing: boolean;
  onUpdate?: (newContent: LandingContent) => void;
}

export const LandingTemplate: React.FC<LandingTemplateProps> = ({ content, isEditing, onUpdate }) => {
  
  const updateContent = (path: string[], value: any) => {
    if (!onUpdate) return;
    const newContent = JSON.parse(JSON.stringify(content));
    let current = newContent;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onUpdate(newContent);
  };

  return (
    <div className="bg-white selection:bg-blue-100">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <EditableText
                as="h1"
                className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]"
                value={content.hero.title}
                isEditing={isEditing}
                onSave={(val) => updateContent(['hero', 'title'], val)}
            />
            
            <div className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
                <EditableText
                    as="p"
                    value={content.hero.subtitle}
                    isEditing={isEditing}
                    multiline
                    onSave={(val) => updateContent(['hero', 'subtitle'], val)}
                />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/booking" className="group btn-primary py-5 px-10 text-lg rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transform transition-all hover:scale-105 active:scale-95">
                <EditableText
                    value={content.hero.cta_booking}
                    isEditing={isEditing}
                    onSave={(val) => updateContent(['hero', 'cta_booking'], val)}
                />
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
              <Link to="/login" className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-5 px-10 text-lg rounded-2xl font-bold transition-all flex items-center justify-center">
                <EditableText
                    value={content.hero.cta_login}
                    isEditing={isEditing}
                    onSave={(val) => updateContent(['hero', 'cta_login'], val)}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.features.map((feature, index) => (
              <FeatureCard
                key={index}
                iconName={feature.icon}
                title={feature.title}
                desc={feature.desc}
                isEditing={isEditing}
                onUpdate={(t, d, i) => {
                  const path = ['features', index.toString()];
                  updateContent([...path, 'title'], t);
                  updateContent([...path, 'desc'], d);
                  if (i) updateContent([...path, 'icon'], i);
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ 
    iconName: string; 
    title: string; 
    desc: string;
    isEditing: boolean;
    onUpdate: (title: string, desc: string, icon?: string) => void;
}> = ({ iconName, title, desc, isEditing, onUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 relative group">
      <div className="mb-8 relative inline-block">
        <div className={`w-16 h-16 flex items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 ${isEditing ? 'cursor-pointer hover:rotate-6 transition-transform' : ''}`}
             onClick={() => isEditing && setShowPicker(!showPicker)}>
          <DynamicIcon name={iconName} size={32} />
        </div>
        
        {isEditing && showPicker && (
          <div className="absolute top-full left-0 mt-4 z-50">
            <div className="fixed inset-0 bg-transparent" onClick={() => setShowPicker(false)}></div>
            <div className="relative animate-in fade-in zoom-in-95 duration-200">
              <IconPicker 
                currentIcon={iconName} 
                onSelect={(name) => {
                  onUpdate(title, desc, name);
                  setShowPicker(false);
                }} 
              />
            </div>
          </div>
        )}
      </div>

      <EditableText
          as="h3"
          className="text-2xl font-bold text-slate-800 mb-4"
          value={title}
          isEditing={isEditing}
          onSave={(val) => onUpdate(val, desc, iconName)}
      />
      <div className="text-slate-500 leading-relaxed font-medium">
          <EditableText
              as="p"
              value={desc}
              multiline
              isEditing={isEditing}
              onSave={(val) => onUpdate(title, val, iconName)}
          />
      </div>
    </div>
  );
};
