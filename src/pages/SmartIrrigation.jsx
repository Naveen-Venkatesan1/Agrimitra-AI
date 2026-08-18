import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Power,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  CloudSun,
  Sparkles,
  Activity,
  Cpu,
  TrendingUp,
  BarChart3,
  Wifi,
  Thermometer,
  Info,
  Calendar,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  Check,
  CloudRain,
  ChevronRight,
  Volume2
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

// Analytics Dataset for 24h, 7d, 30d timeframes
const ANALYTICS_DATA = {
  '24h': {
    moisturePoints: [42, 45, 48, 46, 52, 68, 64, 58, 54, 50, 47, 46],
    consumptionBars: [0, 0, 320, 0, 0, 450, 0, 0, 0, 0, 250, 0],
    labels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    avgMoisture: '54.2%',
    totalApplied: '1,020 L',
    savings: '26.4%'
  },
  '7d': {
    moisturePoints: [38, 55, 62, 48, 58, 65, 46],
    consumptionBars: [450, 0, 300, 520, 0, 200, 420],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    avgMoisture: '53.1%',
    totalApplied: '1,890 L',
    savings: '28.5%'
  },
  '30d': {
    moisturePoints: [40, 52, 58, 64, 45, 56, 62, 50, 58, 60],
    consumptionBars: [1200, 950, 1400, 1100, 1300, 850, 900, 1050, 980, 1150],
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'],
    avgMoisture: '55.8%',
    totalApplied: '7,450 L',
    savings: '31.2%'
  }
};

