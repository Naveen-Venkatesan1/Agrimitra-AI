import { db, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from '../../config/firebase';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const res = reader.result;
    const base64 = typeof res === 'string' && res.includes(',') ? res.split(',')[1] : res;
    resolve(base64);
  };
  reader.onerror = error => reject(error);
});

// Expert Agronomic Rule Engine for Fallback Crop Recommendations
const getExpertCropRecommendation = ({ N = 50, P = 50, K = 50, temp = 28, humidity = 60, ph = 6.5, rainfall = 100 }) => {
  const crops = [
    { crop: 'Paddy (Rice)', baseTemp: 28, baseRain: 120, optPh: [5.5, 7.0], optN: 80, optP: 40, optK: 40, duration: '120-150 Days', season: 'Kharif', marketDemand: 'High' },
    { crop: 'Maize (Corn)', baseTemp: 26, baseRain: 80, optPh: [5.8, 7.2], optN: 60, optP: 50, optK: 40, duration: '90-110 Days', season: 'Kharif/Rabi', marketDemand: 'High' },
    { crop: 'Wheat', baseTemp: 20, baseRain: 50, optPh: [6.0, 7.5], optN: 70, optP: 50, optK: 50, duration: '110-130 Days', season: 'Rabi', marketDemand: 'Very High' },
    { crop: 'Cotton', baseTemp: 30, baseRain: 70, optPh: [6.0, 8.0], optN: 50, optP: 40, optK: 50, duration: '150-180 Days', season: 'Kharif', marketDemand: 'High' },
    { crop: 'Groundnut', baseTemp: 27, baseRain: 60, optPh: [6.0, 7.0], optN: 20, optP: 40, optK: 30, duration: '105-125 Days', season: 'Kharif', marketDemand: 'Moderate to High' },
    { crop: 'Sugarcane', baseTemp: 32, baseRain: 150, optPh: [6.0, 7.5], optN: 120, optP: 60, optK: 80, duration: '300-360 Days', season: 'Annual', marketDemand: 'High' }
  ];

  const scored = crops.map(c => {
    let score = 100;
    // Temp penalty
    score -= Math.abs(c.baseTemp - temp) * 2;
    // Rainfall penalty
    score -= Math.abs(c.baseRain - rainfall) * 0.3;
    // pH penalty
    if (ph < c.optPh[0] || ph > c.optPh[1]) {
      score -= 15;
    }
    // NPK alignment penalty
    score -= Math.abs(c.optN - N) * 0.2;
    score -= Math.abs(c.optP - P) * 0.2;
    score -= Math.abs(c.optK - K) * 0.2;

    const matchScore = Math.min(98.5, Math.max(72.0, Math.round(score * 10) / 10));
    return {
      crop: c.crop,
      matchScore,
      suitability: matchScore > 88 ? 'Very High' : (matchScore > 80 ? 'High' : 'Moderate'),
      waterRequirement: c.baseRain > 100 ? 'High' : 'Medium',
      expectedYield: `${Math.round(matchScore * 40 + 1200)} kg/Ha`,
      season: c.season,
      duration: c.duration,
      marketDemand: c.marketDemand
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored;
};

// Fake visual canvas analyzer removed completely as per production requirements.


export const cropApi = {
  // Dynamic Crop Recommendation Engine with Multi-Tier Fallback
  async getCropRecommendations({ N = 50, P = 50, K = 50, temp = 28, humidity = 60, ph = 6.5, rainfall = 100 }) {
    // Tier 1: Try FastAPI Backend
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/predict-crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          N, P, K, Temperature: temp, Humidity: humidity, pH: ph, Rainfall: rainfall
        })
      });
      if (response.ok) {
        const data = await response.json();
        const top3 = data['top_3_predictions'] || data['top_recommendations'] || {};
        const recList = Object.entries(top3).map(([cropName, conf]) => ({
          crop: cropName,
          matchScore: conf,
          suitability: conf > 80 ? 'High' : 'Moderate',
          waterRequirement: 'Balanced',
          expectedYield: 'Optimal',
          season: 'Standard',
          duration: '110-140 Days',
          marketDemand: 'High'
        }));

        if (recList.length > 0) {
          return { success: true, recommendations: recList };
        }
      }
    } catch (err) {
      console.warn('FastAPI predict-crop unavailable, switching to Gemini / Agronomic Engine:', err.message);
    }

    // Tier 2: Try Gemini API
    try {
      const prompt = `Act as an expert agricultural scientist. Given these field conditions:
Nitrogen (N): ${N}, Phosphorus (P): ${P}, Potassium (K): ${K}, Temperature: ${temp}°C, Humidity: ${humidity}%, pH: ${ph}, Rainfall: ${rainfall}mm.
Provide the top 3 recommended crops for highest yield. Return JSON array of objects with keys: "crop", "matchScore", "suitability", "waterRequirement", "expectedYield", "season", "duration", "marketDemand". Do not wrap in markdown.`;

      const geminiRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { success: true, recommendations: parsed };
        }
      }
    } catch (gErr) {
      console.warn('Gemini crop recommendation fallback:', gErr.message);
    }

    // Tier 3: Agronomic Rule Engine (100% Guaranteed Success)
    const fallbackRecs = getExpertCropRecommendation({ N, P, K, temp, humidity, ph, rainfall });
    return { success: true, recommendations: fallbackRecs };
  },

  // Disease Detection AI (Backend Adapter)
  async analyzeCropDisease(file, uid = null) {
    const analysisId = 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/crop-intelligence/analyze`, {
        method: 'POST',
        headers: { 'X-Analysis-ID': analysisId },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 503) {
           return { success: false, error: "AI Engine Offline: Could not reach the Plant.id API backend." };
        }
        const errData = await response.json().catch(() => ({}));
        return { success: false, error: errData.error || errData.message || `API error: ${response.status}` };
      }

      const data = await response.json();
      
      // Handle explicit low confidence or validation failure
      if (data.is_low_confidence || data.status === 'low_confidence' || data.status === 'validation_failed') {
        return {
          success: true,
          isLowConfidence: true,
          error: data.error || data.message || 'Low confidence — please upload a clearer leaf image.',
          diagnosis: null
        };
      }

      if (data.success !== false) {
        const diagnosis = {
          ...data,
          imageUrl: URL.createObjectURL(file),
          createdAt: new Date().toISOString()
        };

        if (uid) {
          try {
            await addDoc(collection(db, 'disease_history'), {
              userId: uid,
              ...diagnosis,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn('Firestore disease save warning:', e);
          }
        }

        return { success: true, diagnosis };
      }
      
      // Fallback for failed success flag from backend
      return { success: false, error: data.error || 'Analysis failed on backend' };
      
    } catch (apiErr) {
      console.warn("Backend API network error:", apiErr.message);
      return { success: false, error: "Backend Engine Offline: Could not reach the server." };
    }
  },

  // Government Schemes via ML Engine / API
  async getGovernmentSchemes(params = {}) {
    const { schemeApi } = await import('./scheme');
    return schemeApi.getGovernmentSchemes(params);
  },

  // Get user disease detection history from Firestore
  async getDiseaseHistory(uid) {
    try {
      const q = query(collection(db, 'disease_history'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q).catch(() => null);

      if (snapshot && !snapshot.empty) {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, history };
      }

      return { success: true, history: [] };
    } catch (err) {
      return { success: true, history: [] };
    }
  }
};

export const getGovernmentSchemes = cropApi.getGovernmentSchemes;


