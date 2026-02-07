import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { Appointment } from '../types';
import { Calendar, Clock, AlertCircle, ExternalLink, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MyAppointments: React.FC = () => {
  const { customer, loading: authLoading } = useCustomer();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !customer) {
      navigate('/login');
      return;
    }

    if (customer) {
      fetchAppointments();
    }
  }, [customer, authLoading, navigate]);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_id', customer?.id)
      .order('booking_date', { ascending: false });
    
    setAppointments(data || []);
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('確定要取消此預約嗎？')) return;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancellation_reason: '客戶自行取消' })
      .eq('id', id);

    if (error) {
      alert('取消失敗: ' + error.message);
    } else {
      setAppointments(prev => prev.map(apt => 
        apt.id === id ? { ...apt, status: 'cancelled', cancellation_reason: '客戶自行取消' } : apt
      ));
    }
  };

  const getGoogleCalendarUrl = (apt: Appointment) => {
    const dateStr = apt.booking_date.replace(/-/g, '');
    const timeStr = apt.booking_time.replace(/:/g, '').slice(0, 4);
    const start = `${dateStr}T${timeStr}00`;
    
    const [h, m] = apt.booking_time.split(':').map(Number);
    const endH = (h + 1).toString().padStart(2, '0');
    const endM = m.toString().padStart(2, '0');
    const end = `${dateStr}T${endH}${endM}00`;
    
    const details = [`預約人: ${customer?.full_name}`];
    if (apt.booking_data) {
      Object.entries(apt.booking_data).forEach(([key, value]) => {
        details.push(`${key}: ${value}`);
      });
    }

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('預約服務')}&dates=${start}/${end}&details=${encodeURIComponent(details.join('\n'))}&sf=true&output=xml`;
  };

  if (authLoading || loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
        <Calendar className="text-blue-600" size={32} /> 我的預約紀錄
      </h1>

      {appointments.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <AlertCircle size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 text-lg">尚無任何預約紀錄</p>
          <button 
            onClick={() => navigate('/booking')}
            className="btn-primary mt-6 px-8 py-3 rounded-xl"
          >
            立即預約服務
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* 左側：基本資訊 */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">{apt.booking_date}</div>
                        <div className="text-slate-500 flex items-center gap-2 mt-1">
                          <Clock size={18} /> {apt.booking_time.slice(0, 5)}
                        </div>
                      </div>
                    </div>

                    {/* 詳細資料區塊 */}
                    {apt.booking_data && Object.keys(apt.booking_data).length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-4 mt-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Info size={14} /> 預約詳細資訊
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                          {Object.entries(apt.booking_data).map(([key, value]) => (
                            <div key={key} className="flex justify-between border-b border-slate-100 py-1">
                              <span className="text-slate-500 text-sm">{key}</span>
                              <span className="text-slate-800 text-sm font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {apt.cancellation_reason && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0" />
                        <div>
                          <div className="font-bold text-sm text-red-700">預約已取消</div>
                          <div className="text-sm">原因：{apt.cancellation_reason}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 右側：狀態與操作 */}
                  <div className="flex flex-col justify-between items-end gap-4 min-w-[160px]">
                    <div className="text-right">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-2">
                        ID: {apt.id.slice(0, 8)}...
                      </div>
                    </div>

                    <div className="flex flex-col w-full gap-2">
                      {apt.status !== 'cancelled' && (
                        <>
                          <a
                            href={getGoogleCalendarUrl(apt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                          >
                            <ExternalLink size={16} /> Google 行事曆
                          </a>
                          <button
                            onClick={() => handleCancel(apt.id)}
                            className="flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-sm font-bold transition-all"
                          >
                            <Trash2 size={16} /> 取消預約
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};