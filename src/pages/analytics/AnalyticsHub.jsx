import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, DollarSign, MapPin, BarChart3 } from 'lucide-react';
import { SoilNutrientMapping } from './SoilNutrientMapping';
import { FinancialViability } from './FinancialViability';
import { SatelliteMap } from '../SatelliteMap';
import { useTranslation } from '../../hooks/useTranslation';

export const AnalyticsHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Determine active tab based on URL subpath
  let currentTab = 'soil-nutrients';
  if (location.pathname.includes('/analytics/financial')) {
    currentTab = 'financial';
  } else if (location.pathname.includes('/analytics/satellite-map') || location.pathname === '/satellite-map') {
    currentTab = 'satellite-map';
  } else if (location.pathname.includes('/analytics/soil-nutrients')) {
    currentTab = 'soil-nutrients';
  }

  const tabs = [
    {
      id: 'soil-nutrients',
      label: t('soil_health_title', 'Soil Nutrient Mapping'),
      path: '/analytics/soil-nutrients',
      icon: Layers
    },
    {
      id: 'financial',
      label: t('financial_title', 'Financial Economics Analytics'),
      path: '/analytics/financial',
      icon: DollarSign
    },
    {
      id: 'satellite-map',
      label: t('nav_satellite', 'Satellite & Field Map'),
      path: '/analytics/satellite-map',
      icon: MapPin
    }
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      {/* Analytics Hub Header & Sub-Tab Navigation Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0B4D2F]" />
              <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Predictive Data Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('nav_analytics', 'Analytics Hub')}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {t('analytics_hub_subtitle', 'Unified agricultural intelligence platform combining soil health, financial economics, and satellite remote sensing')}
            </p>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-gray-100 pt-2 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#0B4D2F] text-[#0B4D2F] bg-emerald-50/70 rounded-t-xl shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0B4D2F]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-Module Content */}
      <div className="w-full">
        {currentTab === 'soil-nutrients' && <SoilNutrientMapping />}
        {currentTab === 'financial' && <FinancialViability />}
        {currentTab === 'satellite-map' && <SatelliteMap />}
      </div>
    </div>
  );
};

export default AnalyticsHub;
