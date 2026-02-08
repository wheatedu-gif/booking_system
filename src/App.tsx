import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CustomerAuthPage } from './pages/CustomerAuthPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingPage } from './pages/BookingPage';
import { MyAppointments } from './pages/MyAppointments';
import { ProfilePage } from './pages/ProfilePage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

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
            <Route path="/customer-auth" element={<CustomerAuthPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/appointment/:id" element={<AppointmentDetailPage />} />
            
            {/* 管理端路由 */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
