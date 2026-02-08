import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, LogOut, LayoutDashboard, Menu, X, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCustomer } from '../hooks/useCustomer';
import { supabase } from '../lib/supabase';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { customer, logout: customerLogout } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [brandName, setBrandName] = useState('智慧預約');

  useEffect(() => {
    // 讀取 CMS 品牌名稱
    supabase.from('page_content').select('content').eq('section_key', 'landing_page').single()
      .then(({ data }) => {
        if (data?.content?.brand_name) setBrandName(data.content.brand_name);
      });
  }, [location.pathname]);

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Calendar size={20} strokeWidth={3} />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-800">{brandName}</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            {!isAdminPath && (
              <>
                <Link to="/booking" className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">立即預約</Link>
                <Link to="/my-appointments" className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">預約紀錄</Link>
              </>
            )}
            
            <div className="h-6 w-px bg-slate-100 mx-2"></div>

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/admin" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                  <LayoutDashboard size={18} /> 管理後台
                </Link>
              </div>
            ) : customer ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex flex-col items-end hover:opacity-80 transition-opacity">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">會員中心</span>
                    <span className="text-sm font-bold text-slate-700">{customer.full_name}</span>
                </Link>
                <button onClick={() => { customerLogout(); navigate('/'); }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/customer-auth" className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                登入 / 註冊
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500"><Menu /></button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 p-4 space-y-2 animate-in slide-in-from-top-2">
          <Link to="/booking" className="block p-4 text-sm font-bold text-slate-600" onClick={() => setIsOpen(false)}>立即預約</Link>
          <Link to="/my-appointments" className="block p-4 text-sm font-bold text-slate-600" onClick={() => setIsOpen(false)}>預約紀錄</Link>
          <div className="pt-2 border-t border-slate-50">
            {customer ? (
                <>
                <Link to="/profile" className="block p-4 text-sm font-bold text-slate-600" onClick={() => setIsOpen(false)}>會員中心</Link>
                <button onClick={() => { customerLogout(); setIsOpen(false); }} className="w-full text-left p-4 text-sm font-bold text-red-500">登出帳號</button>
                </>
            ) : (
                <Link to="/customer-auth" className="block p-4 text-sm font-bold text-blue-600" onClick={() => setIsOpen(false)}>登入 / 註冊</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
