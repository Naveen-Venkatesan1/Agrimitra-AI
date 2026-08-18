import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Activity, AlertTriangle, CheckCircle2, Sprout, Bot, Shield, Droplets, Leaf } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

const parseConfidenceNum = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    let num = val;
    if (num <= 1.0) num = num * 100;
    return Math.min(100, Math.max(0, num));
  }
  const str = String(val).replace('%', '').trim();
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (num <= 1.0) num = num * 100;
  return Math.min(100, Math.max(0, num));
};

export const CropIntelligenceReport = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { latestDiagnosis, setLatestDiagnosis, user } = useAppStore();
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const checkAndRestore = async () => {
      if (!latestDiagnosis || (!latestDiagnosis.disease && !latestDiagnosis.prediction)) {
        // No active scan found, redirect to scanner page instead of faking data
        navigate('/crop-intelligence', { replace: true });
        return;
      }

      if (latestDiagnosis && (latestDiagnosis.crop || latestDiagnosis.disease)) {
        const imageIsDeadBlob = !latestDiagnosis.image || String(latestDiagnosis.image).startsWith('blob:');
        if (imageIsDeadBlob) {
          setRestoring(true);
          const uid = user?.id;
          const key = uid ? `${uid}_latest_leaf_image` : 'guest_latest_leaf_image';
          try {
            const { getImageFromLocal } = await import('../../utils/imageStore');
            const blob = await getImageFromLocal(key);
            if (blob) {
              const url = URL.createObjectURL(blob);
              setLatestDiagnosis({ ...latestDiagnosis, image: url });
            }
          } catch (e) {
            console.warn('Failed to restore image from IndexedDB inside report:', e);
          } finally {
            setRestoring(false);
          }
        }
      }
    };
    checkAndRestore();
  }, [latestDiagnosis?.crop, latestDiagnosis?.disease, user?.id, user?.primaryCrop]);

  const handlePrint = () => {
    window.print();
  };

  const diag = latestDiagnosis;
  const isHealthy = String(diag.disease || diag.prediction || '').toLowerCase().includes('healthy');
  const confVal = parseConfidenceNum(diag.confidence);
  const healthScore = diag.healthScore || diag.riskScore || (isHealthy ? 95 : 25);
  const severity = diag.severity || (isHealthy ? 'Low' : 'High');
  const riskLevel = diag.riskLevel || severity;
  const affectedArea = diag.affectedArea || (isHealthy ? '2-5%' : '25-40%');
  const scanTime = diag.scanTime || diag.createdAt || new Date().toLocaleString();

  return (
    <div className="space-y-6 animate-fade-in pb-12 printable-report">
      {/* Top Header Actions (Hidden in Print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/crop-intelligence', { state: { fromReport: true } })}
          icon={ArrowLeft}
        >
          Back to Analysis
        </Button>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={handlePrint}
          icon={Printer}
        >
          Print / Save PDF
        </Button>
      </div>

      {restoring ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px]">
          <div className="w-12 h-12 border-4 border-agri-light border-t-agri-primary rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-agri-dark">Restoring recommendation report...</p>
        </div>
      ) : (
        /* Main Report Document Container */
        <div className="space-y-6 animate-fade-in">
          {/* Printable Header Banner */}
          <div className="p-6 rounded-2xl bg-agri-dark text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 block">
                AGRIMITRA AI • OFFICIAL CROP INTELLIGENCE REPORT
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">Recommended Treatment & Crop Intelligence Report</h1>
              <p className="text-xs text-emerald-100 mt-1">
                Generated via MobileNetV2 Deep Learning Model • Scan Timestamp: {scanTime}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center bg-white/10 px-3.5 py-2 rounded-xl border border-white/20">
              <Activity className="w-5 h-5 text-emerald-300" />
              <div className="text-left">
                <span className="text-[10px] text-emerald-200 uppercase font-bold block">Status</span>
                <span className="text-xs font-bold text-white">{isHealthy ? 'Crop Healthy' : 'Action Required'}</span>
              </div>
            </div>
          </div>

          {/* 1. Plant Health Score Index Gauge */}
          <Card hover={false} className="p-5 printable-card">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200 block">
                  Plant Health Score Index
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black">{healthScore}</span>
                  <span className="text-sm font-semibold text-emerald-200">/ 100</span>
                  <Badge variant="outline" size="sm" className="bg-white/20 text-white border-white/30 ml-2">
                    {diag.healthRating || (healthScore >= 80 ? 'Healthy' : (healthScore >= 50 ? 'Moderate' : 'Critical'))}
                  </Badge>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-emerald-100 block">Affected Area</span>
                <span className="text-lg font-bold text-white">{affectedArea}</span>
              </div>
            </div>
          </Card>

          {/* 2. Core Diagnosis Summary Header & Image */}
          <Card hover={false} className="p-5 printable-card">
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {diag.image && (
                <div className="shrink-0 flex items-center justify-center border border-gray-100 rounded-xl p-1 bg-gray-50/50">
                  <img 
                    src={diag.image} 
                    alt="Leaf scan sample" 
                    className="max-h-24 w-auto max-w-[120px] object-contain rounded-lg shadow-xs" 
                  />
                </div>
              )}
              <div className={`p-4 rounded-xl border flex items-center justify-between flex-1 w-full ${
                riskLevel === 'High' || riskLevel === 'Critical' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  {riskLevel === 'High' || riskLevel === 'Critical' ? (
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold truncate">{diag.disease}</h3>
                      <Badge variant="outline" size="xs" className="bg-white/60 border-gray-300 text-gray-800 shrink-0">
                        Crop: {diag.crop}
                      </Badge>
                    </div>
                    <p className="text-xs opacity-90 mt-1 font-semibold">AI Confidence: {confVal.toFixed(2)}%</p>
                  </div>
                </div>

                <Badge variant={riskLevel === 'High' || riskLevel === 'Critical' ? 'danger' : 'good'} className="shrink-0 text-xs px-3 py-1">
                  {riskLevel} Risk Level
                </Badge>
              </div>
            </div>
          </Card>

          {/* 3. Immediate Precautions */}
          <Card hover={false} className="p-5 printable-card">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                ⚠️ Immediate Precautions
              </h3>
              <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                {diag.immediatePrecautions || diag.precautions || 'Prune infected foliage immediately and isolate the field patch from irrigation drainage.'}
              </p>
            </div>
          </Card>

          {/* 4. Top-3 AI Confidence Analysis */}
          {diag.top3 && diag.top3.length > 0 && (
            <Card hover={false} className="p-5 printable-card">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                🎯 AI Confidence Analysis
              </h3>
              <div className="space-y-2.5">
                {diag.top3.map((pred, idx) => {
                  const itemConf = parseConfidenceNum(pred.confidence);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm gap-3 p-2 rounded-lg bg-gray-50/80 border border-gray-100">
                      <span className="text-gray-700 font-semibold truncate flex-1 min-w-0">{pred.crop} — {pred.disease}</span>
                      <div className="flex items-center gap-3 w-40 sm:w-56 shrink-0">
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-agri-primary transition-all duration-500" style={{ width: `${itemConf}%` }} />
                        </div>
                        <span className="text-gray-700 font-extrabold w-14 text-right text-xs tabular-nums shrink-0">{itemConf.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 5. Biological & Organic Remedy */}
          <Card hover={false} className="p-5 printable-card">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <h3 className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-emerald-800 flex items-center gap-1.5">
                🌿 Organic Solution & Bio-Remedy
              </h3>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                {diag.organicSolution || diag.biologicalTreatment || 'Spray Neem Seed Kernel Extract (NSKE 5%) or Trichoderma viride @ 5g/L.'}
              </p>
            </div>
          </Card>

          {/* 6. Chemical Treatment */}
          <Card hover={false} className="p-5 printable-card">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                🧪 Recommended Chemical Treatment
              </h3>
              {isHealthy ? (
                <p className="text-xs sm:text-sm text-emerald-800 font-semibold leading-relaxed">
                  Chemical treatment is not required for a healthy plant. Continue preventive care and monitoring.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                  {diag.chemicalTreatment || diag.treatment || 'Apply recommended systemic copper fungicide according to field dosage guidelines.'}
                </p>
              )}
            </div>
          </Card>

          {/* 7. Recovery Timeline & Next Scan Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card hover={false} className="p-4 printable-card">
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block mb-1">
                  ⏱️ Recovery Timeline
                </span>
                <p className="text-xs sm:text-sm font-bold text-purple-900">
                  {diag.recoveryTimeline || (isHealthy ? 'Immediate / Peak Healthy' : '7-10 Days')}
                </p>
              </div>
            </Card>

            <Card hover={false} className="p-4 printable-card">
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block mb-1">
                  📅 Next Scan Reminder
                </span>
                <p className="text-xs sm:text-sm font-bold text-teal-900">
                  {diag.nextScanReminder || 'In 5 Days'}
                </p>
              </div>
            </Card>
          </div>

          {/* 8. Prevention & Future Protection */}
          <Card hover={false} className="p-5 printable-card">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-700" /> Prevention & Future Protection
              </h3>
              <p className="text-xs sm:text-sm text-blue-950 leading-relaxed font-medium">
                {diag.prevention || 'Maintain field sanitation, clear crop residues post-harvest, rotate crops seasonally, and avoid overhead sprinkler irrigation in evening hours.'}
              </p>
            </div>
          </Card>

          {/* 8.5. Cultural Management */}
          {diag.culturalManagement && diag.culturalManagement.length > 0 && (
            <Card hover={false} className="p-5 printable-card">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-slate-700" /> Cultural Management
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {Array.isArray(diag.culturalManagement) ? diag.culturalManagement.join(' ') : diag.culturalManagement}
                </p>
              </div>
            </Card>
          )}

          {/* 8.6. Source Attribution */}
          <div className="text-center text-xs text-gray-500 italic px-4 pb-2">
            Recommendations sourced from: <strong>{diag.recommendationSource || 'AgriMitra AI Knowledge Base'}</strong>
            <br />
            <span className="text-[10px]">Diagnosis Engine: {diag.diagnosisSource || 'Local ML'}. Information is provided for guidance. Always verify with a local agricultural expert.</span>
          </div>

          {/* 9. AI Assistant Integration CTA (Hidden in Print) */}
          <Card hover={false} className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl print:hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-blue-900">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-700 shrink-0" />
                <span>Have questions about this scan or treatment schedule? Ask AgriMitra AI Assistant</span>
              </div>
              <Button 
                size="sm" 
                variant="primary"
                onClick={() => navigate('/ai-assistant')}
                className="shrink-0 text-xs"
              >
                Ask AgriMitra AI Assistant →
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CropIntelligenceReport;
