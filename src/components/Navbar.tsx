import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCustomer } from '../hooks/useCustomer';
import { Calendar, User, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { profile, signOut } = useAuth(); // 管理員 Hook
  const { customer, logout: customerLogout } = useCustomer(); // 一般會員 Hook
  const navigate = useNavigate();
  const [brandName, setBrandName] = React.useState('智慧預約');

  React.useEffect(() => {
    supabase
      .from('page_content')
      .select('content')
      .eq('section_key', 'landing_page')
      .single()
      .then(({ data }) => {
        if (data?.content?.brand_name) {
          setBrandName(data.content.brand_name);
        }
      });
  }, []);

  const handleAdminSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleCustomerLogout = () => {
    customerLogout();
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
              <Calendar size={28} />
              <span>{brandName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {/* 管理員選單 */}
            {profile?.role === 'admin' ? (
              <>
                <Link to="/admin" className="text-slate-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                  <LayoutDashboard size={18} />
                  <span>管理後台</span>
                </Link>
                <button
                  onClick={handleAdminSignOut}
                  className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium"
                >
                  <LogOut size={18} />
                  <span>管理員登出</span>
                </button>
              </>
            ) : customer ? (
              /* 一般會員選單 */
              <>
                <Link to="/booking" className="text-slate-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                  <Calendar size={18} />
                  <span>我要預約</span>
                </Link>
                <Link to="/my-appointments" className="text-slate-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                  <UserCircle size={18} />
                  <span>我的預約</span>
                </Link>
                <button
                  onClick={handleCustomerLogout}
                  className="text-slate-600 hover:text-red-600 flex items-center gap-1 text-sm font-medium"
                >
                  <LogOut size={18} />
                  <span>登出</span>
                </button>
              </>
            ) : (
              /* 未登入狀態 */
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-slate-600 hover:text-blue-600 text-sm font-medium">
                  會員登入
                </Link>
                <Link to="/booking" className="btn-primary text-sm px-4 py-2">
                  立即預約
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
