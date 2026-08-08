import { db, collection, addDoc, getDocs, query, orderBy, serverTimestamp, uploadFileToStorage } from '../../config/firebase';

export const cropApi = {
  // Dynamic Crop Recommendation Engine via FastAPI
  async getCropRecommendations({ N = 50, P = 50, K = 50, temp = 28, humidity = 60, ph = 6.5, rainfall = 100 }) {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/predict-crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          N: N,
          P: P,
          K: K,
          Temperature: temp,
          Humidity: humidity,
          pH: ph,
          Rainfall: rainfall
        })
      });
      if (!response.ok) throw new Error('Failed to get crop recommendation');
      const data = await response.json();
      
      const recommendations = [
        {
          crop: data['prediction'],
          matchScore: data['confidence'],
          suitability: 'High',
          waterRequirement: 'Varies',
          expectedYield: 'See market rates',
          season: 'Based on dataset',
          duration: 'Standard',
          marketDemand: 'High'
        }
      ];

      return { success: true, recommendations };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Disease Detection AI + FastAPI Storage
  async analyzeCropDisease(file, uid = null) {
    try {
      const analysisId = 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const formData = new FormData();
      formData.append("file", file);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/predict-disease`, {
        method: 'POST',
        headers: {
          'X-Analysis-ID': analysisId
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Analysis failed. Please try again.');
      }
      
      const data = await response.json();

      if (data.success === false || data.is_low_confidence) {
        return { 
          success: false, 
          isLowConfidence: true,
          analysisId,
          error: data.error || 'Unable to confidently identify the disease. Please upload a clearer leaf image.' 
        };
      }

      let detectedCrop = data.crop || 'Unknown Crop';
      let detectedDisease = data.disease || 'Unknown Disease';
      
      if (!data.crop && data.prediction) {
        if (data.prediction.includes('___')) {
          const parts = data.prediction.split('___');
          detectedCrop = parts[0].replace(/_/g, ' ');
          detectedDisease = parts[1].replace(/_/g, ' ');
        } else {
          detectedDisease = data.prediction;
        }
      }

      // Format Top-3 predictions
      const top3Data = data.top_predictions || data.top_3_predictions || {};
      const top3Formatted = Object.entries(top3Data).map(([key, val]) => {
        let c = key, d = key;
        if (key.includes('___')) {
          const p = key.split('___');
          c = p[0].replace(/_/g, ' ');
          d = p[1].replace(/_/g, ' ');
        }
        return { crop: c, disease: d, confidence: val };
      });

      const recs = data.recommendations || {};

      const diagnosis = {
        analysisId,
        crop: detectedCrop,
        cropName: detectedCrop,
        disease: detectedDisease,
        diseaseName: detectedDisease,
        confidence: data.confidence,
        healthScore: data.health_score,
        healthRating: data.health_rating || (detectedDisease.toLowerCase().includes('healthy') ? 'Healthy' : 'Poor'),
        severity: data.severity || (detectedDisease.toLowerCase().includes('healthy') ? 'Low' : 'High'),
        affectedArea: data.affected_area || (detectedDisease.toLowerCase().includes('healthy') ? '2%' : '35%'),
        riskLevel: data.risk_level || (detectedDisease.toLowerCase().includes('healthy') ? 'Low' : 'High'),
        treatment: recs['Chemical Treatment'] || (Array.isArray(data.treatment) ? data.treatment.join(' ') : 'Consult agricultural expert'),
        medicine: recs['Chemical Treatment'] || 'Fungicide treatment',
        organicSolution: recs['Organic Treatment'] || (Array.isArray(data.treatment) ? data.treatment[1] : 'Neem spray'),
        prevention: recs['Prevention'] || (Array.isArray(data.prevention) ? data.prevention.join(' ') : 'Crop rotation'),
        immediatePrecautions: recs['Immediate Precautions'] || (Array.isArray(data.precautions) ? data.precautions[0] : 'Monitor leaves'),
        futurePrevention: recs['Future Prevention'] || 'Use certified seeds',
        recoveryTimeline: recs['Recovery Timeline'] || '7-10 Days',
        nextScanReminder: recs['Next Scan Reminder'] || 'In 5 Days',
        symptoms: recs['Symptoms'] || 'Foliar lesions',
        cause: recs['Cause'] || 'Fungal/bacterial pathogen',
        recoveryAdvice: recs['Recovery Advice'] || 'Monitor recovery progress',
        modelVersion: data.model_version || 'v1 (MobileNetV2)',
        predictionTime: data.prediction_time_sec || 0.5,
        imageUrl: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
        top3: top3Formatted
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
    } catch (err) {
      console.error("FastAPI predict-disease error:", err);
      return { success: false, error: 'Analysis failed. Please try again.' };
    }
  },

  // Government Schemes via FastAPI
  async getGovernmentSchemes(params = {}) {
    let state = "", district = "", crop = "", farmerCategory = "", schemeType = "";
    if (typeof params === 'string') {
      state = params;
    } else if (params && typeof params === 'object') {
      state = params.state || params.State || "";
      district = params.district || params.District || "";
      crop = params.crop || params.Crop || "";
      farmerCategory = params.farmerCategory || params.FarmerCategory || "";
      schemeType = params.schemeType || params.SchemeType || "";
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/government-schemes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          State: state, 
          District: district, 
          Crop: crop, 
          FarmerCategory: farmerCategory, 
          SchemeType: schemeType 
        })
      });
      if (!response.ok) throw new Error('Failed to fetch schemes');
      const data = await response.json();
      return { success: true, schemes: data['Matching Government Schemes'] || [] };
    } catch (err) {
      return { success: false, error: err.message, schemes: [] };
    }
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

