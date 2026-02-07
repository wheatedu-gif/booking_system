import React, { useState, useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onSave: (val: string) => void;
  isEditing: boolean;
  multiline?: boolean;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}

export const EditableText: React.FC<EditableTextProps> = ({ 
  value, 
  onSave, 
  isEditing, 
  multiline = false, 
  className = '',
  as: Component = 'span' 
}) => {
  const [editingMode, setEditingMode] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (editingMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingMode]);

  const handleBlur = () => {
    setEditingMode(false);
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTempValue(value);
      setEditingMode(false);
    }
  };

  // 如果包含 HTML 標籤 (例如 <span class="...">)，我們需要特殊處理
  // 這裡為了簡化，我們假設編輯器只處理純文字，但支援顯示 HTML (危險操作，需小心 XSS)
  // 若要更安全，應移除 HTML 支援，改用純文字。這裡我們先做純文字編輯。

  if (isEditing) {
    if (editingMode) {
        if (multiline) {
            return (
                <textarea
                    ref={inputRef as any}
                    className={`w-full bg-white border-2 border-blue-500 rounded p-2 outline-none ${className}`}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    rows={4}
                />
            );
        }
        return (
            <input
                ref={inputRef as any}
                className={`w-full bg-white border-2 border-blue-500 rounded px-1 outline-none ${className}`}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
      <div 
        className={`relative group cursor-pointer border border-dashed border-transparent hover:border-blue-400 rounded px-1 -mx-1 transition-all ${className}`}
        onClick={() => setEditingMode(true)}
      >
        <Component dangerouslySetInnerHTML={{ __html: value }} />
        <div className="absolute -top-3 -right-3 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10">
            <Edit2 size={10} />
        </div>
      </div>
    );
  }

  // 非編輯模式 (一般訪客)
  return <Component className={className} dangerouslySetInnerHTML={{ __html: value }} />;
};
