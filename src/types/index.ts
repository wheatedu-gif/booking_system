export type UserRole = 'admin' | 'customer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  custom_data: Record<string, any>;
  created_at: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'tel';
  required: boolean;
  options?: string[]; // 用於 select 類型
}

export interface FormDefinition {
  id: string;
  type: 'customer_profile' | 'booking_form';
  fields: FormField[];
}

export interface Appointment {
  id: string;
  customer_id: string;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  booking_data: Record<string, any>;
  created_at: string;
  profiles?: Profile;
}

export interface SystemSettings {
  key: string;
  value: any;
}
