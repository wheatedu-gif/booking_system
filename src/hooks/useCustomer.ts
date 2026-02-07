import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CustomerUser {
  id: string;
  email: string;
  full_name: string;
  custom_data?: any;
}

export function useCustomer() {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化時從 LocalStorage 讀取
    const stored = localStorage.getItem('customer_session');
    if (stored) {
      try {
        setCustomer(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('customer_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // 呼叫後端 RPC
    const { data, error } = await supabase.rpc('login_customer', {
      p_email: email,
      p_password: pass
    });

    if (error) throw error;
    
    // RPC 回傳格式: { success: boolean, message?: string, data?: CustomerUser }
    if (!data.success) {
      throw new Error(data.message);
    }

    const user = data.data;
    setCustomer(user);
    localStorage.setItem('customer_session', JSON.stringify(user));
    return user;
  };

  const register = async (email: string, pass: string, name: string, phone?: string) => {
    const { data, error } = await supabase.rpc('register_customer', {
      p_email: email,
      p_password: pass,
      p_full_name: name,
      p_custom_data: { phone } // 將電話存入 custom_data
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.message);

    // 註冊成功後自動登入
    const user = data.data;
    setCustomer(user);
    localStorage.setItem('customer_session', JSON.stringify(user));
    return user;
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer_session');
  };

  return { customer, loading, login, register, logout };
}
