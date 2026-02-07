import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'customer')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { profile, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果根本沒登入 Supabase Auth
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 如果登入了但沒有 Profile 或角色不符
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role as any))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
