import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { Appointment } from '../types';
import { Calendar, Clock, AlertCircle, ExternalLink, History, ArrowRight, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format, parseISO, differenceInHours } from 'date-fns';
import { useToast } from '../components/Toast';

export const MyAppointments: React.FC = () => {
  const { customer, loading: authLoading } = useCustomer();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rules, setRules] = useState({ allow_customer_cancel: true, cancel_before_hours: 24 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !customer) navigate('/login');
    if (customer) {
      const fetchAll = async () => {
          const { data: apts } = await supabase.from('appointments').select('*').eq('customer_id', customer.id).order('booking_date', { ascending: false });
          const { data: rulesData } = await supabase.from('system_settings').select('value').eq('key', 'booking_rules').maybeSingle();
          setAppointments(apts || []);
          if (rulesData?.value) setRules(rulesData.value);
          setLoading(false);
      };
      fetchAll();
    }
  }, [customer, authLoading, navigate]);

  const handleCancel = async (apt: Appointment) => {
      const aptTime = parseISO(`${apt.booking_date}T${apt.booking_time}`);
      const hoursDiff = differenceInHours(aptTime, new Date());

      if (hoursDiff < rules.cancel_before_hours) {
          showToast(`無法取消：需在預約前 ${rules.cancel_before_hours} 小時操作`, 'error');
          return;
      }

      if (!window.confirm('確定要取消此項預約嗎？')) return;

      const { error } = await supabase.from('appointments').update({ status: 'cancelled', cancellation_reason: '客戶自主取消' }).eq('id', apt.id);
      if (error) showToast('取消失敗', 'error');
      else {
          showToast('預約已成功取消');
          setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'cancelled', cancellation_reason: '客戶自主取消' } : a));
      }
  };

  if (authLoading || loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'cancelled': return 'bg-red-50 text-red-400 border-red-100 opacity-60';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div><h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3"><History className="text-blue-600" size={36} /> 我的預約紀錄</h1><p className="text-slate-400 mt-2 font-medium">查看您過去與即將到來的服務預約</p></div>
        <Link to="/booking" className="btn-primary px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center gap-2">立即預約 <ArrowRight size={18} /></Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-100 shadow-xl shadow-slate-200/50"><div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Calendar className="text-slate-200" size={40} /></div><h3 className="text-xl font-bold text-slate-400 italic">尚無預約紀錄</h3></div>
      ) : (
        <div className="grid gap-6">
          {appointments.map((apt) => (
            <div key={apt.id} className="group block relative">
              <Link to={`/appointment/${apt.id}`} className="block">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 transition-all duration-500">
                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest">{format(parseISO(apt.booking_date), 'MMM')}</span>
                            <span className="text-xl font-black leading-none">{format(parseISO(apt.booking_date), 'dd')}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl font-black text-slate-800">{apt.booking_date}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(apt.status)}`}>{apt.status}</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 font-bold text-sm"><span className="flex items-center gap-1.5"><Clock size={14}/> {apt.booking_time.slice(0,5)}</span></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowRight size={24} /></div>
                    </div>
                    </div>
                </div>
              </Link>
              
              {/* 取消按鈕 */}
              {(apt.status === 'pending' || apt.status === 'confirmed') && rules.allow_customer_cancel && (
                  <button 
                    onClick={() => handleCancel(apt)}
                    className="absolute top-8 right-24 p-3 text-slate-300 hover:text-red-500 transition-colors"
                    title="取消預約"
                  >
                    <Trash2 size={20} />
                  </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};