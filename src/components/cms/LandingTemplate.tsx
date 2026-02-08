import React from 'react';
import { EditableText } from './EditableText';
import { IconPicker } from './IconPicker';
import { Calendar, Clock, ShieldCheck, Mail, MapPin, Phone, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LandingTemplateProps {
  content: any;
  onUpdate: (newContent: any) => void;
  isEditing?: boolean;
}

export const LandingTemplate: React.FC<LandingTemplateProps> = ({ content, onUpdate, isEditing = false }) => {
  const updateHero = (key: string, value: string) => {
    onUpdate({ ...content, hero: { ...content.hero, [key]: value } });
  };

  const updateBrand = (value: string) => {
    onUpdate({ ...content, brand_name: value });
  };

  return (
    <div className="bg-white min-h-screen font-sans text-slate-900 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] aspect-square bg-gradient-to-b from-blue-50/50 to-transparent rounded-full -z-10 blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Calendar size={14} /> 專業預約系統
          </div>
          
          <h1 className="text-5xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
            <EditableText 
              value={content.hero?.title || '專業預約管理'} 
              onChange={(v) => updateHero('title', v)} 
              isEditing={isEditing}
              className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600"
            />
          </h1>
          
          <p className="text-lg lg:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            <EditableText 
              value={content.hero?.subtitle || '為您的客戶提供最流暢的預約體驗'} 
              onChange={(v) => updateHero('subtitle', v)} 
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

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
            {/* 裝飾背景 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                <h2 className="text-3xl lg:text-5xl font-black text-white mb-8 tracking-tight">準備好開始您的專業服務了嗎？</h2>
                <p className="text-slate-400 text-lg mb-12 font-medium">現在就加入我們的會員，享受最便利的預約排程管理。</p>
                <Link to="/customer-auth" className="inline-block bg-white text-slate-900 px-12 py-5 rounded-2xl text-lg font-black hover:bg-blue-50 transition-all">
                    註冊 / 登入帳號
                </Link>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-2xl font-black tracking-tighter text-slate-900 mb-4">
            <EditableText 
              value={content.brand_name || '智慧預約'} 
              onChange={updateBrand} 
              isEditing={isEditing}
            />
          </div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-8">© 2026 {content.brand_name || '智慧預約'} Booking System</p>
          <div className="flex justify-center gap-6 text-slate-400">
            <a href="#" className="hover:text-blue-600 transition-colors"><Instagram size={24} /></a>
            <a href="#" className="hover:text-blue-600 transition-colors"><Facebook size={24} /></a>
            <a href="#" className="hover:text-blue-600 transition-colors"><Mail size={24} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};