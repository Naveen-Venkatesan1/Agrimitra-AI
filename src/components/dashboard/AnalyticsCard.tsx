import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface AnalyticsCardProps {
  title: string;
  subtitle: string;
  actionText: string;
  onClick: () => void;
  children?: React.ReactNode;
  imageSrc?: string;
  customImageStyles?: React.CSSProperties;
  customImageClass?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  actionText,
  onClick,
  children,
  imageSrc,
  customImageStyles,
  customImageClass
}) => {
  const { t } = useTranslation();

  return (
    <div 
      onClick={onClick} 
      className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition flex flex-row items-center h-[160px] p-5 relative overflow-hidden group"
    >
      {/* Left Column (60%) */}
      <div className="w-[60%] flex flex-col h-full justify-between pr-2 z-10">
        <div>
          <h4 className="text-[13px] sm:text-[14px] font-bold text-gray-900 leading-snug truncate">{title}</h4>
          <p className="text-[11px] text-gray-600 mt-1 leading-snug line-clamp-2">{subtitle}</p>
        </div>
        
        <span className="text-[11px] sm:text-[12px] font-bold text-[#0B4D2F] flex items-center gap-1 group-hover:gap-1.5 transition-all whitespace-nowrap mt-2">
          <span className="truncate">{t(actionText.toLowerCase().replace(/\s+/g, '_'), actionText)}</span> <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
        </span>
      </div>
      
      {/* Right Column (Absolute 45%) */}
      <div className="absolute inset-y-0 right-0 w-[45%] overflow-hidden flex items-center justify-end z-0 rounded-r-2xl">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={title} 
            className={`w-full h-full object-contain object-center group-hover:scale-[1.05] transition-transform duration-500 ${customImageClass || ''}`}
            style={customImageStyles}
          />
        ) : children ? (
          <div className="w-full h-full flex items-center justify-end mr-5">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
};
