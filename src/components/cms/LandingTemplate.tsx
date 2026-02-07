import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShieldCheck, Bell, Edit2 } from 'lucide-react';
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
  about: {
    title: string;
    desc: string;
    list: string[];
  };
}

// 預設內容
export const DEFAULT_CONTENT: LandingContent = {
  brand_name: '智慧預約',
  hero: {
    title: '簡單、快速、專業的 <span class="text-blue-600">預約管理系統</span>',
    subtitle: '為您的客戶提供最流暢的預約體驗，同時讓您能輕鬆管理所有預約與客戶資料。支援自定義欄位、Email 自動通知與行事曆同步。',
    cta_booking: '立即預約服務',
    cta_login: '會員登入'
  },
  features: [
    { title: '彈性預約流程', desc: '客戶可以輕鬆選擇時段，並填寫您自定義的預約欄位，滿足各種業務需求。', icon: 'calendar' },
    { title: '安全帳號管理', desc: '採用高規格加密與權限控管，確保客戶資料安全，並提供完整的個人化預約紀錄。', icon: 'shield' },
    { title: '即時 Email 通知', desc: '整合 Gmail SMTP，當預約成功或狀態變更時，系統會自動發送通知郵件。', icon: 'bell' }
  ],
  about: {
    title: '強大的自定義欄位功能',
    desc: '不需要寫程式，管理員就能直接在後台增減客戶資料欄位與預約填寫欄位。無論是電話、地址還是特殊需求，都能隨時調整。',
    list: ['動態欄位定義', 'JSONB 結構儲存', '支援多種輸入類型', '必填項彈性設定']
  }
};

interface LandingTemplateProps {
  content: LandingContent;
  isEditing: boolean;
  onUpdate?: (newContent: LandingContent) => void;
}

export const LandingTemplate: React.FC<LandingTemplateProps> = ({ content, isEditing, onUpdate }) => {
  
  const updateContent = (path: string[], value: any) => {
    if (!onUpdate) return;
    const newContent = JSON.parse(JSON.stringify(content)); // Deep copy
    
    // 簡單的 path 賦值邏輯
    let current = newContent;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    onUpdate(newContent);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <EditableText
                as="h1"
                className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6"
                value={content.hero.title}
                isEditing={isEditing}
                onSave={(val) => updateContent(['hero', 'title'], val)}
            />
            <div className="text-xl text-slate-600 mb-10 leading-relaxed">
                <EditableText
                    as="p"
                    value={content.hero.subtitle}
                    isEditing={isEditing}
                    multiline
                    onSave={(val) => updateContent(['hero', 'subtitle'], val)}
                />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/booking" className="btn-primary py-4 px-8 text-lg rounded-xl shadow-lg shadow-blue-200">
                <EditableText
                    value={content.hero.cta_booking}
                    isEditing={isEditing}
                    onSave={(val) => updateContent(['hero', 'cta_booking'], val)}
                />
              </Link>
              <Link to="/login" className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 px-8 text-lg rounded-xl font-medium transition-colors">
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

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative">
      <div className="mb-6 relative inline-block group">
        <div className={`p-3 rounded-xl bg-blue-50 text-blue-600 ${isEditing ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
             onClick={() => isEditing && setShowPicker(!showPicker)}>
          <DynamicIcon name={iconName} size={32} />
          {isEditing && (
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 size={10} />
            </div>
          )}
        </div>
        
        {isEditing && showPicker && (
          <div className="absolute top-full left-0 mt-2 z-50">
            <div className="fixed inset-0" onClick={() => setShowPicker(false)}></div>
            <div className="relative">
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
          className="text-xl font-bold text-slate-900 mb-3"
          value={title}
          isEditing={isEditing}
          onSave={(val) => onUpdate(val, desc, iconName)}
      />
      <div className="text-slate-600 leading-relaxed">
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
