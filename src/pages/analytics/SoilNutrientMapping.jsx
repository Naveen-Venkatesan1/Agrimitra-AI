import React from 'react';
import { Layers, Activity, Info, CheckCircle2, Zap } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import FertilizerWidget from '../../components/ui/FertilizerWidget';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

export const SoilNutrientMapping = () => {
  const { user, weather } = useAppStore();
  const { t } = useTranslation();

  // WEATHER DEPENDENCY STUB (PHASE 7 CROSS-WIRING):
  // Weather data (temperature, rainfall) directly impacts soil nutrient leaching & mineralization rate
  /*
    WEATHER INTEGRATION LOGIC:
    if (weather.rainfall > 20) {
      calculateNitrogenLeaching(weather.rainfall);
    }
  */

  const nutrients = [
    { symbol: 'N', name: 'Nitrogen', level: '280 kg/ha', target: '250 - 320 kg/ha', status: 'Optimal', variant: 'good' },
    { symbol: 'P', name: 'Phosphorus', level: '18 kg/ha', target: '15 - 25 kg/ha', status: 'Optimal', variant: 'good' },
    { symbol: 'K', name: 'Potassium', level: '195 kg/ha', target: '200 - 280 kg/ha', status: 'Slight Deficit', variant: 'warning' },
    { symbol: 'pH', name: 'Soil Reaction', level: '6.8 pH', target: '6.5 - 7.5 pH', status: 'Ideal Neutral', variant: 'good' },
    { symbol: 'OC', name: 'Organic Carbon', level: '0.62%', target: '0.50 - 0.75%', status: 'Medium', variant: 'good' }
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Precision N-P-K & Subsidy Rates</span>
          <Badge variant="info" size="xs">Weather Data Linked ({weather.temp}°C)</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('soil_health_title')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('soil_health_subtitle')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nutrients.map((n, idx) => (
          <Card key={idx} hover={false} className="p-5 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">{n.name}</span>
                <div className="text-2xl font-black text-agri-dark mt-1">{n.level}</div>
                <p className="text-[11px] text-gray-500 mt-0.5">Target: {n.target}</p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-agri-dark text-[#8BC34A] font-black text-base flex items-center justify-center border border-white/20 shadow-xs">
                {n.symbol}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <Badge variant={n.variant}>{n.status}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Government Subsidized Fertilizer Availability & PACS Stock Widget */}
      <FertilizerWidget />

      {/* Fertilizer Dose Recommendation */}
      <Card hover={false} className="p-6">
        <h3 className="text-sm font-bold text-agri-dark mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-agri-primary" /> AI Nutrient Top-Dressing Plan
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Based on 6.8 pH and Kharif Paddy growth stage (Day 35), apply <strong>Muriate of Potash (MOP) @ 15kg/acre</strong> during tomorrow's split application to correct minor Potassium (K) deficit.
        </p>
      </Card>
    </div>
  );
};

export default SoilNutrientMapping;
