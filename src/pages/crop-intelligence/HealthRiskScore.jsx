import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

export const HealthRiskScore = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { latestDiagnosis } = useAppStore();
  
  // Dynamic Score Calculation
  const isHighRisk = latestDiagnosis?.riskLevel === 'High';
  const confidenceVal = latestDiagnosis ? parseFloat(latestDiagnosis.confidence) : 0;
  
  // Example heuristic: 100 if perfect, drops heavily if high risk
  let healthScore = 100;
  if (latestDiagnosis) {
    if (isHighRisk) {
      healthScore = Math.max(10, 100 - confidenceVal);
    } else {
      healthScore = Math.min(100, 50 + confidenceVal / 2);
    }
  } else {
    healthScore = 78; // Default fallback if no scan
  }
  
  const overallStatus = latestDiagnosis 
    ? (isHighRisk ? 'High Risk Detected' : 'Healthy Field')
    : 'Moderate Risk (Default)';
    
  const factors = latestDiagnosis ? [
    { factor: `Pathogen Risk (${latestDiagnosis.disease})`, risk: latestDiagnosis.riskLevel, score: `${Math.round(confidenceVal)}%`, variant: isHighRisk ? 'danger' : 'good', desc: `Detected from latest scan.` },
    { factor: 'Crop Water Stress Index (CWSI)', risk: 'Low', score: '12%', variant: 'good', desc: 'Moisture target optimal' },
    { factor: 'Soil Nitrogen Deficit', risk: 'Low', score: '15%', variant: 'good', desc: 'N-P-K levels balanced' },
    { factor: 'Pest Outbreak Risk', risk: 'Low', score: '9%', variant: 'good', desc: 'No pest clusters observed' }
  ] : [
    { factor: 'Fungal Pathogen Risk (Paddy Blast)', risk: 'High', score: '82%', variant: 'danger', desc: 'Humidity above 80% creates spore germination window' },
    { factor: 'Crop Water Stress Index (CWSI)', risk: 'Moderate', score: '32%', variant: 'warning', desc: 'Moisture target slightly below optimal root depth' },
    { factor: 'Soil Nitrogen Deficit', risk: 'Low', score: '15%', variant: 'good', desc: 'N-P-K levels balanced' },
    { factor: 'Pest Outbreak Risk (Stem Borer)', risk: 'Low', score: '9%', variant: 'good', desc: 'No moth egg clusters observed' }
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div>
        <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Risk Analytics</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('crop_health_title')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('crop_health_subtitle')}</p>
      </div>

      {/* Main Scorecard Banner */}
      <Card hover={false} className={`p-6 text-white ${isHighRisk ? 'bg-gradient-to-br from-[#7D2121] to-[#4A0F0F]' : 'bg-gradient-to-br from-[#0B3D2E] to-[#0F4D3A]'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <Badge variant={isHighRisk ? "danger" : "good"} size="md">Overall Field Status: {overallStatus}</Badge>
            <h2 className="text-3xl font-extrabold">Health Score: {Math.round(healthScore)} / 100</h2>
            <p className="text-xs text-gray-200 max-w-md">
              {latestDiagnosis 
                ? `Latest AI Scan indicates ${latestDiagnosis.riskLevel} risk. Disease detected: ${latestDiagnosis.disease}.`
                : '78% of field acreage is healthy. Mild leaf blast markers detected in eastern paddy plot sector B2.'}
            </p>
          </div>

          {/* Radial Score Gauge Visual */}
          <div className={`w-28 h-28 rounded-full border-4 ${isHighRisk ? 'border-[#EF5350]' : 'border-[#8BC34A]'} flex items-center justify-center bg-white/10 backdrop-blur-md shadow-xl`}>
            <span className="text-3xl font-black text-white">{Math.round(healthScore)}%</span>
          </div>
        </div>
      </Card>

      {/* Risk Breakdown Table */}
      <Card hover={false} className="p-6">
        <h3 className="text-sm font-bold text-agri-dark mb-4 border-b pb-2">Sub-Index Risk Factors</h3>
        
        <div className="space-y-3">
          {factors.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-agri-dark">{item.factor}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <div className="text-right">
                <Badge variant={item.variant}>{item.risk}</Badge>
                <span className="text-xs font-extrabold text-agri-dark block mt-1">{item.score}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default HealthRiskScore;
