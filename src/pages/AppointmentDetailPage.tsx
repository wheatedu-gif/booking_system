import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, ArrowLeft, ExternalLink, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState('智慧預約');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      // 同步讀取預約資料與品牌名稱
      const [aptRes, contentRes] = await Promise.all([
        supabase.from('appointments').select('*, customers(full_name, email, phone), service_items(*)').eq('id', id).single(),
        supabase.from('page_content').select('content').eq('section_key', 'landing_page').single()
      ]);

      if (aptRes.data) setApt(aptRes.data);
      if (contentRes.data?.content?.brand_name) setBrandName(contentRes.data.content.brand_name);
      setLoading(false);
    };
    
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!apt) return <div className="p-20 text-center font-bold text-slate-400 italic">找不到預約紀錄</div>;

  const customer = (apt as any).customers ?? (apt as any).customer;

  const getStatusDisplay = () => {
    switch (apt.status) {
      case 'confirmed': return { icon: <CheckCircle className="text-green-500" />, text: '預約已確認', color: 'bg-green-50 border-green-100 text-green-700' };
      case 'completed': return { icon: <CheckCircle className="text-blue-500" />, text: '服務已完成', color: 'bg-blue-50 border-blue-100 text-blue-700' };
      case 'cancelled': return { icon: <XCircle className="text-red-500" />, text: '預約已取消', color: 'bg-red-50 border-red-100 text-red-700' };
      default: return { icon: <AlertCircle className="text-amber-500" />, text: '預約待處理', color: 'bg-amber-50 border-amber-100 text-amber-700' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <Link to="/my-appointments" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold">
            <ArrowLeft size={20} /> 返回紀錄
        </Link>
        <div className="text-xs font-black text-slate-300 uppercase tracking-widest">{brandName} OFFICIAL</div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 print:shadow-none print:border-none">
        <div className={`p-10 ${statusInfo.color} flex justify-between items-center relative overflow-hidden`}>
            <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Current Status</div>
                <div className="text-3xl font-black flex items-center gap-3">{statusInfo.icon} {statusInfo.text}</div>
            </div>
            <div className="text-right z-10">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Appointment ID</div>
                <div className="text-xs font-mono opacity-30">#{apt.id.slice(0,8).toUpperCase()}</div>
            </div>
        </div>

        <div className="p-10 space-y-10">
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Calendar /></div>
                    <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約日期</div><div className="text-xl font-black text-slate-800">{apt.booking_date}</div></div>
                </div>
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Clock /></div>
                    <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預約時段</div><div className="text-xl font-black text-slate-800">{apt.booking_time.slice(0,5)}</div></div>
                </div>
                <div className="flex gap-4 sm:col-span-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><User size={20}/></div>
                    <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">服務項目</div><div className="text-xl font-black text-slate-800">{(apt as any).service_items?.name || '—'}</div></div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><User size={14}/> Customer Info</h3>
                    <div className="grid gap-4">
                        <div className="flex justify-between border-b border-white pb-3"><span className="text-slate-400 text-sm font-bold">姓名</span><span className="text-slate-800 font-black">{customer?.full_name}</span></div>
                        <div className="flex justify-between border-b border-white pb-3"><span className="text-slate-400 text-sm font-bold">Email</span><span className="text-slate-800 font-bold">{customer?.email}</span></div>
                        {Object.entries(apt.booking_data || {}).map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-white pb-3"><span className="text-slate-400 text-sm font-bold">{k}</span><span className="text-slate-800 font-bold">{String(v)}</span></div>
                        ))}
                    </div>
                </div>

                {apt.cancellation_reason && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-600 animate-pulse">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1">取消原因</div>
                        <p className="font-bold">「{apt.cancellation_reason}」</p>
                    </div>
                )}
            </section>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 print:hidden">
                {(apt.status === 'confirmed' || apt.status === 'pending') && (
                    <a 
                        href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(brandName + ' 預約')}&dates=${apt.booking_date.replace(/-/g, '')}T${apt.booking_time.replace(/:/g, '')}00&sf=true&output=xml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-primary py-5 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={20}/> 加入我的行事曆
                    </a>
                )}
                <button onClick={() => window.print()} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                    <Printer size={20}/> 列印預約憑證
                </button>
            </div>
        </div>
      </div>
      <div className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Powered by {brandName} Booking System
      </div>
    </div>
  );
};