import React from 'react';
import { Droplets, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

export const CropWaterStress = () => {
  const navigate = useNavigate();
  const { irrigation } = useAppStore();
  const { t } = useTranslation();
  const cwsiScore = 32; // 32% Moderate

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div>
        <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">{t('thermal_stress_index', 'Thermal Stress Index')}</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('water_stress_title', 'Crop Water Stress Indexing (CWSI)')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('water_stress_subtitle', 'Canopy temperature & transpiration deficiency indexing for precision irrigation')}</p>
      </div>

      {/* Main Gauge Card */}
      <Card hover={false} className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <Badge variant="warning" size="md">{t('cwsi_status_moderate', 'CWSI Status: Moderate Stress (32%)')}</Badge>
            <h2 className="text-2xl font-extrabold text-agri-dark">{t('canopy_temp_deficit', 'Canopy Temperature Deficit: 1.4°C')}</h2>
            <p className="text-xs text-gray-600 max-w-md">
              {t('water_stress_description', `Root zone soil moisture is currently at ${irrigation.soilMoisture}%. Stomatal conductance is optimal, but warm afternoon winds require supplemental irrigation tomorrow.`)}
            </p>
          </div>

          <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-amber-500" strokeDasharray={`${cwsiScore}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-agri-dark">{cwsiScore}%</span>
              <span className="text-[10px] text-gray-500 font-bold">{t('cwsi_score', 'CWSI Score')}</span>
            </div>
          </div>
        </div>

        {/* Cross-Module Irrigation Recommendation */}
        <div className="mt-6 p-4 rounded-xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Droplets className="w-6 h-6 text-sky-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-sky-900">{t('irrigation_recommendation_title', 'Recommended Smart Irrigation Action')}</h4>
              <p className="text-xs text-sky-700">{t('irrigation_recommendation_desc', 'Schedule 45-minute drip cycle for Zone 1 at 6:00 AM tomorrow.')}</p>
            </div>
          </div>

          <Button onClick={() => navigate('/irrigation')} variant="water" size="sm" icon={ArrowRight}>
            {t('nav_irrigation', 'Go to Irrigation Controls')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CropWaterStress;
