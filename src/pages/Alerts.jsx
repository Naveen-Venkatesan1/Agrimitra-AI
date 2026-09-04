import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, LayoutGrid, Sprout, CloudRain, 
  Droplets, Landmark, Check, Bell, AlertTriangle 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

export const Alerts = () => {
  const navigate = useNavigate();
  const { alerts, markAlertRead, clearAllAlerts } = useAppStore();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts
    .filter(a => 
      !a.title.toLowerCase().includes('pest') && 
      !a.title.toLowerCase().includes('borer') && 
      !a.title.toLowerCase().includes('outbreak') && 
      a.category !== 'pest' && 
      a.category !== 'pest-lifecycle'
    )
    .filter(a => {
      if (filter === 'all') return true;
      if (filter === 'disease') return a.category === 'disease' || a.type?.toLowerCase().includes('disease');
      if (filter === 'weather') return a.category === 'weather' || a.type?.toLowerCase().includes('weather');
      if (filter === 'irrigation') return a.category === 'irrigation' || a.type?.toLowerCase().includes('irrigation');
      return a.category === filter;
    });

  // Filter Tabs definition matching reference image
  const filterTabs = [
    {
      id: 'all',
      title: t('filter_all', 'All'),
      subtitle: t('alerts_notifications', 'Alerts'),
      icon: LayoutGrid,
      iconColor: 'text-gray-700'
    },
    {
      id: 'disease',
      title: t('nav_crop_intelligence', 'Disease'),
      subtitle: t('detection_alerts', 'Detection Alerts'),
      icon: Sprout,
      iconColor: 'text-rose-500'
    },
    {
      id: 'weather',
      title: t('nav_weather', 'Weather'),
      subtitle: t('alerts_notifications', 'Alerts'),
      icon: CloudRain,
      iconColor: 'text-blue-500'
    },
    {
      id: 'irrigation',
      title: t('nav_irrigation', 'Irrigation'),
      subtitle: null,
      icon: Droplets,
      iconColor: 'text-cyan-600'
    }
  ];

  // Visual category config matching reference design
  const getCategoryConfig = (item) => {
    const cat = (item.category || '').toLowerCase();
    const typ = (item.type || '').toLowerCase();

    if (cat === 'weather' || typ.includes('weather')) {
      return {
        icon: CloudRain,
        iconBg: 'bg-[#FFF9EC]',
        iconColor: 'text-[#D97706]',
        badgeBg: 'bg-[#FEF3C7] text-[#B45309]',
        badgeText: item.type || 'Weather Alert'
      };
    }

    if (cat === 'disease' || typ.includes('disease')) {
      return {
        icon: Sprout,
        iconBg: 'bg-[#FEF2F2]',
        iconColor: 'text-[#DC2626]',
        badgeBg: 'bg-[#FEE2E2] text-[#DC2626]',
        badgeText: item.type || 'Disease Alert'
      };
    }

    if (cat === 'irrigation' || typ.includes('irrigation')) {
      return {
        icon: Droplets,
        iconBg: 'bg-[#EFF6FF]',
        iconColor: 'text-[#2563EB]',
        badgeBg: 'bg-[#E0F2FE] text-[#0284C7]',
        badgeText: item.type || 'Irrigation Reminder'
      };
    }

    if (cat === 'fire' || typ.includes('fire') || typ.includes('temperature')) {
      return {
        icon: AlertTriangle,
        iconBg: 'bg-[#FEF2F2]',
        iconColor: 'text-[#DC2626]',
        badgeBg: 'bg-[#FEE2E2] text-[#DC2626]',
        badgeText: item.type || 'Fire Alert'
      };
    }

    if (cat === 'object' || typ.includes('object')) {
      return {
        icon: AlertTriangle,
        iconBg: 'bg-[#FFF9EC]',
        iconColor: 'text-[#D97706]',
        badgeBg: 'bg-[#FEF3C7] text-[#B45309]',
        badgeText: item.type || 'Object Detection'
      };
    }

    // Default / Government Scheme / General
    return {
      icon: Landmark,
      iconBg: 'bg-[#F5F3FF]',
      iconColor: 'text-[#7C3AED]',
      badgeBg: 'bg-[#EDE9FE] text-[#7C3AED]',
      badgeText: item.type || 'Government Scheme'
    };
  };

  return (
    <div className="w-full max-w-[440px] mx-auto px-4 py-2 select-none pb-28 font-sans space-y-5 animate-fade-in">
      
      {/* 1. BACK BUTTON */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-center text-gray-700 hover:text-gray-900 active:scale-95 transition cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 stroke-[2.2]" />
        </button>
      </div>

      {/* 2. HEADER SECTION (REAL-TIME FEED, TITLE & CLEAR ALL) */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-black text-[#16A34A] tracking-wider uppercase block">
              {t('realtime_feed', 'REAL-TIME FEED')}
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-black text-[#0B3B24] tracking-tight leading-[1.15] mt-1 whitespace-pre-line">
              {t('alerts_notifications', 'Alerts &\nNotifications')}
            </h1>
          </div>

          <button
            onClick={clearAllAlerts}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:bg-gray-50 active:scale-95 transition text-xs font-black text-gray-800 shrink-0 mt-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-600" />
            <span>{t('clear_all', 'Clear All')}</span>
          </button>
        </div>

        <p className="text-xs sm:text-[13px] font-medium text-gray-500 leading-relaxed max-w-sm">
          {t('alerts_subtitle', 'Stay updated with critical farm activities, weather warnings, and IoT alerts')}
        </p>
      </div>

      {/* 3. CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-black transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#0B4D2F] text-white border-[#0B4D2F] shadow-xs'
                  : 'bg-white border-gray-200/90 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <TabIcon 
                className={`w-4.5 h-4.5 shrink-0 ${
                  isActive ? 'text-white' : tab.iconColor
                }`} 
                strokeWidth={2.3}
              />
              <div className="text-left leading-tight">
                <div>{tab.title}</div>
                {tab.subtitle && (
                  <div className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {tab.subtitle}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. NOTIFICATION CARDS LIST */}
      <div className="space-y-3.5 pt-1">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-[24px] p-10 text-center py-16 border border-gray-150 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <Bell className="w-7 h-7 stroke-[2]" />
            </div>
            <h4 className="text-base font-black text-gray-800">
              {t('no_alerts', 'No alerts found')}
            </h4>
            <p className="text-xs font-medium text-gray-400 max-w-xs mx-auto">
              {t('no_alerts_desc', 'Your farm parameters are running smoothly.')}
            </p>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const config = getCategoryConfig(item);
            const CategoryIcon = config.icon;

            return (
              <div
                key={item.id}
                onClick={() => markAlertRead(item.id)}
                className="bg-white rounded-[22px] p-4 border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition flex items-center justify-between gap-3.5 cursor-pointer active:scale-[0.99]"
              >
                {/* Left Category Icon Box */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${config.iconBg} ${config.iconColor}`}>
                  <CategoryIcon className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Middle Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h4 className="text-[14px] sm:text-[14.5px] font-black text-gray-900 leading-snug tracking-tight truncate">
                      {item.titleKey ? t(item.titleKey, item.title) : item.title}
                    </h4>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}
                  </div>

                  {item.message && (
                    <p className="text-xs text-gray-500 mb-1.5 line-clamp-2 leading-relaxed font-medium">
                      {item.messageKey ? t(item.messageKey, item.message) : item.message}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full inline-block ${config.badgeBg}`}>
                      {config.badgeText}
                    </span>
                    <span className="text-[12px] font-bold text-gray-400">
                      {item.time}
                    </span>
                  </div>
                </div>

                {/* Right Status Checkmark */}
                <div className="shrink-0 pl-1">
                  <Check className="w-4.5 h-4.5 text-gray-400 stroke-[2.5]" />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default Alerts;
