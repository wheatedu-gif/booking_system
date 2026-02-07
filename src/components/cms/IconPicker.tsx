import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// 定義可供選擇的圖示清單
export const AVAILABLE_ICONS = {
  calendar: LucideIcons.Calendar,
  shield: LucideIcons.ShieldCheck,
  bell: LucideIcons.Bell,
  clock: LucideIcons.Clock,
  user: LucideIcons.User,
  mail: LucideIcons.Mail,
  star: LucideIcons.Star,
  heart: LucideIcons.Heart,
  info: LucideIcons.Info,
  lock: LucideIcons.Lock,
  check: LucideIcons.CheckCircle,
  message: LucideIcons.MessageSquare,
  phone: LucideIcons.Phone,
  smile: LucideIcons.Smile,
  zap: LucideIcons.Zap,
  tool: LucideIcons.Settings
};

export type IconName = keyof typeof AVAILABLE_ICONS;

export const DynamicIcon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 24, className = "" }) => {
  const Icon = AVAILABLE_ICONS[name as IconName] || LucideIcons.HelpCircle;
  return <Icon size={size} className={className} />;
};

interface IconPickerProps {
  currentIcon: string;
  onSelect: (name: IconName) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ currentIcon, onSelect }) => {
  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-white border border-slate-200 shadow-xl rounded-xl w-48">
      {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
        <button
          key={name}
          onClick={() => onSelect(name as IconName)}
          className={`p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors ${currentIcon === name ? 'bg-blue-100 text-blue-600' : 'text-slate-500'}`}
          title={name}
        >
          <Icon size={20} />
        </button>
      ))}
    </div>
  );
};
