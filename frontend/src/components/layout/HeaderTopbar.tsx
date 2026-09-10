import React from 'react';

interface HeaderTopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const HeaderTopbar: React.FC<HeaderTopbarProps> = ({ title, actions }) => {
  return (
    <header className="h-16 bg-white border-b border-[#EBEBEF] px-8 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-[#1A1A1F]">{title}</h1>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
};