export const SmartIrrigation = () => {
  const {
    irrigation,
    togglePump,
    setIrrigationMode,
    setIrrigationSchedule,
    addAlert,
    user,
    weather,
    selectedState,
    selectedDistrict
  } = useAppStore();

  const { t } = useTranslation();

  // Local UI States
  const [scheduled, setScheduled] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeZoneAction, setActiveZoneAction] = useState(null);
  const [recommendationApplied, setRecommendationApplied] = useState(false);

  // Crop & Weather Context
  const crop = user?.primaryCrop || 'Paddy';
  const locationName = `${selectedDistrict || 'Thanjavur'}, ${selectedState || 'Tamil Nadu'}`;
  const rainProb = weather?.rainProbabilityTomorrow ?? 75;
  const isRainHigh = rainProb >= 65;
  const isMoistureLow = irrigation.soilMoisture < 50;

  // AI Decision Engine Logic
  const aiRecommendation = useMemo(() => {
    if (isRainHigh && irrigation.soilMoisture >= 45) {
      return {
        action: 'Delay Irrigation & Activate Rain Auto-Pause',
        targetZone: 'All Field Sectors',
        duration: 0,
        urgency: 'warning',
        badgeText: 'Rain Forecasted (Auto-Paused)',
        why: `High rain probability (${rainProb}%) forecasted for ${locationName}. Current soil moisture (${irrigation.soilMoisture}%) is adequate. Auto-Pause will save ~320L of water and prevent root hypoxia.`
      };
    } else if (isMoistureLow) {
      return {
        action: `Irrigate Zone 1 (${crop} Main Plot) for 18 Minutes`,
        targetZone: 'Zone 1 - Main Paddy Plot',
        duration: 18,
        urgency: 'critical',
        badgeText: 'Action Required',
        why: `Soil moisture (${irrigation.soilMoisture}%) is below optimal threshold (55%) for ${crop} growth stage. Immediate 18-minute drip cycle recommended.`
      };
    } else {
      return {
        action: 'Maintain Current Irrigation Schedule',
        targetZone: 'Zone 2 & Zone 3',
        duration: 12,
        urgency: 'good',
        badgeText: 'Optimal Hydration',
        why: `Soil moisture is at a healthy ${irrigation.soilMoisture}%. Weather conditions are stable with temperature at ${weather?.temp || 28}°C.`
      };
    }
  }, [isRainHigh, isMoistureLow, irrigation.soilMoisture, rainProb, locationName, crop, weather?.temp]);

  const handleTogglePump = () => {
    togglePump();
  };

  const handleModeChange = (mode) => {
    setIrrigationMode(mode);
    addAlert({
      title: `Irrigation mode updated to ${mode} Mode`,
      type: 'Irrigation Alert',
      category: 'irrigation',
      severity: 'info'
    });
  };

  const handleSetSchedule = (e) => {
    e.preventDefault();
    setScheduled(true);
    addAlert({
      title: `Automated irrigation schedule saved for ${irrigation.scheduledTime || '06:00 AM'} daily`,
      type: 'Irrigation Alert',
      category: 'irrigation',
      severity: 'info'
    });
    setTimeout(() => setScheduled(false), 3500);
  };

  const handleApplyRecommendation = () => {
    setRecommendationApplied(true);
    addAlert({
      title: `AI Recommendation Applied: ${aiRecommendation.action}`,
      type: 'AI Decision Log',
      category: 'irrigation',
      severity: 'good'
    });
    if (aiRecommendation.duration > 0 && irrigation.pumpStatus === 'OFF') {
      togglePump();
    }
    setTimeout(() => setRecommendationApplied(false), 4000);
  };

  const handleZoneWatering = (zoneName) => {
    setActiveZoneAction(zoneName);
    addAlert({
      title: `Manual 10-min watering cycle started for ${zoneName}`,
      type: 'Irrigation Action',
      category: 'irrigation',
      severity: 'info'
    });
    setTimeout(() => setActiveZoneAction(null), 3000);
  };

  // Field Zones Array
  const zones = [
    {
      id: 'zone-1',
      name: 'Zone 1 - Main Paddy Plot',
      crop: crop,
      moisture: `${irrigation.soilMoisture}%`,
      moistureVal: irrigation.soilMoisture,
      req: 'High',
      duration: '18 Mins',
      flow: '12.4 L/min',
      status: isRainHigh ? 'Rain Paused' : (irrigation.pumpStatus === 'ON' ? 'Active Drip' : 'Irrigate Now'),
      badgeVariant: isRainHigh ? 'warning' : (irrigation.pumpStatus === 'ON' ? 'good' : 'danger')
    },
    {
      id: 'zone-2',
      name: 'Zone 2 - Nursery Seedbed',
      crop: `${crop} Seedbed`,
      moisture: '68%',
      moistureVal: 68,
      req: 'Moderate',
      duration: '0 Mins',
      flow: '0.0 L/min',
      status: 'Sufficient Moisture',
      badgeVariant: 'good'
    },
    {
      id: 'zone-3',
      name: 'Zone 3 - South Sector Plot',
      crop: `${crop} Sector B`,
      moisture: '52%',
      moistureVal: 52,
      req: 'High',
      duration: '15 Mins',
      flow: '0.0 L/min',
      status: `Scheduled (${irrigation.scheduledTime || '06:00 AM'})`,
      badgeVariant: 'info'
    },
    {
      id: 'zone-4',
      name: 'Zone 4 - Perimeter Buffer Sector',
      crop: 'Pulse Crop Border',
      moisture: '74%',
      moistureVal: 74,
      req: 'Low',
      duration: '0 Mins',
      flow: '0.0 L/min',
      status: 'Rain Paused',
      badgeVariant: 'warning'
    }
  ];

  const currentAnalytics = ANALYTICS_DATA[timeRange] || ANALYTICS_DATA['7d'];

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">
            IoT Precision Water Automation • {locationName}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">
            Smart AI Irrigation Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time soil moisture telemetry, AI crop water modeling, and predictive rainfall automation
          </p>
          <div className="mt-2">
            <Badge variant="warning" size="sm">Simulation Mode / Hardware Not Connected</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTogglePump}
            variant={irrigation.pumpStatus === 'ON' ? 'danger' : 'primary'}
            icon={Power}
            className="shadow-sm"
          >
            {irrigation.pumpStatus === 'ON' ? 'Turn Pump OFF' : 'Turn Pump ON'}
          </Button>
        </div>
      </div>

      {/* Confirmation Banner */}
      {scheduled && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Automated daily schedule updated to {irrigation.scheduledTime || '06:00 AM'}. Event logged to store.</span>
          </div>
        </div>
      )}

      {recommendationApplied && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>AI Irrigation Recommendation successfully applied to field nodes.</span>
          </div>
        </div>
      )}

      {activeZoneAction && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <Droplets className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <span>Manual 10-minute watering sequence triggered for {activeZoneAction}.</span>
        </div>
      )}

      {/* 1. PROMINENT AI IRRIGATION RECOMMENDATION CARD (HERO) */}
      <div className="bg-gradient-to-r from-[#0B3D2E] via-[#0D5C38] to-[#127045] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden space-y-5">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none transform translate-x-20 -translate-y-20" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8BC34A]/20 backdrop-blur-md text-[#8BC34A] text-xs font-bold border border-[#8BC34A]/30">
              <Sparkles className="w-3.5 h-3.5" /> AI Smart Decision Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-amber-300" /> Live Model v2.4 Active
            </span>
          </div>

          <Badge variant={aiRecommendation.urgency} size="md">
            {aiRecommendation.badgeText}
          </Badge>
        </div>

        {/* Headline Recommendation */}
        <div className="space-y-2 max-w-3xl">
          <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider">Recommended Action</span>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {aiRecommendation.action}
          </h2>
        </div>

        {/* Why? AI Explainability Box */}
        <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#8BC34A] flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-4 h-4" /> Why this AI Recommendation? (Explainability Matrix)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
            {aiRecommendation.why}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-white/10">
            <div>
              <span className="text-emerald-300/80 block text-[10px] uppercase font-bold">Soil Moisture</span>
              <span className="font-bold text-white text-sm">{irrigation.soilMoisture}%</span>
            </div>
            <div>
              <span className="text-emerald-300/80 block text-[10px] uppercase font-bold">Crop Requirement</span>
              <span className="font-bold text-white text-sm">{crop} (High)</span>
            </div>
            <div>
              <span className="text-emerald-300/80 block text-[10px] uppercase font-bold">Weather Temp</span>
              <span className="font-bold text-white text-sm">{weather?.temp || 28}°C</span>
            </div>
            <div>
              <span className="text-emerald-300/80 block text-[10px] uppercase font-bold">Rain Forecast</span>
              <span className="font-bold text-white text-sm">{rainProb}% Prob</span>
            </div>
          </div>
        </div>

        {/* Recommendation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            onClick={handleApplyRecommendation}
            className="px-5 py-2.5 bg-[#8BC34A] hover:bg-[#7cb33d] text-emerald-950 text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Apply AI Recommendation
          </button>

          <span className="text-[11px] text-emerald-200/80 font-medium">
            Auto-Evaluated every 15 mins based on local sensor telemetry & Open-Meteo API
          </span>
        </div>
      </div>

      {/* 2. WATER INTELLIGENCE METRICS (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover={false} className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Today's Water Usage</span>
            <span className="text-xl font-black text-gray-900 mt-0.5 block">1,420 L</span>
            <span className="text-[10px] font-bold text-emerald-600">-18% vs traditional flooding</span>
          </div>
        </Card>

        <Card hover={false} className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Est. Water Saving</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">28.5% Saved</span>
            <span className="text-[10px] font-bold text-gray-500">~410 L saved this week</span>
          </div>
        </Card>

        <Card hover={false} className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Next Irrigation Time</span>
            <span className="text-xl font-black text-gray-900 mt-0.5 block">{irrigation.scheduledTime || '06:00 AM'}</span>
            <span className="text-[10px] font-bold text-gray-500">Daily Auto-Schedule</span>
          </div>
        </Card>

        <Card hover={false} className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Daily Irrigation Duration</span>
            <span className="text-xl font-black text-gray-900 mt-0.5 block">45 Mins</span>
            <span className="text-[10px] font-bold text-gray-500">Across 3 active sectors</span>
          </div>
        </Card>
      </div>

      {/* 3. WEATHER & RAIN INTELLIGENCE + PUMP & SCHEDULE CONFIG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weather & Rain Intelligence Card */}
        <Card hover={false} className="p-6 bg-white border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CloudSun className="w-5 h-5 text-[#0B4D2F]" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Weather & Rain Intelligence Sync
                </h3>
              </div>
              <Badge variant={isRainHigh ? 'warning' : 'good'} size="xs">
                {isRainHigh ? 'High Rain Forecast' : 'Normal Conditions'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-500 font-semibold block text-[11px]">Temperature</span>
                <span className="text-lg font-extrabold text-gray-900 flex items-center gap-1">
                  <Thermometer className="w-4 h-4 text-amber-500" /> {weather?.temp || 28}°C
                </span>
                <span className="text-[10px] text-gray-400 font-medium">{weather?.condition || 'Partly Cloudy'}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-500 font-semibold block text-[11px]">Rain Probability</span>
                <span className="text-lg font-extrabold text-sky-700 flex items-center gap-1">
                  <CloudRain className="w-4 h-4 text-sky-600" /> {rainProb}%
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Expected Rain: {weather?.rainfall || '0.0 mm'}</span>
              </div>
            </div>

            {/* Rain Auto-Pause Status Banner */}
            <div className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
              isRainHigh ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isRainHigh ? 'text-amber-600' : 'text-emerald-600'}`} />
              <div>
                <span className="font-bold">Rain Auto-Pause Status: {isRainHigh ? 'ACTIVE (Pumps Suspended)' : 'STANDBY'}</span>
                <p className="text-[11px] mt-0.5 font-medium leading-relaxed">
                  {isRainHigh
                    ? `High rain probability (${rainProb}%) detected in ${selectedDistrict}. AI engine has automatically delayed scheduled pump cycles to prevent root rot & water waste.`
                    : `Rain probability (${rainProb}%) is below the pause threshold. Automated irrigation cycles will run as scheduled.`}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Location: <strong>{locationName}</strong></span>
            <span>Data Source: Live Open-Meteo API</span>
          </div>
        </Card>

        {/* Pump Control & Mode Setup Form */}
        <Card hover={false} className="p-6 bg-white border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0B4D2F]" /> Control Mode & Schedule Setup
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                irrigation.pumpStatus === 'ON' ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-500 text-white'
              }`}>
                PUMP {irrigation.pumpStatus === 'ON' ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Mode Selector */}
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">Automation Control Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('Auto')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition border ${
                    irrigation.mode === 'Auto'
                      ? 'bg-[#0B4D2F] text-white border-[#0B4D2F] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  🤖 Auto Mode (AI Managed)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('Manual')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition border ${
                    irrigation.mode === 'Manual'
                      ? 'bg-[#0B4D2F] text-white border-[#0B4D2F] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  ✋ Manual Override
                </button>
              </div>
            </div>

            {/* Schedule Form */}
            <form onSubmit={handleSetSchedule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Daily Irrigation Start Time</label>
                <input
                  type="text"
                  value={irrigation.scheduledTime || '06:00 AM'}
                  onChange={(e) => setIrrigationSchedule(e.target.value)}
                  placeholder="e.g. 06:00 AM"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0B4D2F]"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth size="md">
                Save Irrigation Schedule
              </Button>
            </form>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Hardware Node: <strong>AgriPump-Node-01</strong></span>
            <button
              onClick={handleTogglePump}
              className="font-bold text-[#0B4D2F] hover:underline"
            >
              Toggle Pump Status →
            </button>
          </div>
        </Card>

      </div>

      {/* 4. SMART FIELD ZONES (ENHANCED TABLE / CARDS) */}
      <Card hover={false} className="p-6 bg-white border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              Smart Field Sector Zones ({zones.length})
            </h3>
            <p className="text-xs text-gray-500">Individual soil moisture sensor telemetry & AI recommended duration per zone</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Primary Crop: {crop}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">{zone.name}</h4>
                  <span className="text-[11px] font-semibold text-gray-500">{zone.crop} • Flow Rate: {zone.flow}</span>
                </div>
                <Badge variant={zone.badgeVariant} size="xs">
                  {zone.status}
                </Badge>
              </div>

              {/* Moisture Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600">Soil Moisture Level</span>
                  <span className="text-[#0B4D2F]">{zone.moisture}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      zone.moistureVal < 50 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: zone.moisture }}
                  />
                </div>
              </div>

              {/* Water Req & Action */}
              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold uppercase">AI Water Req</span>
                  <span className="font-bold text-gray-800">{zone.req} ({zone.duration})</span>
                </div>

                <button
                  onClick={() => handleZoneWatering(zone.name)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#0B4D2F] border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  Run 10-Min Cycle
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. SENSOR & DEVICE HEALTH MONITORING */}
      <Card hover={false} className="p-5 bg-white border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0B4D2F]" />
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              IoT Sensor & Gateway Hardware Health
            </h3>
          </div>
          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry Online
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-semibold block text-[10px]">SOIL MOISTURE SENSOR</span>
            <span className="font-bold text-emerald-800 text-xs">Online (Batt: 94%)</span>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-semibold block text-[10px]">WATER LEVEL SENSOR</span>
            <span className="font-bold text-emerald-800 text-xs">Online ({irrigation.waterLevel}%)</span>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-semibold block text-[10px]">PUMP CONTROLLER</span>
            <span className="font-bold text-gray-900 text-xs">Node-01 ({irrigation.pumpStatus})</span>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-semibold block text-[10px]">LORAWAN GATEWAY</span>
            <span className="font-bold text-emerald-800 text-xs">Active (24ms Latency)</span>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-semibold block text-[10px]">LAST SENSOR SYNC</span>
            <span className="font-bold text-gray-900 text-xs">Just Now (Stream)</span>
          </div>
        </div>
      </Card>

      {/* 6. IRRIGATION ANALYTICS GRAPH (24h / 7d / 30d) */}
      <Card hover={false} className="p-6 bg-white border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0B4D2F]" /> Irrigation Analytics & Hydration Trends
            </h3>
            <p className="text-xs text-gray-500">Historical soil moisture trajectory vs AI water application volume</p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  timeRange === range
                    ? 'bg-[#0B4D2F] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Summary Pills */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Avg Soil Moisture</span>
            <span className="text-sm font-extrabold text-[#0B4D2F]">{currentAnalytics.avgMoisture}</span>
          </div>

          <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Water Applied</span>
            <span className="text-sm font-extrabold text-sky-700">{currentAnalytics.totalApplied}</span>
          </div>

          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">AI Water Saving Rate</span>
            <span className="text-sm font-extrabold text-amber-700">{currentAnalytics.savings}</span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="h-64 w-full pt-4 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="130" x2="500" y2="130" stroke="#f1f5f9" strokeWidth="1" />

            {/* Threshold Line (55%) */}
            <line x1="0" y1="75" x2="500" y2="75" stroke="#0B4D2F" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.4" />

            {/* Water Consumption Bars */}
            {currentAnalytics.consumptionBars.map((val, i) => {
              const x = (i / (currentAnalytics.consumptionBars.length - 1)) * 460 + 20;
              const barHeight = (val / 1500) * 100;
              const y = 160 - barHeight;
              return (
                <rect
                  key={i}
                  x={x - 8}
                  y={y}
                  width="16"
                  height={barHeight}
                  fill="#0284c7"
                  opacity="0.35"
                  rx="3"
                />
              );
            })}

            {/* Moisture Line Path */}
            <path
              d={currentAnalytics.moisturePoints.reduce((acc, pt, i) => {
                const x = (i / (currentAnalytics.moisturePoints.length - 1)) * 460 + 20;
                const y = 160 - (pt / 100) * 140;
                return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#0B4D2F"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Moisture Points */}
            {currentAnalytics.moisturePoints.map((pt, i) => {
              const x = (i / (currentAnalytics.moisturePoints.length - 1)) * 460 + 20;
              const y = 160 - (pt / 100) * 140;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="#0B4D2F" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })}
          </svg>

          {/* X-Axis Labels */}
          <div className="flex justify-between px-2 text-[10px] text-gray-400 font-bold mt-2">
            {currentAnalytics.labels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* Graph Legend */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0B4D2F]" />
            <span>Soil Moisture Trajectory (%)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-sky-500 opacity-60 rounded-xs" />
            <span>Applied Water Volume (L)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-0 border-b-2 border-dashed border-[#0B4D2F]" />
            <span>Target Threshold (55%)</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SmartIrrigation;
