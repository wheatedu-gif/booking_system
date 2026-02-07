import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, User, LogOut, Menu, X, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCustomer } from '../hooks/useCustomer';

export const Navbar: React.FC = () => {
  const { user, signOut: adminSignOut } = useAuth();
  const { customer, logout: customerLogout } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [brandName, setBrandName] = useState('智慧預約');

  // 讀取 CMS 設定的品牌名稱
  useEffect(() => {
    supabase.from('page_content').select('content').eq('section_key', 'landing_page').single()
      .then(({ data }) => {
        if (data?.content?.brand_name) setBrandName(data.content.brand_name);
      });
  }, []);

  const isAdmin = !!user;
  const isCustomer = !!customer;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                <Calendar size={24} />
              </div>
              <span className="text-xl font-black text-slate-800 tracking-tighter">{brandName}</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {isAdmin ? (
              <>
                <Link to="/admin" className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/admin' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>管理總覽</Link>
                <button onClick={() => { adminSignOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"><LogOut size={18} /> 登出</button>
              </>
            ) : isCustomer ? (
              <>
                <Link to="/booking" className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/booking' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>立即預約</Link>
                <Link to="/my-appointments" className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/my-appointments' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>我的預約</Link>
                <Link to="/profile" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all ml-2" title="個人資料">
                  <User size={20} />
                </Link>
              </>
            ) : (
              <>
                <Link to="/booking" className="text-slate-500 hover:text-blue-600 font-bold text-sm px-4">預約服務</Link>
                <Link to="/login" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-100">會員登入</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500"><Menu size={28} /></button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 p-4 space-y-2 animate-in fade-in slide-in-from-top-4">
          {isAdmin ? (
            <>
              <Link to="/admin" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl bg-blue-50 text-blue-600 font-bold">管理後台</Link>
              <button onClick={() => { adminSignOut(); navigate('/'); setIsOpen(false); }} className="w-full text-left p-4 rounded-2xl text-red-500 font-bold">登出系統</button>
            </>
          ) : isCustomer ? (
            <>
              <Link to="/booking" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl hover:bg-slate-50 font-bold">立即預約</Link>
              <Link to="/my-appointments" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl hover:bg-slate-50 font-bold">我的預約</Link>
              <Link to="/profile" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl hover:bg-slate-50 font-bold text-blue-600">個人帳號設定</Link>
              <button onClick={() => { customerLogout(); navigate('/'); setIsOpen(false); }} className="w-full text-left p-4 rounded-2xl text-red-500 font-bold">登出</button>
            </>
          ) : (
            <>
              <Link to="/booking" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl hover:bg-slate-50 font-bold">預約服務</Link>
              <Link to="/login" onClick={() => setIsOpen(false)} className="block p-4 rounded-2xl bg-blue-600 text-white font-bold text-center">登入 / 註冊</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};