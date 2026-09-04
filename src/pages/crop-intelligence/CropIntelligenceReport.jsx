import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Activity, AlertTriangle, CheckCircle2, 
  Sprout, Bot, Shield, Droplets, Leaf, Clock, Pill, Info, AlertCircle 
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/useAppStore';

export const CropIntelligenceReport = () => {
  const navigate = useNavigate();
  const { latestDiagnosis, setLatestDiagnosis, user } = useAppStore();
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const checkAndRestore = async () => {
      if (!latestDiagnosis) {
        navigate('/crop-intelligence', { replace: true });
        return;
      }

      if (latestDiagnosis) {
        const imageIsDeadBlob = !latestDiagnosis.imageUrl || String(latestDiagnosis.imageUrl).startsWith('blob:');
        if (imageIsDeadBlob) {
          setRestoring(true);
          const uid = user?.id;
          const key = uid ? `${uid}_latest_leaf_image` : 'guest_latest_leaf_image';
          try {
            const { getImageFromLocal } = await import('../../utils/imageStore');
            const blob = await getImageFromLocal(key);
            if (blob) {
              const url = URL.createObjectURL(blob);
              setLatestDiagnosis({ ...latestDiagnosis, imageUrl: url });
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
  }, [latestDiagnosis, user?.id]);

  const handlePrint = () => {
    window.print();
  };

  const rawDiag = latestDiagnosis || {};

  // Extract normalized fields
  const crop = rawDiag.crop?.name || rawDiag.cropName || rawDiag.crop || 'Unknown Crop';
  const disease = rawDiag.health?.condition || rawDiag.diseaseName || rawDiag.disease || 'Healthy Foliage';
  const isHealthy = String(disease).toLowerCase().includes('healthy');
  
  const cropConfRaw = rawDiag.crop?.confidence || rawDiag.confidence || 90;
  const cropConf = typeof cropConfRaw === 'number' ? (cropConfRaw <= 1 ? cropConfRaw * 100 : cropConfRaw) : 90;

  const severity = rawDiag.health?.severity || rawDiag.severity || (isHealthy ? 'NONE' : 'MODERATE');
  const scanTime = rawDiag.createdAt ? new Date(rawDiag.createdAt).toLocaleString() : new Date().toLocaleString();

  const biological = rawDiag.recommendations?.biological || rawDiag.biologicalRecommendation || rawDiag.organicSolution || 'Foliar spray of Bacillus subtilis (2g/L) or Trichoderma harzianum.';
  const chemical = rawDiag.recommendations?.chemical || rawDiag.chemicalRecommendation || 'Consult registered fungicides for your region.';
  const safetyDisclaimer = rawDiag.recommendations?.safetyDisclaimer || 'Always follow official product label disclaimers and consult local Krishi Vigyan Kendra (KVK) officers.';
  const prevention = rawDiag.recommendations?.prevention || rawDiag.prevention || 'Maintain clean field conditions and avoid overhead leaf wetness.';
  const symptoms = rawDiag.symptoms || rawDiag.health?.symptoms || [];
  const recoveryTimeline = rawDiag.recovery?.timeline || rawDiag.recoveryEstimate || 'Foliage improvement expected within 7-14 days.';
  const recoverySteps = rawDiag.recovery?.steps || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto px-2 sm:px-4 printable-report mt-6 font-sans">
      {/* Top Header Actions (Hidden in Print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          icon={ArrowLeft}
        >
          Back
        </Button>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={handlePrint}
          icon={Printer}
          className="bg-[#0B4D2F] hover:bg-[#083A23]"
        >
          Print / Save PDF Report
        </Button>
      </div>

      {restoring ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-xs min-h-[300px]">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-gray-700">Restoring report data...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Official Banner Header */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                AGRIMITRA AI • OFFICIAL AGRONOMIC DIAGNOSIS REPORT
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">Crop Pathology & Management Report</h1>
              <p className="text-xs text-slate-300 mt-1">
                Main Agriculture Agent Pipeline • Scan Timestamp: {scanTime}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center bg-white/10 px-4 py-2.5 rounded-xl border border-white/20">
              <Activity className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-300 uppercase font-bold block">Status</span>
                <span className="text-xs font-bold text-white">{isHealthy ? 'Healthy Foliage' : 'Management Required'}</span>
              </div>
            </div>
          </div>

          {/* 1. Core Summary & Leaf Photo */}
          <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card">
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {rawDiag.imageUrl && (
                <div className="shrink-0 flex items-center justify-center border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                  <img 
                    src={rawDiag.imageUrl} 
                    alt="Crop sample" 
                    className="max-h-28 w-auto max-w-[130px] object-contain rounded-lg shadow-2xs" 
                  />
                </div>
              )}

              <div className="flex-1 w-full space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Established Crop</span>
                    <h2 className="text-xl font-black text-slate-900">{crop}</h2>
                  </div>
                  <Badge variant="good" size="md">
                    Crop Confidence: {cropConf.toFixed(0)}%
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Diagnosed Condition</span>
                    <h3 className="text-lg font-extrabold text-slate-900">{disease}</h3>
                  </div>
                  <Badge variant={isHealthy ? 'good' : (severity === 'HIGH' || severity === 'CRITICAL' ? 'danger' : 'warning')} size="md">
                    {isHealthy ? 'Healthy' : `${severity} Severity`}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Symptoms */}
          {symptoms && symptoms.length > 0 && (
             <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card space-y-2">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                 <AlertCircle className="w-4 h-4 text-emerald-700" /> Pathological Observations & Symptoms
               </h3>
               <ul className="list-disc list-inside text-xs text-slate-800 space-y-1.5 font-medium leading-relaxed pl-1">
                 {symptoms.map((item, idx) => (
                   <li key={idx}>{item}</li>
                 ))}
               </ul>
             </Card>
          )}

          {/* 3. Biological & Organic Remedies */}
          <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card space-y-2">
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-700" /> Biological Option & Bio-Control Management
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">{biological}</p>
          </Card>

          {/* 4. Chemical Management */}
          {!isHealthy && (
            <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card space-y-2">
              <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-amber-600" /> Chemical Treatment Option
              </h3>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{chemical}</p>
              {rawDiag?.active_ingredient && (
                <div className="text-[11px] font-bold text-amber-900 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                  🧪 Active Ingredient / Formulation: {rawDiag.active_ingredient}
                </div>
              )}
              <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10.5px] font-semibold text-amber-950">
                ⚠️ {safetyDisclaimer}
              </div>
            </Card>
          )}

          {/* 5. Prevention & Cultural Management */}
          <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card space-y-2">
            <h3 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" /> Prevention & Cultural Management
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">{prevention}</p>
          </Card>

          {/* 6. Recovery Timeline & Steps */}
          <Card hover={false} className="p-5 border border-slate-200 shadow-2xs printable-card space-y-2">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Step-by-Step Recovery Plan
            </h3>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              {recoveryTimeline}
            </p>
            {recoverySteps.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {recoverySteps.map((step, idx) => (
                  <div key={idx} className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {step}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Advisory Footer */}
          <div className="text-center text-[11px] text-slate-400 italic pt-2 pb-4 space-y-1">
            <p>Report generated by AgriMitra Agentic AI Engine. Always follow official product labels and local Krishi Vigyan Kendra (KVK) guidance.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropIntelligenceReport;
