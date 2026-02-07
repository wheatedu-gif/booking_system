import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomer } from '../hooks/useCustomer';
import { Appointment } from '../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
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
      // 查詢該客戶的預約
      supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customer.id) // 使用 customers 表的 UUID
        .order('booking_date', { ascending: false })
        .then(({ data }) => {
          setAppointments(data || []);
          setLoading(false);
        });
    }
  }, [customer, authLoading, navigate]);

    const handleCancel = async (id: string) => {

      if (!window.confirm('確定要取消此預約嗎？')) return;

      

      const { error } = await supabase

        .from('appointments')

        .update({ status: 'cancelled', cancellation_reason: '客戶自行取消' })

        .eq('id', id);

  

      if (error) {

        alert('取消失敗: ' + error.message);

      } else {

        // 更新本地狀態

        setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: 'cancelled', cancellation_reason: '客戶自行取消' } : apt));

      }

    };

  

    if (authLoading || loading) return <div className="p-8 text-center">載入中...</div>;

  

    return (

      <div className="max-w-4xl mx-auto py-12 px-4">

        <h1 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-2">

          <Calendar className="text-green-600" /> 我的預約紀錄

        </h1>

  

        {appointments.length === 0 ? (

          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">

            <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />

            <p className="text-slate-500">尚無任何預約紀錄</p>

            <a href="/booking" className="text-green-600 font-medium hover:underline mt-2 inline-block">立即預約服務</a>

          </div>

        ) : (

          <div className="space-y-4">

            {appointments.map((apt) => (

              <div key={apt.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">

                <div className="flex items-center gap-4 flex-1">

                  <div className="bg-green-50 p-3 rounded-lg text-green-600">

                    <Calendar size={24} />

                  </div>

                  <div>

                    <div className="font-bold text-slate-800 text-lg">{apt.booking_date}</div>

                    <div className="text-slate-500 flex items-center gap-1 text-sm">

                      <Clock size={16} /> {apt.booking_time}

                    </div>

                    {(apt as any).cancellation_reason && (

                      <div className="mt-2 text-sm text-red-500 bg-red-50 px-3 py-1 rounded-md border border-red-100 inline-block">

                        取消原因: {(apt as any).cancellation_reason}

                      </div>

                    )}

                  </div>

                </div>

  

                <div className="flex items-center gap-4">

                  <div className="text-right mr-4">

                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${

                      apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :

                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'

                    }`}>

                      {apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '待處理'}

                    </span>

                  </div>

                  

                  {apt.status !== 'cancelled' && (

                    <button

                      onClick={() => handleCancel(apt.id)}

                      className="text-slate-400 hover:text-red-500 text-sm font-medium transition-colors border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg"

                    >

                      取消預約

                    </button>

                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    );

  };

  