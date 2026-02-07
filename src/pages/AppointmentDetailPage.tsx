import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, MapPin, Phone, User, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      supabase
        .from('appointments')
        .select('*, customers(full_name, email, phone)')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          setApt(data);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!apt) return <div className="p-20 text-center">找不到預約紀錄</div>;

  const customer = (apt as any).customers;

  const getStatusDisplay = () => {
    switch (apt.status) {
      case 'confirmed': return { icon: <CheckCircle className="text-green-500" />, text: '已確認', color: 'bg-green-50 border-green-100 text-green-700' };
      case 'cancelled': return { icon: <XCircle className="text-red-500" />, text: '已取消', color: 'bg-red-50 border-red-100 text-red-700' };
      default: return { icon: <AlertCircle className="text-amber-500" />, text: '處理中', color: 'bg-amber-50 border-amber-100 text-amber-700' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Link to="/my-appointments" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-8 transition-colors font-bold">
        <ArrowLeft size={20} /> 返回紀錄清單
      </Link>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        {/* 頂部狀態 */}
        <div className={`p-10 ${statusInfo.color} flex justify-between items-center`}>
            <div>
                <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">預約當前狀態</div>
                <div className="text-4xl font-black flex items-center gap-3">
                    {statusInfo.icon} {statusInfo.text}
                </div>
            </div>
            <div className="text-right hidden sm:block">
                <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-slate-400">預約編號</div>
                <div className="text-sm font-mono font-bold opacity-40">{apt.id.slice(0,8)}...</div>
            </div>
        </div>

        <div className="p-10 space-y-10">
            {/* 時間資訊 */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Calendar /></div>
                    <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約日期</div><div className="text-xl font-black text-slate-800">{apt.booking_date}</div></div>
                </div>
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Clock /></div>
                    <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約時段</div><div className="text-xl font-black text-slate-800">{apt.booking_time.slice(0,5)}</div></div>
                </div>
            </section>

            {/* 客戶與動態內容 */}
            <section className="space-y-6">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><User size={16}/> 預約人資料</h3>
                    <div className="grid gap-4">
                        <div className="flex justify-between border-b border-white pb-3"><span className="text-slate-500 font-bold">姓名</span><span className="text-slate-800 font-black">{customer?.full_name}</span></div>
                        <div className="flex justify-between border-b border-white pb-3"><span className="text-slate-500 font-bold">Email</span><span className="text-slate-800 font-black">{customer?.email}</span></div>
                        
                        {/* 動態欄位 */}
                        {Object.entries(apt.booking_data || {}).map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-white pb-3"><span className="text-slate-500 font-bold">{k}</span><span className="text-slate-800 font-black">{String(v)}</span></div>
                        ))}
                    </div>
                </div>

                {apt.cancellation_reason && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-600">
                        <div className="text-xs font-black uppercase tracking-widest mb-1">取消原因</div>
                        <p className="font-bold">「{apt.cancellation_reason}」</p>
                    </div>
                )}
            </section>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {apt.status === 'confirmed' && (
                    <a 
                        href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('服務預約')}&dates=${apt.booking_date.replace(/-/g, '')}T${apt.booking_time.replace(/:/g, '')}00&sf=true&output=xml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={20}/> 加入我的行事曆
                    </a>
                )}
                <button 
                    onClick={() => window.print()}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-black transition-all"
                >
                    列印預約憑證
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
