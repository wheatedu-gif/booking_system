import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CustomerAuthPage } from './pages/CustomerAuthPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingPage } from './pages/BookingPage';
import { MyAppointments } from './pages/MyAppointments';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            {/* 客戶端路由 */}
            <Route path="/login" element={<CustomerAuthPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* 管理端路由 */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </main>
        <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
            &copy; 2026 智慧預約系統. All rights reserved.
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
