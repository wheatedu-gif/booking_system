import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const Footer: React.FC = () => {
  const [brandName, setBrandName] = useState('智慧預約');

  useEffect(() => {
    supabase.from('page_content').select('content').eq('section_key', 'landing_page').single()
      .then(({ data }) => {
        if (data?.content?.brand_name) setBrandName(data.content.brand_name);
      });
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
        &copy; 2026 {brandName}. All rights reserved.
      </div>
    </footer>
  );
};
