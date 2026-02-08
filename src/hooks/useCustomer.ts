import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CustomerUser {
  id: string;
  email: string;
  full_name: string;
  custom_data?: any;
}

interface CustomerContextValue {
  customer: CustomerUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<CustomerUser>;
  register: (email: string, pass: string, name: string, customData?: Record<string, any>) => Promise<CustomerUser>;
  logout: () => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const { data, error } = await supabase.rpc('login_customer', {
      p_email: email,
      p_password: pass
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    const user = data.data;
    setCustomer(user);
    localStorage.setItem('customer_session', JSON.stringify(user));
    return user;
  };

  const register = async (email: string, pass: string, name: string, customData?: Record<string, any>) => {
    const { data, error } = await supabase.rpc('register_customer', {
      p_email: email,
      p_password: pass,
      p_full_name: name,
      p_custom_data: customData || {}
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    const user = data.data;
    setCustomer(user);
    localStorage.setItem('customer_session', JSON.stringify(user));
    return user;
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer_session');
  };

  return React.createElement(
    CustomerContext.Provider,
    { value: { customer, loading, login, register, logout } },
    children
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider');
  return ctx;
}
