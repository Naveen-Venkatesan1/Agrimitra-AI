import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, Camera, Sprout, AlertTriangle, CheckCircle2, Activity, Zap, ArrowRight, RotateCcw, ArrowLeft } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cropApi } from '../../services/api';

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

export const CropIntelligence = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAlert, user, latestDiagnosis, setLatestDiagnosis, clearCropIntelligenceSession } = useAppStore();
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // 'idle' | 'image_selected' | 'analyzing' | 'success' | 'error'
  const [currentScanId, setCurrentScanId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validate and restore active scan session on page load / browser refresh
  useEffect(() => {
    const checkAndLoad = async () => {
      if (latestDiagnosis && latestDiagnosis.scanId && (latestDiagnosis.crop || latestDiagnosis.disease)) {
        setRestoring(true);
        const uid = user?.id;
        const key = uid ? `${uid}_latest_leaf_image` : 'guest_latest_leaf_image';
        try {
          const { getImageFromLocal } = await import('../../utils/imageStore');
          const blob = await getImageFromLocal(key);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setSelectedImage(url);
            const updated = { ...latestDiagnosis, image: url };
            setAnalysisResult(updated);
            setLatestDiagnosis(updated);
            setCurrentScanId(latestDiagnosis.scanId);
            setAnalysisStatus('success');
          } else if (latestDiagnosis.image && !String(latestDiagnosis.image).startsWith('blob:')) {
            setSelectedImage(latestDiagnosis.image);
            setAnalysisResult(latestDiagnosis);
            setCurrentScanId(latestDiagnosis.scanId);
            setAnalysisStatus('success');
          } else {
            // Invalid / missing image: start clean
            performNewScanReset();
          }
        } catch (e) {
          console.warn('Failed to restore image from IndexedDB:', e);
          performNewScanReset();
        } finally {
          setRestoring(false);
        }
      } else {
        // No active scan: start in clean upload state
        setSelectedImage(null);
        setSelectedFile(null);
        setAnalysisStatus('idle');
        setAnalysisResult(null);
        setCurrentScanId(null);
      }
    };

    checkAndLoad();
  }, [user?.id]);

  const performNewScanReset = async () => {
    setSelectedFile(null);
    setSelectedImage(null);
    setAnalysisResult(null);
    setAnalysisStatus('idle');
    setCurrentScanId(null);
    if (clearCropIntelligenceSession) {
      await clearCropIntelligenceSession();
    }
  };

  const handleNewScanClick = () => {
    if (analysisResult || selectedImage || selectedFile) {
      setShowConfirmModal(true);
    } else {
      performNewScanReset();
    }
  };

  const triggerAnalysis = async (fileToAnalyze = selectedFile) => {
    const file = fileToAnalyze || selectedFile;
    if (!file) return;

    setAnalysisStatus('analyzing');
    const scanIdToUse = currentScanId || ('scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    setCurrentScanId(scanIdToUse);

    const res = await cropApi.analyzeCropDisease(file, user?.id);

    if (!res.success) {
      setAnalysisStatus('error');
      setAnalysisResult(null);
      addAlert({
        title: 'Analysis Failed',
        message: res.error || 'Analysis failed. Please try again.',
        type: 'System Error',
        category: 'system',
        severity: 'danger'
      });
      return;
    }

    if (res.isLowConfidence) {
      addAlert({
        title: 'Low Confidence Disease Analysis',
        message: res.error || 'Could not reach minimum confidence threshold for diagnosis.',
        type: 'Disease Alert',
        category: 'disease',
        severity: 'warning'
      });
      const lowResult = {
        scanId: scanIdToUse,
        analysisId: scanIdToUse,
        image: selectedImage,
        imageKey: user?.id ? `${user.id}_latest_leaf_image` : 'guest_latest_leaf_image',
        isLowConfidence: true,
        message: res.error || 'Unable to confidently identify this leaf. Please upload a clear image of the affected leaf.'
      };
      setAnalysisResult(lowResult);
      setLatestDiagnosis(lowResult);
      setAnalysisStatus('success');
      return;
    }

    if (res.diagnosis) {
      const diag = res.diagnosis;
      const formatted = {
        ...diag,
        scanId: scanIdToUse,
        analysisId: scanIdToUse,
        image: selectedImage || diag.imageUrl,
        imageKey: user?.id ? `${user.id}_latest_leaf_image` : 'guest_latest_leaf_image',
        crop: diag.cropName || diag.crop,
        disease: diag.diseaseName || diag.disease,
        confidence: diag.confidence,
        riskLevel: diag.severity?.includes('High') ? 'High' : (diag.severity || 'Low'),
        riskScore: diag.healthScore,
        healthScore: diag.healthScore,
        healthRating: diag.healthRating,
        affectedArea: diag.affectedArea,
        biologicalTreatment: diag.organicSolution,
        organicSolution: diag.organicSolution,
        chemicalTreatment: diag.treatment,
        treatment: diag.treatment,
        immediatePrecautions: diag.immediatePrecautions,
        prevention: diag.prevention,
        recoveryTimeline: diag.recoveryTimeline,
        nextScanReminder: diag.nextScanReminder,
        top3: diag.top3 || [],
        symptoms: diag.symptoms,
        cause: diag.cause,
        recoveryAdvice: diag.recoveryAdvice,
        predictionTime: diag.predictionTime,
        modelVersion: diag.modelVersion,
        scanTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date().toLocaleDateString() + ')'
      };
      setAnalysisResult(formatted);
      setLatestDiagnosis(formatted);
      setAnalysisStatus('success');

      if (formatted.riskLevel === 'High') {
        addAlert({
          title: `High plant health risk detected in your ${user?.primaryCrop || formatted.crop || 'Paddy'} field (${formatted.disease})`,
          type: 'Disease Alert',
          category: 'disease',
          severity: 'danger'
        });
      }
    } else {
      setAnalysisStatus('error');
      setAnalysisResult(null);
      addAlert({
        title: 'Analysis Failed',
        message: 'Analysis failed. Please try again.',
        type: 'System Error',
        category: 'system',
        severity: 'danger'
      });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediately generate new scanId and invalidate previous analysis results
    const newScanId = 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    setCurrentScanId(newScanId);
    setAnalysisResult(null);
    setLatestDiagnosis(null);
    setAnalysisStatus('image_selected');

    const imgUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedImage(imgUrl);

    // Save to IndexedDB
    try {
      const { saveImageToLocal } = await import('../../utils/imageStore');
      const key = user?.id ? `${user.id}_latest_leaf_image` : 'guest_latest_leaf_image';
      await saveImageToLocal(key, file);
    } catch (e) {
      console.warn('Failed to save uploaded image to local storage:', e);
    }

    // Auto-trigger analysis immediately on image upload
    triggerAnalysis(file);
  };

  const showRecButton = Boolean(
    analysisStatus === 'success' && 
    analysisResult && 
    !analysisResult.isLowConfidence &&
    analysisResult.scanId === currentScanId
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Back Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Header & New Scan Action */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">AI COMPUTER VISION & CROP HEALTH</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('crop_intel_title')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('crop_intel_subtitle')}</p>
        </div>

        <button
          onClick={handleNewScanClick}
          title="Clear current analysis and start a new scan"
          className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition hover:border-agri-primary hover:text-agri-primary"
        >
          <RotateCcw className="w-3.5 h-3.5 text-agri-primary" />
          <span>New Scan</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4 border border-gray-100">
            <h3 className="text-base font-bold text-agri-dark">Start a new scan?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your current analysis will be cleared.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setShowConfirmModal(false); performNewScanReset(); }}>
                Start New Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          onClick={() => navigate('/crop-intelligence/health-risk')}
          className="p-4 cursor-pointer border-2 hover:border-agri-primary flex items-center justify-between"
        >
          <div>
            <h4 className="text-xs font-bold text-agri-dark">Crop Health Matrix</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">View Risk Assessment Matrix</p>
          </div>
          <Zap className="w-5 h-5 text-amber-500" />
        </Card>

        <Card 
          onClick={() => navigate('/crop-intelligence/health-risk')}
          className="p-4 cursor-pointer border-2 hover:border-agri-primary flex items-center justify-between"
        >
          <div>
            <h4 className="text-xs font-bold text-agri-dark">National Benchmarks</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">Compare Regional Yield & Health</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </Card>

        <Card 
          onClick={() => navigate('/crop-intelligence/health-risk')}
          className="p-4 cursor-pointer border-2 hover:border-agri-primary flex items-center justify-between"
        >
          <div>
            <h4 className="text-xs font-bold text-agri-dark">Health Risk Scorecard</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">View Field Risk Matrix</p>
          </div>
          <Activity className="w-5 h-5 text-agri-light" />
        </Card>
      </div>

      {/* Main Upload / Camera Diagnosis Box */}
      {restoring ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px]">
          <div className="w-12 h-12 border-4 border-agri-light border-t-agri-primary rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-agri-dark">Restoring latest crop analysis...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
          
          {/* Left: Image Scanner Upload */}
          <Card hover={false} className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-agri-dark mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-agri-primary" /> Leaf Scanner & Camera Capture
              </h3>

              <div className="border-2 border-dashed border-gray-300 hover:border-agri-primary rounded-2xl p-4 text-center transition bg-gray-50/50 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
                {selectedImage ? (
                  <div className="w-full flex items-center justify-center p-2">
                    <img 
                      src={selectedImage} 
                      alt="Uploaded leaf sample" 
                      className="max-h-64 w-auto max-w-full object-contain rounded-xl shadow-sm" 
                    />
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-agri-primary flex items-center justify-center mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-agri-dark">{t('upload_photo')}</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">Supports JPG, PNG, WEBP. Drag and drop or browse from your phone camera.</p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium">
                Model: {analysisResult?.modelVersion || 'v1 (AgriMitra AI Engine)'} | Time: {analysisResult?.predictionTime || '0'}s
              </span>
              <Button 
                disabled={!selectedFile || analysisStatus === 'analyzing'}
                onClick={() => triggerAnalysis(selectedFile)}
                variant="primary" 
                loading={analysisStatus === 'analyzing'} 
                icon={Sprout}
              >
                {analysisStatus === 'analyzing' ? 'Analyzing...' : t('analyze')}
              </Button>
            </div>
          </Card>

          {/* Right: CORE AI Diagnosis Summary Display */}
          <Card hover={false} className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-agri-dark flex items-center gap-2">
                <Activity className="w-4 h-4 text-agri-primary" /> AI Diagnosis Summary
              </h3>
            </div>

            {analysisStatus === 'analyzing' ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-agri-light border-t-agri-primary rounded-full animate-spin mb-3" />
                <p className="text-xs font-bold text-agri-dark">Analyzing leaf cellular pattern...</p>
                <p className="text-[10px] text-gray-400 mt-1">Evaluating Plant Health Score (0-100), severity, and precautions</p>
              </div>
            ) : analysisResult?.isLowConfidence ? (
              <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <h4 className="text-sm font-bold">Low Confidence Identification</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {analysisResult.message}
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  Please upload a clear, well-lit image of the affected leaf for an accurate diagnosis.
                </p>
              </div>
            ) : (analysisResult && analysisStatus === 'success' && analysisResult.scanId === currentScanId) ? (
              <div className="space-y-4 animate-fade-in">
                {/* A. Core Disease Status Header */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  analysisResult.riskLevel === 'High' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    {analysisResult.riskLevel === 'High' ? (
                      <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold truncate">{analysisResult.disease}</h4>
                        <Badge variant="outline" size="xs" className="bg-white/60 border-gray-300 text-gray-800 shrink-0">
                          Crop: {analysisResult.crop}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90 mt-1 font-semibold">
                        Confidence: {parseConfidenceNum(analysisResult.confidence).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <Badge variant={analysisResult.riskLevel === 'High' ? 'danger' : 'good'} className="shrink-0">
                    {analysisResult.riskLevel} {t('risk_level')}
                  </Badge>
                </div>

                {/* B. Plant Health Score Index Gauge */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200 block">
                      Plant Health Score Index
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black">{analysisResult.healthScore || 85}</span>
                      <span className="text-sm font-semibold text-emerald-200">/ 100</span>
                      <Badge variant="outline" size="sm" className="bg-white/20 text-white border-white/30 ml-2">
                        {analysisResult.healthRating || (analysisResult.healthScore >= 80 ? 'Healthy' : 'Poor')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-emerald-100 block">Affected Area</span>
                    <span className="text-lg font-bold text-white">{analysisResult.affectedArea || '15%'}</span>
                  </div>
                </div>

                {/* C. Top-3 AI Confidence Analysis */}
                {analysisResult.top3 && analysisResult.top3.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                      🎯 AI Confidence Analysis
                    </span>
                    <div className="space-y-2">
                      {analysisResult.top3.map((pred, idx) => {
                        const confVal = parseConfidenceNum(pred.confidence);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs gap-3">
                            <span className="text-gray-600 font-medium truncate flex-1 min-w-0">{pred.crop} - {pred.disease}</span>
                            <div className="flex items-center gap-2.5 w-36 sm:w-44 shrink-0">
                              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-agri-primary transition-all duration-500" style={{ width: `${confVal}%` }} />
                              </div>
                              <span className="text-gray-600 font-bold w-12 text-right text-[11px] tabular-nums shrink-0">{confVal.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* D. Short Immediate Summary */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    Your leaf sample shows symptoms associated with <strong>{analysisResult.disease}</strong> ({analysisResult.crop}). Click below to view the comprehensive recommendation report detailing bio-remedies, chemical treatments, recovery timeline, and future prevention.
                  </p>
                </div>

                {/* E. PRIMARY ACTION BUTTON */}
                {showRecButton && (
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full justify-center text-sm font-bold shadow-md animate-fade-in"
                      onClick={() => navigate('/crop-intelligence/recommendation')}
                      icon={ArrowRight}
                    >
                      View Full Recommendation →
                    </Button>
                  </div>
                )}
              </div>
            ) : analysisStatus === 'error' ? (
              <div className="py-20 text-center flex flex-col items-center justify-center bg-red-50/50 rounded-xl border border-red-100">
                <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
                <h4 className="text-sm font-bold text-red-900">Analysis Failed</h4>
                <p className="text-xs text-red-700 mt-1 max-w-xs px-4">
                  {analysisResult?.message || "Could not reach the AI Engine or an error occurred during analysis."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => triggerAnalysis(selectedFile)}
                  icon={RotateCcw}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <Sprout className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-semibold text-gray-500">Upload a plant photo to begin analysis.</p>
              </div>
            )}
          </Card>

        </div>
      )}
    </div>
  );
};

export default CropIntelligence;
