import React, { useEffect } from 'react';

interface SurveyLayoutProps {
  title: string;
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement>;
}

const SurveyLayout: React.FC<SurveyLayoutProps> = ({
  title,
  children,
  contentRef,
}) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4 pb-32 text-slate-900">
        {children}
      </div>
    </div>
  );
};

export default SurveyLayout;
