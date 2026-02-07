import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LandingTemplate, DEFAULT_CONTENT, LandingContent } from '../components/cms/LandingTemplate';

export const LandingPage: React.FC = () => {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('page_content')
      .select('content')
      .eq('section_key', 'landing_page')
      .single()
      .then(({ data }) => {
        if (data?.content) {
          setContent(data.content);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold tracking-widest animate-pulse">LOADING...</p>
        </div>
      </div>
    );
  }

  return <LandingTemplate content={content} isEditing={false} />;
};
