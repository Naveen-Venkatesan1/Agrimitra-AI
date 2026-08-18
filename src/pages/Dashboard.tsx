import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  Droplets, 
  Layers, 
  Bug, 
  Sun,
  Compass, 
  Calendar,
  ArrowRight,
  CloudRain
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

import { StatCard } from '../components/dashboard/StatCard';
import { QuickAccessCard } from '../components/dashboard/QuickAccessCard';
import { AnalyticsCard } from '../components/dashboard/AnalyticsCard';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { IrrigationWidget } from '../components/dashboard/IrrigationWidget';
import { useTranslation } from '../hooks/useTranslation';
import { soilApi } from '../services/api/soil';
import { getLocationCoordinates } from '../data/indiaLocations';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, irrigation, weather, alerts, selectedState, selectedDistrict, latestDiagnosis } = useAppStore();
  const { t } = useTranslation();

  const [soilHealthData, setSoilHealthData] = useState({ score: '65%', status: 'Good' });

  useEffect(() => {
    let isMounted = true;
    const fetchSoilData = async () => {
      try {
        const coords = getLocationCoordinates(selectedState, selectedDistrict);
        const res = await soilApi.getSoilData(coords.lat, coords.lon);
        if (isMounted && res.success && res.data) {
          let score = 65;
          if (res.data.organicCarbon > 1.0) score += 15;
          else if (res.data.organicCarbon > 0.5) score += 5;
          if (res.data.ph >= 6.0 && res.data.ph <= 7.5) score += 10;
          
          score = Math.min(95, score);
          let status = 'Good';
          if (score < 50) status = 'Poor';
          else if (score < 70) status = 'Moderate';
          
          setSoilHealthData({ score: `${score}%`, status });
        }
      } catch (err) {
        console.warn("Soil fetch failed", err);
      }
    };
    fetchSoilData();
    return () => { isMounted = false; };
  }, [selectedState, selectedDistrict]);

  // 1. Dynamic Crop Health
  let cropHealthScore = "80%";
  let cropHealthStatus = "Good";
  let cropHealthColor = "text-emerald-500";
  
  if (latestDiagnosis && latestDiagnosis.healthScore) {
    cropHealthScore = String(latestDiagnosis.healthScore);
    cropHealthStatus = String(latestDiagnosis.healthRating || "Good");
    const statusLower = cropHealthStatus.toLowerCase();
    if (statusLower === 'poor' || statusLower === 'high risk' || statusLower === 'high') {
      cropHealthColor = "text-red-500";
    } else if (statusLower === 'moderate') {
      cropHealthColor = "text-amber-500";
    }
  } else if (weather?.suitabilityScore) {
    cropHealthScore = `${weather.suitabilityScore}%`;
    cropHealthStatus = String(weather.suitabilityCategory || "Good");
    if (weather.suitabilityScore < 50) cropHealthColor = "text-red-500";
    else if (weather.suitabilityScore < 75) cropHealthColor = "text-amber-500";
  }

  // 2. Dynamic Water Stress
  let waterStressScore = "30%";
  let waterStressStatus = "Low";
  let waterStressColor = "text-emerald-500";
  let waterStressChartColor = "#10B981"; // emerald

  const moisture = irrigation?.soilMoisture || 60;
  const highTemp = Boolean(weather?.temp && weather.temp > 35);
  const isRainy = Boolean(weather?.rainProbabilityTomorrow && weather.rainProbabilityTomorrow > 60);
  
  let stressVal = Math.max(0, 100 - moisture);
  if (highTemp && !isRainy) stressVal += 15;
  if (isRainy) stressVal -= 20;
  stressVal = Math.max(5, Math.min(95, stressVal));
  
  waterStressScore = `${Math.round(stressVal)}%`;
  
  if (stressVal > 60) {
    waterStressStatus = "High";
    waterStressColor = "text-red-500";
    waterStressChartColor = "#EF4444";
  } else if (stressVal > 35) {
    waterStressStatus = "Moderate";
    waterStressColor = "text-amber-500";
    waterStressChartColor = "#F59E0B";
  }

  // 3. Dynamic Pest Risk
  let pestRiskValue = "Low";
  let pestRiskStatus = "No immediate risk";
  let pestRiskColor = "text-gray-400";

  const hasDiseaseAlert = Array.isArray(alerts) && alerts.some((a: any) => a && a.category === 'disease' && a.unread);
  const highHumidity = Boolean(weather?.humidity && weather.humidity > 80);
  const warmTemp = Boolean(weather?.temp && weather.temp > 25 && weather.temp < 35);
  
  if (hasDiseaseAlert) {
    pestRiskValue = "High";
    pestRiskStatus = "Active threat detected";
    pestRiskColor = "text-red-500";
  } else if (highHumidity && warmTemp) {
    pestRiskValue = "Moderate";
    pestRiskStatus = "Favorable conditions for pests";
    pestRiskColor = "text-amber-500";
  } else {
    pestRiskValue = "Low";
    pestRiskStatus = "No immediate risk";
    pestRiskColor = "text-gray-400";
  }

  // Helper for dynamic SVG paths
  const generateSparkline = (valuePercentage: string | number, isInverse = false) => {
    const strVal = String(valuePercentage || '50');
    const num = parseInt(strVal.replace('%', '')) || 50;
    const normalized = isInverse ? (100 - num) : num;
    const yEnd = 20 - (normalized / 100) * 15;
    return `M0 20 L20 ${yEnd + 6} L40 ${yEnd + 2} L60 ${yEnd + 5} L80 ${yEnd + 1} L100 ${yEnd}`;
  };

  const filteredAlerts = Array.isArray(alerts) 
    ? alerts.filter((alert: any) => {
        if (!alert || !alert.title || typeof alert.title !== 'string') return false;
        const tLower = alert.title.toLowerCase();
        return !tLower.includes('pest') && 
               !tLower.includes('borer') && 
               !tLower.includes('outbreak') && 
               alert.category !== 'pest' && 
               alert.category !== 'pest-lifecycle';
      })
    : [];

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans pb-10">
      <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Main Grid: Left Content (Main) + Right Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          
          {/* ========================================================== */}
          {/* LEFT COLUMN: Main Content Area                             */}
          {/* ========================================================== */}
          <div className="space-y-6 overflow-hidden">
            
            {/* 1. HERO SECTION */}
            <div className="relative rounded-[20px] overflow-hidden min-h-[220px] bg-black flex items-center mb-6">
              <img src="/dashboard-images/WhatsApp Image 2026-07-24 at 2.58.54 PM.jpeg" alt="Farm Hero" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              
              <div className="relative z-10 px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between w-full h-full">
                <div className="max-w-xl">
                  <h2 className="text-3xl sm:text-4xl md:text-[40px] font-extrabold text-white mb-2 md:mb-3 leading-tight tracking-tight drop-shadow-md">
                    {t('welcome_back', 'Welcome back')}, {user?.name || t('default_user_name', 'User')}! <span className="inline-block animate-wave origin-bottom-right">👋</span>
                  </h2>
                  <p className="text-[15px] text-gray-200 mb-6 font-medium">{t('dashboard_subtitle', "Here's what's happening in your farm today.")}</p>

                  {/* Farm Info Chips */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 text-xs text-white">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-300 font-medium leading-tight">{t('farm_size', 'Farm Size')}</span>
                        <span className="font-bold leading-tight">{user?.landSize || '2.5 Acres'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 text-xs text-white">
                      <Sprout className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-300 font-medium leading-tight">{t('primary_crop', 'Primary Crop')}</span>
                        <span className="font-bold leading-tight">{user?.primaryCrop || 'Paddy'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 text-xs text-white">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-300 font-medium leading-tight">{t('season', 'Season')}</span>
                        <span className="font-bold leading-tight">Kharif 2024</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 text-xs text-white">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-300 font-medium leading-tight">{t('soil_type', 'Soil Type')}</span>
                        <span className="font-bold leading-tight">{user?.soilType || 'Clay Loam'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. STATS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
              <StatCard
                title={t('crop_health', 'Crop Health')}
                value={cropHealthScore}
                statusText={t(cropHealthStatus.toLowerCase().replace(' ', '_'), cropHealthStatus)}
                statusColor={cropHealthColor}
                icon={Sprout}
                iconColor={cropHealthColor}
                chartPath={generateSparkline(cropHealthScore)}
              />
              <StatCard
                title={t('water_stress', 'Water Stress')}
                value={waterStressScore}
                statusText={t(waterStressStatus.toLowerCase(), waterStressStatus)}
                statusColor={waterStressColor}
                icon={Droplets}
                iconColor={waterStressColor}
                chartPath={generateSparkline(waterStressScore, true)}
                chartColor={waterStressChartColor}
              />
              <StatCard
                title={t('soil_health', 'Soil Health')}
                value={soilHealthData.score}
                statusText={t(soilHealthData.status.toLowerCase(), soilHealthData.status)}
                statusColor={soilHealthData.status === 'Poor' ? 'text-red-500' : soilHealthData.status === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'}
                icon={Layers}
                iconColor={soilHealthData.status === 'Poor' ? 'text-red-500' : soilHealthData.status === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'}
                chartPath={generateSparkline(soilHealthData.score)}
              />
              <StatCard
                title={t('pest_risk', 'Pest Risk')}
                value={pestRiskValue}
                statusText={t(pestRiskStatus.toLowerCase().replace(/ /g, '_'), pestRiskStatus)}
                statusColor={pestRiskColor}
                icon={Bug}
                iconColor={pestRiskColor}
              />
            </div>

            {/* 3. QUICK ACCESS */}
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">{t('quick_access', 'Quick Access')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <QuickAccessCard
                  title={t("crop_intelligence", "Crop Intelligence")}
                  subtitle={t("ai_crop_disease", "AI crop & disease analysis")}
                  actionText={t("analyze_now", "Analyze Now")}
                  actionColor="text-[#0B4D2F]"
                  bgColor="bg-white"
                  borderColor="border-gray-100"
                  onClick={() => navigate('/crop-intelligence')}
                  imageSrc="/dashboard-images/crop-intelligence.jpg"
                />
                <QuickAccessCard
                  title={t("ai_assistant", "AI Assistant")}
                  subtitle={t("ask_anything_farming", "Ask anything about farming")}
                  actionText={t("chat_now", "Chat Now")}
                  actionColor="text-blue-600"
                  bgColor="bg-[#F8FBFF]"
                  borderColor="border-blue-100"
                  onClick={() => navigate('/ai-assistant')}
                  imageSrc="/dashboard-images/ai-assistant.jpg"
                />
                <QuickAccessCard
                  title={t("smart_irrigation", "Smart Irrigation")}
                  subtitle={t("automate_irrigation", "Automate irrigation & save water")}
                  actionText={t("control_now", "Control Now")}
                  actionColor="text-emerald-600"
                  bgColor="bg-[#F0FDF4]"
                  borderColor="border-green-100"
                  onClick={() => navigate('/irrigation')}
                  imageSrc="/dashboard-images/smart-irrigation.jpg"
                />
              </div>
            </div>

            {/* 4. ANALYTICS HUB */}
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">{t('analytics_hub', 'Analytics Hub')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <AnalyticsCard
                  title={t("financial_viability", "Financial Viability & Subsidy")}
                  subtitle={t("check_profit_loss", "Check profit, loss & subsidy schemes")}
                  actionText={t("analyze_now", "Analyze Now")}
                  onClick={() => navigate('/analytics/financial')}
                  imageSrc="/dashboard-images/financial-viability-subsidy.png"
                />

                <AnalyticsCard
                  title="Crop Water Stress Indexing"
                  subtitle="Monitor water stress in crops"
                  actionText="View Details"
                  onClick={() => navigate('/analytics/water-stress')}
                  imageSrc="/dashboard-images/crop-water-stress-indexing.png"
                />

                <AnalyticsCard
                  title="Soil Nutrient Mapping"
                  subtitle="Know your soil better"
                  actionText="View Map"
                  onClick={() => navigate('/analytics/soil-nutrients')}
                  imageSrc="/dashboard-images/soil-nutrient-mapping.png"
                />
              </div>
            </div>

            {/* 5. BOTTOM ROW (Rainfall, Growth, Activities) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Rainfall Chart */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block mb-1">Rainfall <span className="text-gray-500 font-normal">({selectedDistrict}, {selectedState})</span></span>
                  {weather?.rainfall ? (
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-[24px] font-bold text-gray-900 leading-none">{weather.rainfall}</span>
                      <span className="text-[11px] text-gray-500 font-medium mb-1">mm<br/>Expected Rainfall</span>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <span className="text-xs font-medium text-gray-500">Historical rainfall data unavailable</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Crop Growth Stage */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block mb-1">Crop Growth Stage</span>
                  <span className="text-[14px] font-bold text-gray-400 block mt-1">Awaiting Sowing Data</span>
                  <span className="text-[10px] text-gray-400 font-medium mt-1 block">Data unavailable</span>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-gray-300 w-[0%] rounded-full" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                   <span className="text-[10px] font-bold text-gray-400 cursor-not-allowed">Update Sowing Date <ArrowRight className="w-2.5 h-2.5 inline" /></span>
                </div>
                <Sprout className="absolute bottom-2 right-4 w-12 h-12 text-gray-100 opacity-50" />
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block mb-3">Recent Activities</span>
                  <div className="space-y-3">
                    {filteredAlerts && filteredAlerts.length > 0 ? (
                      filteredAlerts.slice(0, 3).map((alert: any, idx: number) => (
                        <div key={alert.id || alert.title || idx} className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 ${alert.category === 'disease' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <div>
                            <p className="text-[11px] font-medium text-gray-800 leading-tight">{alert.title}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{alert.time || 'Recently'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-2">
                        <span className="text-[10px] text-gray-500 font-medium">No recent activities to display.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: Sidebar (Weather, Irrigation, Alerts)        */}
          {/* ========================================================== */}
          <div className="w-full lg:w-[320px] space-y-6">
            
            <WeatherWidget weather={weather} onViewFull={() => navigate('/weather')} />
            <IrrigationWidget irrigation={irrigation} onManage={() => navigate('/irrigation')} />

            {/* Recent Alerts */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-gray-900">{t('recent_alerts', 'Recent Alerts')}</h3>
                <span className="text-[11px] font-bold text-[#0B4D2F] cursor-pointer" onClick={() => navigate('/alerts')}>{t('view_all', 'View All')} <ArrowRight className="w-2.5 h-2.5 inline" /></span>
              </div>
              <div className="space-y-4">
                {filteredAlerts.slice(0, 3).map((alert: any, idx: number) => (
                  <div key={alert.id || alert.title || idx} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {alert.category === 'weather' ? (
                        <CloudRain className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                      ) : alert.category === 'disease' ? (
                        <Bug className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-[11px] font-bold text-gray-800 leading-tight">{alert.title}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{alert.type}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
