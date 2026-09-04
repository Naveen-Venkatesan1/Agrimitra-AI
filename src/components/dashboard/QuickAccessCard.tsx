import React, { useState } from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface QuickAccessCardProps {
  title: string;
  subtitle: string;
  description?: string;
  actionText: string;
  actionColor: string;
  bgColor: string;
  borderColor: string;
  onClick: () => void;
  icon?: LucideIcon;
  iconColor?: string;
  imageSrc?: string;
}

export const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  title,
  subtitle,
  description,
  actionText,
  actionColor,
  bgColor,
  borderColor,
  onClick,
  icon: Icon,
  iconColor,
  imageSrc,
}) => {
  const { t } = useTranslation();

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-2xl p-5 border shadow-sm cursor-pointer hover:shadow-md transition flex flex-row items-center h-[160px] overflow-hidden group ${bgColor} ${borderColor}`}
    >
      {/* Left Column (60%) */}
      <div className="w-[60%] flex flex-col h-full justify-between pr-2 z-10">
        <div>
          <h4 className="text-[14px] sm:text-[15px] font-bold text-gray-900 leading-snug truncate">{title}</h4>
          <p className="text-[11px] sm:text-[12px] text-gray-600 mt-1.5 leading-snug line-clamp-2">{description || subtitle}</p>
        </div>
        
        <span className={`text-[12px] sm:text-[13px] font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all whitespace-nowrap mt-2 ${actionColor}`}>
          <span className="truncate">{t(actionText.toLowerCase().replace(/\s+/g, '_'), actionText)}</span> <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
        </span>
      </div>
      
      {/* Right Column (Absolute 45%) */}
      <div className="absolute inset-y-0 right-0 w-[45%] overflow-hidden flex items-center justify-end z-0 rounded-r-2xl">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={title} 
            className="w-full h-full object-contain object-center group-hover:scale-[1.05] transition-transform duration-500" 
          />
        ) : Icon ? (
          <Icon 
            className={`w-16 h-16 mr-5 ${iconColor}`} 
            strokeWidth={1.5} 
          />
        ) : null}
      </div>
    </div>
  );
};
