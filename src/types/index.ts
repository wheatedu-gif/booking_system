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
  type: 'text' | 'number' | 'select' | 'date' | 'tel' | string;
  required: boolean;
  options?: string[];
  isSystem?: boolean;
}

export interface FormDefinition {
  id: string;
  type: 'customer_profile' | 'booking_form';
  fields: FormField[];
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  sort_order: number;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_item_id?: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_data: Record<string, any>;
  cancellation_reason?: string;
  admin_notes?: string;
  created_at: string;
  profiles?: Profile;
  service_items?: ServiceItem | null;
}

export interface SystemSettings {
  key: string;
  value: any;
}
