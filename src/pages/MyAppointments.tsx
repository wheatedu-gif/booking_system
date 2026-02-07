import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { Appointment } from '../types';
import { Calendar, Clock, AlertCircle, ExternalLink, History, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';

export const MyAppointments: React.FC = () => {
  const { customer, loading: authLoading } = useCustomer();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !customer) navigate('/login');
    if (customer) {
      supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('booking_date', { ascending: false })
        .then(({ data }) => {
          setAppointments(data || []);
          setLoading(false);
        });
    }
  }, [customer, authLoading, navigate]);

  if (authLoading || loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-400 border-red-100 opacity-60';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <History className="text-blue-600" size={36} /> 我的預約紀錄
            </h1>
            <p className="text-slate-400 mt-2 font-medium">查看您過去與即將到來的服務預約</p>
        </div>
        <Link to="/booking" className="btn-primary px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center gap-2">
            立即新增預約 <ArrowRight size={18} />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-slate-200" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-400 italic text-center">尚無任何預約紀錄</h3>
          <p className="text-slate-300 mt-2">現在就預約您的第一個服務吧！</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {appointments.map((apt) => (
            <Link key={apt.id} to={`/appointment/${apt.id}`} className="group block">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 transition-all duration-500 relative">
                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(apt.booking_date), 'MMM')}</span>
                        <span className="text-xl font-black leading-none">{format(new Date(apt.booking_date), 'dd')}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl font-black text-slate-800 tracking-tight">{apt.booking_date}</span>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(apt.status)}`}>
                                {getStatusIcon(apt.status)}
                                {apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-400"/> {apt.booking_time.slice(0,5)}</span>
                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-400"/> {format(new Date(apt.booking_date), 'EEEE')}</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {apt.status === 'confirmed' && (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('服務預約')}&dates=${apt.booking_date.replace(/-/g, '')}T${apt.booking_time.replace(/:/g, '')}00&sf=true&output=xml`);
                            }}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                            title="加入 Google 行事曆"
                        >
                            <ExternalLink size={20} />
                        </button>
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ArrowRight size={24} />
                    </div>
                  </div>
                </div>
                
                {apt.cancellation_reason && (
                    <div className="px-8 pb-6 -mt-2">
                        <div className="p-4 bg-red-50 rounded-2xl text-xs text-red-500 font-bold border border-red-100 flex items-center gap-2">
                            <XCircle size={14}/> 取消原因：{apt.cancellation_reason}
                        </div>
                    </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
