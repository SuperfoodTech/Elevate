import React from 'react';

export const SuperFoodMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="superfood-bolt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M7 3H19L15 9.5H22L13 22L12.5 16L7.5 15L10 10.5L4.5 9.5L7 3Z"
        fill="url(#superfood-bolt-gradient)"
      />
    </svg>
  );
};

interface SuperFoodLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
  title?: string;
  subtitle?: string;
  stacked?: boolean;
}

export const SuperFoodLogo: React.FC<SuperFoodLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-[#0F172A]',
  subtextColor = 'text-[#64748B]',
  title = 'Dashboard',
  subtitle = 'Analytic',
  stacked = false
}) => {
  const markSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  }[size];

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl'
  }[size];

  if (stacked) {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <div className="p-2.5 rounded-xl bg-white border border-[#E4E4E7] shadow-xs flex items-center justify-center mb-3">
          <SuperFoodMark className={markSize} />
        </div>
        {showText && (
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-[#0F172A]">
            <span className={textSize}>{title}</span>
            <span className={`font-normal ${subtextColor} ${textSize}`}>{subtitle}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <SuperFoodMark className={`${markSize} shrink-0`} />
      {showText && (
        <div className="flex items-center gap-1 min-w-0 tracking-tight leading-none">
          <span className={`font-bold ${textColor} ${textSize}`}>{title}</span>
          <span className={`font-normal ${subtextColor} ${textSize}`}>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default SuperFoodLogo;
