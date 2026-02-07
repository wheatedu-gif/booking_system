import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LandingTemplate, DEFAULT_CONTENT, LandingContent } from '../components/cms/LandingTemplate';

export const LandingPage: React.FC = () => {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT);

  useEffect(() => {
    // 從 Supabase 讀取內容
    supabase
      .from('page_content')
      .select('content')
      .eq('section_key', 'landing_page')
      .single()
      .then(({ data }) => {
        if (data?.content) {
          setContent(data.content);
        }
      });
  }, []);

  return <LandingTemplate content={content} isEditing={false} />;
};