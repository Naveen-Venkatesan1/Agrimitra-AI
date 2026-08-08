import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  statusText?: string;
  statusColor?: string;
  icon: LucideIcon;
  iconColor?: string;
  chartPath?: string;
  chartColor?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  statusText,
  statusColor = 'text-emerald-500',
  icon: Icon,
  iconColor = 'text-emerald-500',
  chartPath,
  chartColor = '#10B981',
  onClick,
  className = '',
  children,
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[120px] ${onClick ? 'cursor-pointer hover:border-emerald-200 transition relative' : ''} ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0 pr-1">
          <span className="text-[12px] font-bold text-gray-900 truncate block">{title}</span>
          <div className={`text-[28px] font-extrabold leading-none mt-1.5 truncate ${typeof value === 'string' && value === 'Low' ? statusColor : 'text-gray-900'}`}>{value}</div>
          {statusText && (
            <span className={`text-[11px] font-bold mt-1.5 block leading-tight truncate ${statusColor}`}>
              {statusText}
            </span>
          )}
        </div>
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${iconColor}`} strokeWidth={2.5} />
      </div>
      {chartPath && (
        <svg className="w-full h-5 mt-1" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d={chartPath} fill="none" stroke={chartColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </div>
  );
};
