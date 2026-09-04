import React from 'react';
import Card from './Card';
import Badge from './Badge';

export const StatCard = ({
  title,
  value,
  statusText,
  statusVariant = 'good',
  icon: Icon,
  iconBg = 'bg-emerald-100 text-emerald-700',
  trendData = [40, 45, 42, 50, 58, 65, 78],
  trendColor = '#7CB342',
  subtitle,
  onClick
}) => {
  // Generate SVG polyline points for sparkline
  const min = Math.min(...trendData);
  const max = Math.max(...trendData);
  const range = max - min || 1;
  const points = trendData.map((val, idx) => {
    const x = (idx / (trendData.length - 1)) * 100;
    const y = 35 - ((val - min) / range) * 25;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card onClick={onClick} className="flex flex-col justify-between h-full relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-agri-text mt-1">{value}</div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg} shadow-sm flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          {statusText && (
            <Badge variant={statusVariant} size="xs">
              {statusText}
            </Badge>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Mini Sparkline */}
        {trendData && trendData.length > 0 && (
          <div className="w-20 h-9">
            <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke={trendColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
