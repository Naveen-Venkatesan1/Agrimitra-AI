import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Sprout, Upload, Camera, ArrowLeft, Leaf, ShieldAlert, Activity, 
  CheckCircle2, ChevronDown, ChevronUp, Volume2, Mic, Settings, X, 
  Loader2, Send, AlertTriangle, Sun, Focus, Image as ImageIcon, Info, 
  HelpCircle, Shield, Calendar, Clock, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { cropApi } from '../../services/api/crop';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

const SUPPORTED_LANGUAGES = [
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
];

const LANG_CODE_TO_NAME = {
  ta: 'Tamil',
  en: 'English',
  te: 'Telugu',
  ml: 'Malayalam',
  hi: 'Hindi'
};

const LANG_NAME_TO_CODE = {
  Tamil: 'ta',
  English: 'en',
  Telugu: 'te',
  Malayalam: 'ml',
  Hindi: 'hi'
};

export const CropIntelligence = () => {
  const navigate = useNavigate();
  const { setLatestDiagnosis } = useAppStore();
  const { currentLang = 'en', changeLanguage } = useTranslation();

  const activeLangCode = ['ta', 'en', 'te', 'ml', 'hi'].includes(currentLang) ? currentLang : 'en';
  const language = LANG_CODE_TO_NAME[activeLangCode] || 'English';

  const setLanguage = useCallback((langName) => {
    const code = LANG_NAME_TO_CODE[langName] || 'en';
    if (typeof changeLanguage === 'function') {
      changeLanguage(code);
    }
  }, [changeLanguage]);

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorState, setErrorState] = useState(null); // 'OFFLINE', 'INVALID', 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [showEvidence, setShowEvidence] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const isAnalyzingRef = useRef(false);
  
  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Clean up object URLs on unmount or preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Auto-load test file if passed in URL query param (for automated testing)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mockFile = urlParams.get('mock_file') || urlParams.get('test_file');
    if (mockFile) {
      const fetchPath = mockFile.startsWith('/') ? mockFile : '/' + mockFile;
      fetch(fetchPath)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'test_leaf.jpg', { type: 'image/jpeg' });
          setImage(file);
          setImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
          });
          setErrorState(null);
          setErrorMessage(null);
          setResult(null);
        })
        .catch(err => console.error("Failed to load test file:", err));
    }
  }, []);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setResult(null);
      setErrorState(null);
      setErrorMessage(null);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setResult(null);
      setErrorState(null);
      setErrorMessage(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClearImage = useCallback(() => {
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImage(null);
    setResult(null);
    setErrorState(null);
    setErrorMessage(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!image || isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setErrorState(null);
    setErrorMessage(null);
    setResult(null);
    
    try {
      const uid = "guest"; 
      const res = await cropApi.analyzeCropDisease(image, language, uid);
      
      if (res.success) {
        if (res.isLowConfidence) {
          setErrorState('INVALID');
          setErrorMessage(res.error || "Please upload a clear crop or leaf image.");
        } else {
          setResult(res.diagnosis);
          if (setLatestDiagnosis) {
            setLatestDiagnosis(res.diagnosis);
          }
        }
      } else {
        if (res.error && res.error.includes("Backend Engine Offline")) {
          setErrorState('OFFLINE');
          setErrorMessage("AI service is temporarily unavailable.");
        } else {
          setErrorState('ERROR');
          setErrorMessage(res.error || "One AI source is temporarily unavailable.");
        }
      }
    } catch (err) {
      console.error("Analysis execution error:", err);
      setErrorState('ERROR');
      setErrorMessage("An error occurred during analysis.");
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [image, language, setLatestDiagnosis]);

  // Robust helper getters for normalized fields across payload structures
  const getCropName = (r) => {
    if (!r) return 'Unknown Crop';
    const target = r.diagnosis || r;
    if (typeof target.crop === 'object' && target.crop?.name) return target.crop.name;
    if (typeof target.crop === 'string') return target.crop;
    if (r.cropName || target.cropName) return r.cropName || target.cropName;
    if (r.lyzr_result?.crop) return r.lyzr_result.crop;
    return 'Unknown Crop';
  };

  const getDiseaseName = (r) => {
    if (!r) return 'Healthy Foliage';
    const target = r.diagnosis || r;
    if (r.diseaseName && r.diseaseName !== 'null' && r.diseaseName !== 'UNKNOWN') return r.diseaseName;
    if (r.disease_name && r.disease_name !== 'null' && r.disease_name !== 'UNKNOWN') return r.disease_name;
    if (r.disease && typeof r.disease === 'string' && r.disease !== 'null' && r.disease !== 'UNKNOWN') return r.disease;
    if (r.plant_condition && r.plant_condition !== 'null' && r.plant_condition !== 'UNKNOWN') return r.plant_condition;
    if (typeof target.health === 'object' && target.health?.condition) return target.health.condition;
    if (r.lyzr_result?.disease) return r.lyzr_result.disease;
    return 'Healthy Foliage';
  };

  const getConfidence = (r) => {
    if (!r) return 90;
    const target = r.diagnosis || r;
    if (typeof target.crop === 'object' && target.crop?.confidence) return target.crop.confidence;
    if (typeof r.confidence === 'number') return r.confidence <= 1 ? r.confidence * 100 : r.confidence;
    if (r.lyzr_result?.confidence) return r.lyzr_result.confidence * 100;
    return 90;
  };

  const getHealthScore = (r) => {
    if (!r) return 85;
    const target = r.diagnosis || r;
    if (typeof target.health === 'object' && target.health?.score) return target.health.score;
    if (typeof r.healthScore === 'number') return r.healthScore;
    return 85;
  };

  const getSeverity = (r) => {
    if (!r) return 'NONE';
    const target = r.diagnosis || r;
    if (typeof target.health === 'object' && target.health?.severity) return target.health.severity;
    if (r.severity) return r.severity;
    return 'NONE';
  };

  const getSymptoms = (r) => {
    if (!r) return [];
    const target = r.diagnosis || r;
    if (Array.isArray(target.symptoms)) return target.symptoms;
    if (Array.isArray(r.symptoms)) return r.symptoms;
    if (Array.isArray(r.lyzr_result?.symptoms)) return r.lyzr_result.symptoms;
    return [];
  };

  const getBiologicalRec = (r) => {
    if (!r) return null;
    const target = r.diagnosis || r;
    if (r.biologicalRecommendation && r.biologicalRecommendation !== 'null' && r.biologicalRecommendation !== 'UNKNOWN') return r.biologicalRecommendation;
    if (r.biological_recommendation && r.biological_recommendation !== 'null' && r.biological_recommendation !== 'UNKNOWN') return r.biological_recommendation;
    if (r.biologicalTreatment && r.biologicalTreatment !== 'null' && r.biologicalTreatment !== 'UNKNOWN') return r.biologicalTreatment;
    if (r.biological_treatment && r.biological_treatment !== 'null' && r.biological_treatment !== 'UNKNOWN') return r.biological_treatment;
    if (target.recommendations?.biological) return target.recommendations.biological;
    if (r.lyzr_result?.biologicalRecommendation && r.lyzr_result?.biologicalRecommendation !== 'null') return r.lyzr_result.biologicalRecommendation;
    return null;
  };

  const getChemicalRec = (r) => {
    if (!r) return null;
    const target = r.diagnosis || r;
    if (r.chemicalRecommendation && r.chemicalRecommendation !== 'null' && r.chemicalRecommendation !== 'UNKNOWN') return r.chemicalRecommendation;
    if (r.chemical_recommendation && r.chemical_recommendation !== 'null' && r.chemical_recommendation !== 'UNKNOWN') return r.chemical_recommendation;
    if (r.chemicalTreatment && r.chemicalTreatment !== 'null' && r.chemicalTreatment !== 'UNKNOWN') return r.chemicalTreatment;
    if (r.chemical_treatment && r.chemical_treatment !== 'null' && r.chemical_treatment !== 'UNKNOWN') return r.chemical_treatment;
    if (target.recommendations?.chemical) return target.recommendations.chemical;
    if (r.lyzr_result?.chemicalRecommendation && r.lyzr_result?.chemicalRecommendation !== 'null') return r.lyzr_result.chemicalRecommendation;
    return null;
  };

  const getSafetyDisclaimer = (r) => {
    if (!r) return null;
    const target = r.diagnosis || r;
    return target.recommendations?.safetyDisclaimer || r.recommendations?.safetyDisclaimer || null;
  };

  const getRecoveryTimeline = (r) => {
    if (!r) return null;
    const target = r.diagnosis || r;
    if (r.recoveryEstimate && r.recoveryEstimate !== 'null' && r.recoveryEstimate !== 'UNKNOWN') return r.recoveryEstimate;
    if (r.recovery_estimate && r.recovery_estimate !== 'null' && r.recovery_estimate !== 'UNKNOWN') return r.recovery_estimate;
    if (r.recoveryTimeline && r.recoveryTimeline !== 'null' && r.recoveryTimeline !== 'UNKNOWN') return r.recoveryTimeline;
    if (r.recovery_timeline && r.recovery_timeline !== 'null' && r.recovery_timeline !== 'UNKNOWN') return r.recovery_timeline;
    if (r.cure_timeline && r.cure_timeline !== 'null' && r.cure_timeline !== 'UNKNOWN') return r.cure_timeline;
    if (target.recovery?.timeline) return target.recovery.timeline;
    if (r.lyzr_result?.cure && r.lyzr_result?.cure !== 'null') return r.lyzr_result.cure;
    return null;
  };

  const getRecoverySteps = (r) => {
    if (!r) return [];
    const target = r.diagnosis || r;
    if (Array.isArray(target.recovery?.steps)) return target.recovery.steps;
    if (Array.isArray(r.recovery?.steps)) return r.recovery.steps;
    return [];
  };

  const parsedDiagnosis = useMemo(() => {
    if (!result) return null;
    const diseaseName = getDiseaseName(result);
    const isHealthy = diseaseName.toLowerCase().includes('healthy');
    return {
      cropName: getCropName(result),
      diseaseName,
      isHealthy,
      confidence: getConfidence(result),
      healthScore: getHealthScore(result),
      severity: getSeverity(result),
      symptoms: getSymptoms(result),
      biologicalRec: getBiologicalRec(result),
      chemicalRec: getChemicalRec(result),
      safetyDisclaimer: getSafetyDisclaimer(result),
      recoveryTimeline: getRecoveryTimeline(result),
      recoverySteps: getRecoverySteps(result),
    };
  }, [result]);

  const handleSpeechPlay = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      alert("Voice playback is not supported in this browser.");
      return;
    }
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    if (!parsedDiagnosis) return;
    
    const { cropName, diseaseName: condition, biologicalRec: bio, chemicalRec: chem } = parsedDiagnosis;
    
    const bioPrefix = language === 'Tamil' ? 'உயிரியல் முறை: ' : (language === 'Telugu' ? 'జీవ నియంత్రణ: ' : (language === 'Malayalam' ? 'ജൈവ പരിഹാരം: ' : (language === 'Hindi' ? 'जैविक उपाय: ' : 'Biological option: ')));
    const chemPrefix = language === 'Tamil' ? 'இரசாயன முறை: ' : (language === 'Telugu' ? 'రసాయన పద్ధతి: ' : (language === 'Malayalam' ? 'രാസ പരിഹാരം: ' : (language === 'Hindi' ? 'रासायनिक उपाय: ' : 'Chemical option: ')));
    
    let textToRead = `${cropName}. ${condition}. `;
    if (bio) textToRead += `${bioPrefix}${bio}. `;
    if (chem) textToRead += `${chemPrefix}${chem}. `;
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    const langMap = {
      "English": "en-IN",
      "Hindi": "hi-IN",
      "Tamil": "ta-IN", 
      "Telugu": "te-IN",
      "Malayalam": "ml-IN"
    };
    utterance.lang = langMap[language] || 'en-IN';
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, parsedDiagnosis, language]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24 text-gray-800 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-8 animate-fade-in">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 bg-white text-gray-700 rounded-full border border-gray-200 shadow-xs hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Crop</h1>
            </div>
            
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs shrink-0">
              <span className="text-xs">🌐</span>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.name}>{l.nativeName} ({l.name})</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-gray-600 text-xs font-medium leading-relaxed">
            Upload a clear leaf photo for real AI crop identification & disease diagnosis.
          </p>
        </div>

        {/* ERROR STATES */}
        {errorState === 'OFFLINE' && (
          <Card className="p-4 bg-white border-l-4 border-l-amber-500 shadow-xs flex flex-col gap-3 items-start mb-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-full shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">AI service unavailable</h3>
                <p className="text-gray-600 text-xs mt-0.5">We couldn't connect to the crop analysis service.</p>
                <p className="text-gray-500 text-[10px] mt-1">Your image is safe. No prediction was generated.</p>
              </div>
            </div>
            <Button onClick={handleAnalyze} className="w-full shrink-0 bg-gray-900 hover:bg-gray-800 py-2.5 text-xs font-bold rounded-xl">
              ↻ Retry Analysis
            </Button>
          </Card>
        )}

        {errorState === 'INVALID' && (
          <Card className="p-4 bg-white border-l-4 border-l-red-500 shadow-xs flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">Unable to verify this image confidently</h3>
              <p className="text-gray-600 text-xs mt-1">{errorMessage || "Try uploading a clearer photo showing the affected leaf in good lighting."}</p>
              <Button onClick={handleClearImage} variant="outline" className="mt-3 w-full py-2 text-xs font-bold rounded-xl border-gray-300">
                Change Photo
              </Button>
            </div>
          </Card>
        )}
        
        {errorState === 'ERROR' && (
          <Card className="p-4 bg-white border-l-4 border-l-red-500 shadow-xs flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Analysis Error</h3>
              <p className="text-gray-600 text-xs mt-0.5">{errorMessage}</p>
              <Button onClick={handleAnalyze} variant="outline" className="mt-3 w-full py-2 text-xs font-bold rounded-xl border-gray-300">
                Retry Analysis
              </Button>
            </div>
          </Card>
        )}

        {/* UPLOAD DASHBOARD */}
        {!result && !isAnalyzing && !errorState && (
          <div className="space-y-4">
            <Card className="overflow-hidden bg-white shadow-xs border border-gray-200/80 p-5">
              <div className="text-center mb-5">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 shadow-2xs border border-emerald-100">
                  <Leaf className="w-6 h-6" />
                </div>
                <h2 className="text-base font-black text-gray-900">Take or upload a photo of your crop leaf</h2>
              </div>

              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center mb-5 shadow-2xs">
                    <img src={imagePreview} alt="Crop preview" className="w-full h-full object-contain" />
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <Button 
                      onClick={handleAnalyze} 
                      disabled={isAnalyzing}
                      className="w-full py-3.5 justify-center text-sm font-black bg-[#0B4D2F] hover:bg-[#083A23] text-white shadow-md rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      🔍 Analyze Crop Health
                    </Button>
                    <Button onClick={handleClearImage} variant="outline" className="w-full py-3 justify-center text-xs font-bold border-gray-300 rounded-xl">
                      Change Photo
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300/70 bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center min-h-[160px] mb-4 hover:bg-emerald-50/70 transition-all"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3 shadow-2xs">
                      <Camera className="w-5 h-5" />
                    </div>
                    <p className="text-gray-900 font-black text-sm mb-0.5">Tap to select photo</p>
                    <span className="inline-block text-gray-500 text-xs font-medium">
                      Clear leaf • Good lighting
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button onClick={() => cameraInputRef.current?.click()} className="w-full py-3.5 justify-center text-sm font-black bg-[#0B4D2F] hover:bg-[#083A23] text-white shadow-md rounded-xl">
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full py-3 justify-center text-xs font-bold border-gray-300 rounded-xl">
                      <Upload className="w-4 h-4 mr-2 text-gray-500" /> Upload Photo
                    </Button>
                  </div>
                </div>
              )}
            </Card>
            
            {/* COLLAPSIBLE HOW IT WORKS */}
            <Card className="bg-white border border-gray-200 p-1 mb-8 shadow-2xs">
                <button 
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="w-full flex justify-between items-center p-3.5 font-bold text-xs text-gray-800 hover:text-emerald-800 rounded-xl transition"
                >
                  <span className="flex items-center gap-2"><Info className="w-4 h-4 text-emerald-700"/> How Agentic AI Diagnosis Works</span>
                  {showEvidence ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                </button>
                
                {showEvidence && (
                  <div className="px-4 pb-4 pt-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</div>
                      <p className="text-xs text-gray-600 font-medium">Vision AI identifies crop species & analyzes leaf pathology.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</div>
                      <p className="text-xs text-gray-600 font-medium">Disease Analysis tool extracts symptoms, severity, and health score.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</div>
                      <p className="text-xs text-gray-600 font-medium">Knowledge Retrieval tool queries verified Indian crop KB for treatments.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</div>
                      <p className="text-xs text-gray-600 font-medium">Chemical & biological tools format safe, label-compliant recommendations.</p>
                    </div>
                  </div>
                )}
            </Card>
          </div>
        )}
        
        {/* PROCESSING STATE */}
        {isAnalyzing && (
          <Card className="p-8 text-center bg-white shadow-xs border border-emerald-100 mt-8 mb-4">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sprout className="w-6 h-6 text-emerald-700" />
              </div>
            </div>
            
            <h3 className="text-base font-black text-gray-900 mb-1">Analyzing crop health...</h3>
            <p className="text-xs font-semibold text-gray-500 mb-5">Executing Agriculture Agent pipeline</p>

            <div className="space-y-3 w-max mx-auto text-left text-xs">
              <div className="flex items-center gap-2.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600"/> 1. Crop Species Identification
              </div>
              <div className="flex items-center gap-2.5 text-emerald-800 font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> 2. Disease Pathology Analysis
              </div>
              <div className="flex items-center gap-2.5 text-gray-400 font-semibold">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div> 3. Agricultural KB Query
              </div>
              <div className="flex items-center gap-2.5 text-gray-400 font-semibold">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div> 4. Formulating Recovery Plan
              </div>
            </div>
          </Card>
        )}

        {/* INVISIBLE INPUTS */}
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleImageSelect} />
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />

        {/* RESULTS SECTION (8-Stage Farmer Experience) */}
        {parsedDiagnosis && !isAnalyzing && !errorState && (
          <div className="space-y-4">
            
            {/* 1. RESULT HEADER (Crop & Confidence) */}
            <Card className="overflow-hidden bg-white shadow-xs border border-slate-200">
              <div className="bg-slate-900 p-4 flex gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Sprout className="w-32 h-32 text-white" />
                </div>
                
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-slate-700 shadow-md bg-slate-800 z-10 flex items-center justify-center">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Leaf Thumbnail" />
                </div>
                
                <div className="text-white z-10 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                       ✓ AI AGENT DIAGNOSED
                     </span>
                  </div>
                  <h2 className="text-xl font-black mb-0.5 leading-tight">{parsedDiagnosis.cropName}</h2>
                  <p className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                     <Activity className="w-3.5 h-3.5 text-emerald-400"/> 
                     Confidence: {parsedDiagnosis.confidence.toFixed(0)}%
                  </p>
                </div>
              </div>
            </Card>
            
            {/* 2. HEALTH ANALYSIS & SEVERITY */}
            <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs">
              <div className={`p-4 rounded-2xl flex items-start gap-3.5 ${
                parsedDiagnosis.isHealthy
                  ? 'bg-emerald-50/80 border border-emerald-200/80' 
                  : 'bg-rose-50/80 border border-rose-200/80'
              }`}>
                <div className={`p-2.5 rounded-xl shrink-0 shadow-2xs ${
                  parsedDiagnosis.isHealthy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {parsedDiagnosis.isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${
                    parsedDiagnosis.isHealthy ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {parsedDiagnosis.isHealthy ? 'Health Status: Healthy' : `Severity: ${parsedDiagnosis.severity}`}
                  </span>
                  <h3 className="text-lg leading-tight font-black text-slate-900 mb-1">
                    {parsedDiagnosis.diseaseName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600 mt-1">
                    <span>Plant Health Score: {parsedDiagnosis.healthScore}/100</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. SYMPTOMS */}
            {parsedDiagnosis.symptoms.length > 0 && (
              <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" /> Symptoms & Observations
                </h3>
                <div className="space-y-2">
                  {parsedDiagnosis.symptoms.map((symptom, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
                      <span>{symptom}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 4 & 5. BIOLOGICAL & CHEMICAL RECOMMENDATIONS */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 px-1">Agentic Recommendations</h3>
              
              <div className="space-y-3">
                {parsedDiagnosis.biologicalRec && (
                  <Card className="p-4 bg-white border-l-4 border-l-emerald-600 border-slate-200/80 shadow-2xs space-y-1.5">
                    <h4 className="font-black text-emerald-900 text-xs flex items-center gap-2">
                      🌿 Biological & Bio-Control Option
                    </h4>
                    <p className="text-slate-700 text-xs font-medium leading-relaxed">
                      {parsedDiagnosis.biologicalRec}
                    </p>
                  </Card>
                )}
                
                {parsedDiagnosis.chemicalRec && (
                  <Card className="p-4 bg-white border-l-4 border-l-amber-500 border-slate-200/80 shadow-2xs space-y-2">
                    <h4 className="font-black text-amber-900 text-xs flex items-center gap-2">
                      🧪 Chemical Treatment Option
                    </h4>
                    <p className="text-slate-700 text-xs font-medium leading-relaxed">
                      {parsedDiagnosis.chemicalRec}
                    </p>
                    
                    {/* Safety Disclaimer Badge */}
                    <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/80 text-[10.5px] font-semibold text-amber-950 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{parsedDiagnosis.safetyDisclaimer || "Always follow official product labels and consult local agricultural guidance for exact application rates."}</span>
                    </div>
                  </Card>
                )}

                {/* 6. RECOVERY PLAN */}
                {parsedDiagnosis.recoveryTimeline && (
                  <Card className="p-4 bg-white border-l-4 border-l-blue-600 border-slate-200/80 shadow-2xs space-y-2">
                    <h4 className="font-black text-blue-900 text-xs flex items-center gap-2">
                      🩺 Recovery Plan & Timeline
                    </h4>
                    <p className="text-slate-700 text-xs font-medium leading-relaxed">
                      {parsedDiagnosis.recoveryTimeline}
                    </p>
                    {parsedDiagnosis.recoverySteps.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {parsedDiagnosis.recoverySteps.map((step, idx) => (
                          <div key={idx} className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS & VOICE AI CHAT */}
            <div className="flex flex-col gap-2.5 pt-3 mb-4">
              <Button 
                onClick={() => navigate('/crop-intelligence/report')} 
                className="w-full py-3.5 justify-center text-sm font-black bg-[#0B4D2F] hover:bg-[#083A23] text-white shadow-md rounded-xl"
              >
                🖨️ View & Print Full Agronomic Report
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button 
                  onClick={() => {
                    if (setLatestDiagnosis && result) {
                      setLatestDiagnosis(result);
                    }
                    navigate('/support/ai-assistant', { 
                      state: { 
                        cropAnalysisContext: result,
                        initialQuery: `I scanned my ${parsedDiagnosis.cropName} leaf (${parsedDiagnosis.diseaseName}). How should I treat it?` 
                      } 
                    });
                  }} 
                  variant="outline" 
                  className="py-3 justify-center text-xs font-bold border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl flex items-center gap-1.5"
                >
                  🤖 Ask Main AgriMitra Farm AI
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearImage} 
                  className="py-3 justify-center text-xs font-bold border-gray-300 bg-white rounded-xl text-gray-600"
                >
                  Scan Another Leaf
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CropIntelligence;
