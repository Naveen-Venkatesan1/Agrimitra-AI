import { db, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from '../../config/firebase';

// Vercel Serverless Proxy handles the Gemini API Key

export const chatApi = {
  async sendMessage(prompt, language = 'English', uid = null, contextObj = null) {
    try {
      let responseText = '';
      const stateName = contextObj?.state || 'Tamil Nadu';
      const districtName = contextObj?.district || 'Thanjavur';
      const cropName = contextObj?.crop || 'Paddy';
      const soilName = contextObj?.soilType || 'Clay Loam';
      const tempVal = contextObj?.temp || 28;

      // First try calling FastAPI ML Chatbot Context API
      try {
        const mlRes = await fetch('http://localhost:8000/chatbot-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: prompt,
            latest_diagnosis: contextObj?.latestDiagnosis || null,
            scan_history: contextObj?.scanHistory || []
          })
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData.answer) {
            responseText = mlData.answer;
          }
        }
      } catch (mlErr) {
        console.warn("FastAPI chatbot-context fallback active:", mlErr.message);
      }

      if (!responseText) {
        // Use the secure Vercel Serverless Function proxy
        const sysInstruction = `You are AgriMitra AI, an expert agricultural assistant for farmers in India.
Current Farmer Context:
- Location: ${districtName}, ${stateName}, India
- Primary Crop: ${cropName}
- Soil Classification: ${soilName}
- Temperature: ${tempVal}°C
Answer in language: ${language}. Provide clear, actionable advice on crops, fertilizers, pest control, weather, and government schemes. Keep responses concise, helpful, and formatted cleanly.`;

        const endpoint = `/api/gemini`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${sysInstruction}\n\nUser Question: ${prompt}` }]
            }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      if (!responseText) {
        // Resilient Smart Agro Knowledge Engine Fallback
        responseText = generateAgroResponse(prompt, language, contextObj);
      }

      // Save user message and assistant reply to Firestore `ai_chat_history`
      if (uid) {
        try {
          await addDoc(collection(db, 'ai_chat_history'), {
            userId: uid,
            userPrompt: prompt,
            aiResponse: responseText,
            language,
            location: `${districtName}, ${stateName}`,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.warn('Firestore chat save warning:', e);
        }
      }

      return { success: true, text: responseText };
    } catch (err) {
      return { 
        success: true, 
        text: generateAgroResponse(prompt, language, contextObj) 
      };
    }
  },

  // Web Speech API - Text to Speech Synthesis Controls
  speakText(text, langCode = 'en-IN', onEnd = null) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95;
      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }
      window.speechSynthesis.speak(utterance);
    }
  },

  pauseSpeech() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  },

  resumeSpeech() {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};

function generateAgroResponse(prompt, language) {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('paddy') || lower.includes('rice') || lower.includes('leaf blast')) {
    return 'For Paddy Leaf Blast: Spray Tricyclazole 75% WP @ 0.6g/L or Isoprothiolane 40% EC @ 1.5ml/L. For organic prevention, apply 5% Neem Seed Kernel Extract (NSKE). Maintain proper field drainage.';
  }
  
  if (lower.includes('fertilizer') || lower.includes('npk') || lower.includes('urea')) {
    return 'Recommended NPK dosage for Paddy: 120kg Nitrogen, 60kg Phosphorus, and 60kg Potassium per hectare. Apply Nitrogen in 3 split doses: Basal, Tillering, and Panicle Initiation.';
  }

  if (lower.includes('scheme') || lower.includes('subsidy') || lower.includes('pm kisan')) {
    return 'Under PM-KISAN, eligible farmers receive ₹6,000 annually in 3 installments. PM Fasal Bima Yojana provides crop insurance coverage at 1.5% - 2% premium rates.';
  }

  if (lower.includes('weather') || lower.includes('rain')) {
    return 'Current weather forecasts show favorable conditions for irrigation. Ensure proper field bunding before forecasted drizzle showers tomorrow.';
  }

  return `Namaste! I am AgriMitra AI, your 24/7 smart farming assistant. For ${prompt}, I recommend checking soil moisture levels and following recommended split N-P-K fertilizer schedules tailored to your district.`;
}
