import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Headphones, RefreshCw, Leaf, Square, Volume2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppStore } from '../../store/useAppStore';
import { db, collection, addDoc, serverTimestamp } from '../../config/firebase';

const GREETING_TEXTS = {
  en: "Hello, I'm AgriMitra AI. How can I help you?",
  ta: "வணக்கம், நான் AgriMitra AI. உங்களுக்கு என்ன உதவி வேண்டும்?",
  hi: "नमस्ते, मैं AgriMitra AI हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
  te: "నమస్కారం, నేను AgriMitra AI. మీకు ఏ సహాయం కావాలి?",
  kn: "ನಮಸ್ಕಾರ, ನಾನು AgriMitra AI. ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು?",
  ml: "നമസ്കാരം, ഞാൻ AgriMitra AI. നിങ്ങൾക്ക് എന്ത് സഹായമാണ് വേണ്ടത്?"
};

const STATUS_TEXTS = {
  en: {
    ready: "Tap to speak",
    listening: "Listening...",
    connecting: "Thinking & Analyzing...",
    speaking: "AgriMitra is Speaking...",
    error: "Voice error. Tap to retry."
  },
  ta: {
    ready: "பேசத் தட்டவும்",
    listening: "கேட்கிறது...",
    connecting: "சிந்திக்கிறது...",
    speaking: "அக்ரிமித்ரா பேசுகிறது...",
    error: "பிழை ஏற்பட்டது. மீண்டும் தட்டவும்."
  },
  hi: {
    ready: "बोलने के लिए टैप करें",
    listening: "सुन रहे हैं...",
    connecting: "सोच रहे हैं...",
    speaking: "AgriMitra बोल रहा है...",
    error: "त्रुटि हुई। पुनः प्रयास करें।"
  },
  te: {
    ready: "మాట్లాడటానికి నొక్కండి",
    listening: "వింటున్నాము...",
    connecting: "ఆలోచిస్తున్నాము...",
    speaking: "అగ్రిమిత్ర మాట్లాడుతోంది...",
    error: "లోపం జరిగింది. మళ్లీ ప్రయత్నించండి."
  },
  kn: {
    ready: "ಮಾತನಾಡಲು ತಟ್ಟಿ",
    listening: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ...",
    connecting: "ಯೋಚಿಸುತ್ತಿದ್ದೇವೆ...",
    speaking: "ಅಗ್ರಿಮಿತ್ರ ಮಾತನಾಡುತ್ತಿದೆ...",
    error: "ದೋಷ ಸಂಭವಿಸಿದೆ. ಮರುಪ್ರಯತ್ನಿಸಿ."
  },
  ml: {
    ready: "സംസാരിക്കാൻ തട്ടുക",
    listening: "കേൾക്കുന്നു...",
    connecting: "ചിന്തിക്കുന്നു...",
    speaking: "അഗ്രിമിത്ര സംസാരിക്കുന്നു...",
    error: "പിശക് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക."
  }
};

const LANG_MAP = {
  en: 'English', ta: 'Tamil', hi: 'Hindi', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', bn: 'Bengali', or: 'Odia', as: 'Assamese',
  ur: 'Urdu', kok: 'Konkani'
};

const BCP47_CODE_MAP = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN',
  gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN', as: 'as-IN',
  ur: 'ur-IN', kok: 'kok-IN'
};

const BCP47_NAME_MAP = {
  'English': 'en-IN', 'Tamil': 'ta-IN', 'Hindi': 'hi-IN',
  'Telugu': 'te-IN', 'Kannada': 'kn-IN', 'Malayalam': 'ml-IN',
  'Marathi': 'mr-IN', 'Bengali': 'bn-IN', 'Gujarati': 'gu-IN',
  'Punjabi': 'pa-IN', 'Odia': 'or-IN', 'Assamese': 'as-IN',
  'Urdu': 'ur-IN', 'Konkani': 'kok-IN'
};

const BCP_TO_LANG_NAME = {
  'ta-IN': 'Tamil', 'hi-IN': 'Hindi', 'te-IN': 'Telugu',
  'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi',
  'bn-IN': 'Bengali', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi',
  'en-IN': 'English', 'or-IN': 'Odia', 'as-IN': 'Assamese', 'ur-IN': 'Urdu'
};

const WAVEFORM_HEIGHTS = [10, 18, 14, 22, 16, 20, 12, 18];

const SUPPORTED_LANGS = ['en', 'ta', 'te', 'ml', 'hi'];

const getNormalizedLangCode = (code) => {
  if (!code) return 'en';
  const prefix = String(code).split('-')[0].toLowerCase();
  return SUPPORTED_LANGS.includes(prefix) ? prefix : (SUPPORTED_LANGS.includes(code) ? code : 'en');
};

const getLangName = (code) => {
  const norm = getNormalizedLangCode(code);
  return LANG_MAP[norm] || 'English';
};

const splitIntoSafeTtsChunks = (text, maxLen = 140) => {
  if (!text || text.length <= maxLen) return [text];
  const chunks = [];
  const regex = /([^,.!?;:।\n]+[,.!?;:।\n]*)/g;
  let current = '';
  let match;
  while ((match = regex.exec(text)) !== null) {
    const part = match[0];
    if ((current + part).length <= maxLen) {
      current += part;
    } else {
      if (current.trim()) chunks.push(current.trim());
      if (part.length > maxLen) {
        const words = part.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).length <= maxLen) {
            sub = sub ? `${sub} ${w}` : w;
          } else {
            if (sub.trim()) chunks.push(sub.trim());
            sub = w;
          }
        }
        if (sub.trim()) current = sub;
        else current = '';
      } else {
        current = part;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
};

const getBcp47Code = (langCode, langName) => {
  const norm = getNormalizedLangCode(langCode);
  if (BCP47_CODE_MAP[norm]) return BCP47_CODE_MAP[norm];
  if (BCP47_CODE_MAP[langCode]) return BCP47_CODE_MAP[langCode];
  return BCP47_NAME_MAP[langName] || 'en-IN';
};

const detectTextLanguage = (text, lang) => {
  const defaultCode = getBcp47Code(lang, getLangName(lang));
  if (!text || !text.trim()) return defaultCode;
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
  if (/[\u0900-\u097F]/.test(text)) {
    if (lang === 'mr' || lang === 'mr-IN') return 'mr-IN';
    if (lang === 'kok' || lang === 'kok-IN') return 'kok-IN';
    return 'hi-IN';
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    if (lang === 'as' || lang === 'as-IN') return 'as-IN';
    return 'bn-IN';
  }
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or-IN';
  if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN';
  // If the user's active language is non-English, do not hijack into English for Latin acronyms (NPK, DAP)
  const normUserLang = getNormalizedLangCode(lang);
  if (normUserLang !== 'en') return defaultCode;
  if (/[a-zA-Z]/.test(text)) return 'en-IN';
  return defaultCode;
};

// Module-level global voice cache — shared & loaded once for maximum startup speed
let globalVoices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() || [] : [];
const globalVoiceCacheMap = new Map();

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const populateVoices = () => {
    const list = window.speechSynthesis.getVoices() || [];
    if (list.length > 0) {
      globalVoices = list;
      globalVoiceCacheMap.clear();
    }
  };
  populateVoices();
  window.speechSynthesis.addEventListener('voiceschanged', populateVoices);
  setTimeout(populateVoices, 0);
  setTimeout(populateVoices, 100);
}

// Module-level pre-warmed audio cache for instant greeting playback
const PREBUFFERED_GREETINGS = {};

const prewarmGreetingAudio = (langCode) => {
  if (typeof window === 'undefined') return null;
  const lang = langCode || 'en';
  if (!PREBUFFERED_GREETINGS[lang]) {
    const text = GREETING_TEXTS[lang] || GREETING_TEXTS['en'];
    if (!text) return null;
    const encoded = encodeURIComponent(text);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = audioUrl;
      audio.load();
      PREBUFFERED_GREETINGS[lang] = audio;
    } catch (e) {}
  }
  return PREBUFFERED_GREETINGS[lang];
};

if (typeof window !== 'undefined') {
  try {
    const currentStoredLang = localStorage.getItem('agrimitra_language') || 'ta';
    prewarmGreetingAudio(currentStoredLang);
    setTimeout(() => {
      ['en', 'ta', 'te', 'ml', 'hi'].forEach(l => {
        if (l !== currentStoredLang) prewarmGreetingAudio(l);
      });
    }, 50);
  } catch (e) {}

  window.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && (
      target.closest('a[href*="ai-assistant"]') ||
      target.closest('[to="/ai-assistant"]') ||
      target.closest('[data-testid="farm-ai-btn"]')
    )) {
      window.__farmAiClickTime = performance.now();
    }
  }, { capture: true, passive: true });
}

export const AIAssistantMain = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang } = useTranslation();
  const { user, getSmartContext, setLatestDiagnosis } = useAppStore();

  const storedLang = typeof window !== 'undefined' ? localStorage.getItem('agrimitra_language') : null;
  const rawLangCode = storedLang || currentLang || user?.languageCode || 'en';
  const activeLangCode = getNormalizedLangCode(rawLangCode);
  const languageName = getLangName(activeLangCode);

  const [voiceState, setVoiceState] = useState('ready'); // ready, listening, connecting, speaking, error
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUserSpeech, setLastUserSpeech] = useState('');
  const [lastAiResponse, setLastAiResponse] = useState('');
  const [activeSpeechLang, setActiveSpeechLang] = useState(activeLangCode);
  const [isRecording, setIsRecording] = useState(false);

  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  const recognitionRef = useRef(null);
  const isRecognitionRunningRef = useRef(false);
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const hasGreetedRef = useRef(false);
  const prevLangRef = useRef(activeLangCode);
  const abortControllerRef = useRef(null);
  const activeRequestIdRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isPlayingQueueRef = useRef(false);
  const isStreamActiveRef = useRef(false);
  const interimTranscriptRef = useRef('');
  const autoListenTimeoutRef = useRef(null);
  const voicesCacheRef = useRef([]);
  const voiceMapCacheRef = useRef(new Map());
  const rafTextUpdateRef = useRef(null);
  const isMountedRef = useRef(true);
  const greetingTimeoutRef = useRef(null);
  const voicesChangedHandlerRef = useRef(null);
  const activeAudioRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const hasRenderedFirstChunkRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch (e) {}
      }
      if (activeAudioRef.current && activeAudioRef.current.paused && voiceStateRef.current === 'speaking') {
        try { activeAudioRef.current.play(); } catch (e) {}
      }
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (location.state?.cropAnalysisContext && typeof setLatestDiagnosis === 'function') {
      setLatestDiagnosis(location.state.cropAnalysisContext);
    }
  }, [location.state, setLatestDiagnosis]);

  const isSessionActive = voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'connecting';

  useEffect(() => {
    if ('speechSynthesis' in window) {
      voicesCacheRef.current = window.speechSynthesis.getVoices() || [];
      const handleVoicesChanged = () => {
        voicesCacheRef.current = window.speechSynthesis.getVoices() || [];
        voiceMapCacheRef.current.clear();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  const getBestVoice = useCallback((langCode) => {
    if (!('speechSynthesis' in window)) return null;
    if (globalVoiceCacheMap.has(langCode)) {
      return globalVoiceCacheMap.get(langCode);
    }

    let voices = globalVoices;
    if (!voices || voices.length === 0) {
      voices = window.speechSynthesis.getVoices() || [];
      globalVoices = voices;
    }
    if (voices.length === 0) return null;

    const prefix = langCode.split('-')[0].toLowerCase();
    const langKeyMap = {
      'ta': ['ta-in', 'ta_in', 'ta', 'tamil', 'தமிழ்', 'pallavi', 'valluvar', 'lekha'],
      'hi': ['hi-in', 'hi_in', 'hi', 'hindi', 'हिन्दी', 'swara', 'madhur', 'hemant', 'kalpana', 'lekha', 'neerja'],
      'te': ['te-in', 'te_in', 'te', 'telugu', 'తెలుగు', 'mohan', 'vani'],
      'kn': ['kn-in', 'kn_in', 'kn', 'kannada', 'ಕನ್ನಡ', 'gagan', 'sapna'],
      'ml': ['ml-in', 'ml_in', 'ml', 'malayalam', 'മലയാളം', 'sobhana', 'midhun'],
      'en': ['en-in', 'en_in', 'en-gb', 'en-us', 'en']
    };

    const keywords = langKeyMap[prefix] || [prefix];
    let selected = null;

    for (const kw of keywords) {
      const match = voices.find(v =>
        v.lang.toLowerCase() === kw ||
        v.lang.toLowerCase().replace('_', '-').startsWith(kw) ||
        v.name.toLowerCase().includes(kw)
      );
      if (match) {
        selected = match;
        break;
      }
    }

    if (!selected) {
      selected = voices.find(v => v.lang.toLowerCase().startsWith(prefix)) || null;
    }

    if (!selected && prefix === 'en') {
      selected = voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    }

    if (selected) {
      globalVoiceCacheMap.set(langCode, selected);
    }
    return selected;
  }, []);

  const clearSpeechQueue = useCallback(() => {
    speechQueueRef.current = [];
    isPlayingQueueRef.current = false;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current.src = '';
      } catch (e) {}
      activeAudioRef.current = null;
    }
    activeUtteranceRef.current = null;
    window.__agriActiveUtterance = null;
    if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }, []);

  const getOrCreateRecognition = useCallback(() => {
    if (!isMountedRef.current) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (!isMountedRef.current) {
          try { recognition.abort(); } catch (e) {}
          return;
        }
        isRecognitionRunningRef.current = true;
        setIsRecording(true);
        setVoiceState('listening');
      };

      recognition.onresult = (e) => {
        if (!isMountedRef.current) return;
        const transcript = Array.from(e.results)
          .map(r => r[0].transcript)
          .join('');

        interimTranscriptRef.current = transcript;

        if (e.results[0] && e.results[0].isFinal) {
          const finalSpeech = transcript.trim();
          interimTranscriptRef.current = '';
          try { recognition.stop(); } catch (err) {}
          isRecognitionRunningRef.current = false;
          setIsRecording(false);
          if (finalSpeech && isMountedRef.current) {
            processFarmerVoiceQuery(finalSpeech);
          }
        }
      };

      recognition.onerror = (e) => {
        isRecognitionRunningRef.current = false;
        setIsRecording(false);
        if (!isMountedRef.current) return;
        console.warn("Speech recognition note:", e.error);
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setErrorMessage(`Voice: ${e.error}`);
        }
        setVoiceState('ready');
      };

      recognition.onend = () => {
        isRecognitionRunningRef.current = false;
        setIsRecording(false);
        if (!isMountedRef.current) return;
        const pending = interimTranscriptRef.current.trim();
        interimTranscriptRef.current = '';
        if (pending && voiceStateRef.current === 'listening') {
          processFarmerVoiceQuery(pending);
        } else if (voiceStateRef.current === 'listening') {
          setVoiceState('ready');
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (err) {
      console.error("Speech recognition initialization failed:", err);
      return null;
    }
  }, []);

  const startListening = useCallback((customLangCode = activeLangCode) => {
    if (!isMountedRef.current) return;
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }

    const recognition = getOrCreateRecognition();
    if (!recognition) {
      setVoiceState('ready');
      return;
    }

    if (isRecognitionRunningRef.current) {
      return;
    }

    try {
      setErrorMessage('');
      recognition.lang = getBcp47Code(customLangCode, LANG_MAP[customLangCode] || languageName);
      recognition.start();
      isRecognitionRunningRef.current = true;
    } catch (err) {
      console.warn("Speech recognition start note:", err.message);
      isRecognitionRunningRef.current = false;
      setIsRecording(false);
      if (isMountedRef.current) {
        setVoiceState('ready');
      }
    }
  }, [activeLangCode, getOrCreateRecognition, languageName]);

  const playGreetingAudioStream = useCallback((text, langCode, onEndCallback, timingInfo = null) => {
    if (!isMountedRef.current) return;
    try {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
          activeAudioRef.current.src = '';
        } catch (e) {}
        activeAudioRef.current = null;
      }

      // Reuse pre-buffered Audio element if ready, otherwise create new
      let audio = PREBUFFERED_GREETINGS[langCode];
      if (!audio || audio.currentTime > 0 || audio.ended) {
        const encoded = encodeURIComponent(text);
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encoded}`;
        audio = new Audio(audioUrl);
        PREBUFFERED_GREETINGS[langCode] = audio;
      } else {
        audio.currentTime = 0;
      }
      activeAudioRef.current = audio;

      let ended = false;
      const handleEnd = () => {
        if (ended) return;
        ended = true;
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        if (isMountedRef.current) {
          setVoiceState('ready');
          if (onEndCallback) onEndCallback();
        }
      };

      audio.onplay = () => {
        if (!isMountedRef.current) {
          try { audio.pause(); } catch (e) {}
          return;
        }
        setVoiceState('speaking');
        if (timingInfo && !timingInfo.recorded) {
          timingInfo.recorded = true;
          const t6 = performance.now();
          const lastTiming = {
            lang: langCode,
            t0: Math.round(timingInfo.t0),
            t1: Math.round(timingInfo.t1),
            t2: Math.round(timingInfo.t2),
            t3: Math.round(timingInfo.t3),
            t4: Math.round(timingInfo.t4),
            t5: Math.round(timingInfo.t5),
            t6: Math.round(t6),
            t0_to_t1: Math.max(0, Math.round(timingInfo.t1 - timingInfo.t0)),
            t1_to_t2: Math.max(0, Math.round(timingInfo.t2 - timingInfo.t1)),
            t2_to_t3: Math.max(0, Math.round(timingInfo.t3 - timingInfo.t2)),
            t3_to_t4: Math.max(0, Math.round(timingInfo.t4 - timingInfo.t3)),
            t4_to_t5: Math.max(0, Math.round(timingInfo.t5 - timingInfo.t4)),
            t5_to_t6: Math.max(0, Math.round(t6 - timingInfo.t5)),
            total_click_to_audio: Math.max(0, Math.round(t6 - timingInfo.t0))
          };
          window.__farmAiLastTiming = lastTiming;
          if (!window.__farmAiTimingHistory) window.__farmAiTimingHistory = [];
          window.__farmAiTimingHistory.push(lastTiming);
          console.log("[FARM AI GREETING TIMING]", lastTiming);
        }
      };

      audio.onended = handleEnd;
      audio.onerror = (e) => {
        console.warn("Audio stream playback note:", e);
        handleEnd();
      };

      setVoiceState('speaking');
      if (timingInfo) {
        timingInfo.t5 = performance.now();
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio stream play catch:", err);
          handleEnd();
        });
      }
    } catch (err) {
      console.warn("playGreetingAudioStream exception:", err);
      if (isMountedRef.current) {
        setVoiceState('ready');
        if (onEndCallback) onEndCallback();
      }
    }
  }, []);

  const playResponseAudioStream = useCallback((text, langCode, onEndCallback) => {
    if (!isMountedRef.current) return;
    const cleanText = text.replace(/[\*#_`~]/g, '').replace(/https?:\/\/\S+/g, '').trim();
    if (!cleanText) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const chunks = splitIntoSafeTtsChunks(cleanText, 140);
    if (!chunks.length) {
      if (onEndCallback) onEndCallback();
      return;
    }

    let currentChunkIndex = 0;

    const playNextChunk = () => {
      if (!isMountedRef.current) return;
      if (currentChunkIndex >= chunks.length) {
        if (onEndCallback) onEndCallback();
        return;
      }

      const chunkText = chunks[currentChunkIndex++];
      const encoded = encodeURIComponent(chunkText);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encoded}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      let ended = false;
      const advance = () => {
        if (ended) return;
        ended = true;
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        playNextChunk();
      };

      audio.onplay = () => {
        if (!isMountedRef.current) {
          try { audio.pause(); } catch (e) {}
          return;
        }
        setVoiceState('speaking');
      };

      audio.onended = advance;
      audio.onerror = (e) => {
        console.warn("Response audio chunk note:", e);
        advance();
      };

      setVoiceState('speaking');
      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn("Response audio play note:", err);
          advance();
        });
      }
    };

    playNextChunk();
  }, []);

  const playNextInQueue = useCallback((lang) => {
    if (!isMountedRef.current) return;
    if (isPlayingQueueRef.current) return;

    if (speechQueueRef.current.length === 0) {
      if (!isStreamActiveRef.current) {
        if (isMountedRef.current) {
          setVoiceState('ready');
        }
        if (autoListenTimeoutRef.current) clearTimeout(autoListenTimeoutRef.current);
        autoListenTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            startListening(lang);
          }
        }, 100);
      }
      return;
    }

    const nextText = speechQueueRef.current.shift();
    if (!nextText || !nextText.trim()) {
      playNextInQueue(lang);
      return;
    }

    const cleanText = nextText.replace(/[\*#_`~]/g, '').replace(/https?:\/\/\S+/g, '').trim();
    if (!cleanText) {
      playNextInQueue(lang);
      return;
    }

    // Anchor language strictly to the user's selected language
    const targetLang = getNormalizedLangCode(lang || activeLangCode);
    const bcpCode = BCP47_CODE_MAP[targetLang] || 'en-IN';
    const langPrefix = targetLang;
    setActiveSpeechLang(bcpCode);

    const finishUtterance = () => {
      isPlayingQueueRef.current = false;
      activeUtteranceRef.current = null;
      window.__agriActiveUtterance = null;
      if (isMountedRef.current) {
        playNextInQueue(lang);
      }
    };

    const bestVoice = getBestVoice(bcpCode);

    // If native voice is missing for non-English and audio stream is available
    if (!bestVoice && langPrefix !== 'en') {
      isPlayingQueueRef.current = true;
      if (voiceStateRef.current !== 'speaking') {
        setVoiceState('speaking');
      }
      playResponseAudioStream(cleanText, langPrefix, finishUtterance);
      return;
    }

    if (!('speechSynthesis' in window)) {
      isPlayingQueueRef.current = true;
      playResponseAudioStream(cleanText, langPrefix, finishUtterance);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = bcpCode;
    if (bestVoice) utterance.voice = bestVoice;

    utterance.volume = 1.0;
    utterance.pitch = 1.0;
    utterance.rate = 1.05;

    activeUtteranceRef.current = utterance;
    window.__agriActiveUtterance = utterance;

    // Safety watchdog timer: prevent queue from permanently locking if onend fails to fire
    const ttsSafetyTimeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (isPlayingQueueRef.current) {
        console.warn("TTS watchdog recovered queue for sentence:", cleanText.substring(0, 30));
        finishUtterance();
      }
    }, Math.max(8000, cleanText.length * 150));

    const handleSpeechEnd = () => {
      clearTimeout(ttsSafetyTimeout);
      finishUtterance();
    };

    utterance.onstart = () => {
      if (!isMountedRef.current) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        return;
      }
      isPlayingQueueRef.current = true;
      if (voiceStateRef.current !== 'speaking') {
        setVoiceState('speaking');
      }
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      clearTimeout(ttsSafetyTimeout);
      console.warn("TTS utterance note:", e?.error || e);
      if (isMountedRef.current && (e?.error === 'language-unavailable' || e?.error === 'synthesis-failed')) {
        playResponseAudioStream(cleanText, langPrefix, finishUtterance);
      } else {
        finishUtterance();
      }
    };

    isPlayingQueueRef.current = true;
    if (voiceStateRef.current !== 'speaking') {
      setVoiceState('speaking');
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  }, [activeLangCode, getBestVoice, playResponseAudioStream, startListening]);

  const queueSentenceForSpeech = useCallback((sentence, lang, requestId) => {
    if (!isMountedRef.current || activeRequestIdRef.current !== requestId) return;
    speechQueueRef.current.push(sentence);
    playNextInQueue(lang);
  }, [playNextInQueue]);

  const speakGreeting = useCallback((targetLangCode = activeLangCode) => {
    if (!isMountedRef.current) return;

    const tStart = performance.now();
    const t0 = window.__farmAiClickTime ? window.__farmAiClickTime : tStart;
    const t1 = tStart;

    const lang = targetLangCode || activeLangCode || 'en';
    const t2 = performance.now();

    const text = GREETING_TEXTS[lang] || GREETING_TEXTS['en'];
    const t3 = performance.now();

    if (!text) {
      setVoiceState('ready');
      startListening(lang);
      return;
    }

    const bcpCode = BCP47_CODE_MAP[lang] || detectTextLanguage(text, lang) || 'en-IN';
    setActiveSpeechLang(bcpCode);

    const onGreetingComplete = () => {
      if (!isMountedRef.current) return;
      setVoiceState('ready');
      if (autoListenTimeoutRef.current) clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          startListening(lang);
        }
      }, 200);
    };

    if (!('speechSynthesis' in window)) {
      setVoiceState('ready');
      setTimeout(() => { if (isMountedRef.current) startListening(lang); }, 200);
      return;
    }

    const doSpeak = () => {
      if (!isMountedRef.current) return;

      const voice = getBestVoice(bcpCode);
      const t4 = performance.now();
      const timingInfo = { t0, t1, t2, t3, t4, t5: 0, recorded: false };

      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcpCode;

      if (voice) {
        utterance.voice = voice;
        if (voice.lang) utterance.lang = voice.lang;
      }

      utterance.volume = 1.0;
      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      activeUtteranceRef.current = utterance;
      window.__agriActiveUtterance = utterance;

      utterance.onstart = () => {
        if (!isMountedRef.current) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          return;
        }
        setVoiceState('speaking');
        if (!timingInfo.recorded) {
          timingInfo.recorded = true;
          const t6 = performance.now();
          const lastTiming = {
            lang,
            t0: Math.round(timingInfo.t0),
            t1: Math.round(timingInfo.t1),
            t2: Math.round(timingInfo.t2),
            t3: Math.round(timingInfo.t3),
            t4: Math.round(timingInfo.t4),
            t5: Math.round(timingInfo.t5),
            t6: Math.round(t6),
            t0_to_t1: Math.max(0, Math.round(timingInfo.t1 - timingInfo.t0)),
            t1_to_t2: Math.max(0, Math.round(timingInfo.t2 - timingInfo.t1)),
            t2_to_t3: Math.max(0, Math.round(timingInfo.t3 - timingInfo.t2)),
            t3_to_t4: Math.max(0, Math.round(timingInfo.t4 - timingInfo.t3)),
            t4_to_t5: Math.max(0, Math.round(timingInfo.t5 - timingInfo.t4)),
            t5_to_t6: Math.max(0, Math.round(t6 - timingInfo.t5)),
            total_click_to_audio: Math.max(0, Math.round(t6 - timingInfo.t0))
          };
          window.__farmAiLastTiming = lastTiming;
          if (!window.__farmAiTimingHistory) window.__farmAiTimingHistory = [];
          window.__farmAiTimingHistory.push(lastTiming);
          console.log("[FARM AI GREETING TIMING]", lastTiming);
        }
      };

      utterance.onend = () => {
        activeUtteranceRef.current = null;
        window.__agriActiveUtterance = null;
        onGreetingComplete();
      };

      utterance.onerror = (e) => {
        activeUtteranceRef.current = null;
        window.__agriActiveUtterance = null;
        console.warn("Greeting speech synthesis note:", e?.error || e);
        if (isMountedRef.current) {
          onGreetingComplete();
        }
      };

      setVoiceState('speaking');
      timingInfo.t5 = performance.now();

      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch (e) {}
      }

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Greeting speak() threw:", err);
        onGreetingComplete();
      }
    }; // end doSpeak

    // ------------------------------------------------------------------
    // Voice readiness strategy:
    // Chrome loads voices asynchronously. On first mount, getVoices() may
    // return []. We wait for voiceschanged (up to 800ms) and then speak.
    // After the 800ms fallback we speak regardless — Chrome will still use
    // utterance.lang to synthesise the correct language.
    // ------------------------------------------------------------------
    const voicesNow = window.speechSynthesis.getVoices();
    if (voicesNow && voicesNow.length > 0) {
      // Voices already available — speak immediately
      doSpeak();
    } else {
      // Voices not yet loaded — wait for voiceschanged then speak
      let fired = false;
      const onVoicesReady = () => {
        if (fired) return;
        fired = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesReady);
        if (isMountedRef.current) doSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesReady);
      // Safety fallback: speak after 800ms even if voiceschanged never fires
      const fbTimer = setTimeout(() => {
        if (!fired) {
          fired = true;
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesReady);
          if (isMountedRef.current) doSpeak();
        }
      }, 800);
      greetingTimeoutRef.current = fbTimer;
    }
  }, [activeLangCode, getBestVoice, startListening]);

  const stopAllVoiceOperations = useCallback(() => {
    activeRequestIdRef.current = null;
    isStreamActiveRef.current = false;
    interimTranscriptRef.current = '';
    isRecognitionRunningRef.current = false;
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current);
      greetingTimeoutRef.current = null;
    }
    if (rafTextUpdateRef.current) {
      cancelAnimationFrame(rafTextUpdateRef.current);
      rafTextUpdateRef.current = null;
    }
    clearSpeechQueue();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
      abortControllerRef.current = null;
    }
    setIsRecording(false);
    setVoiceState('ready');
  }, [clearSpeechQueue]);

  const speakAssistantResponse = useCallback((text, lang) => {
    if (!isMountedRef.current) return;
    clearSpeechQueue();
    if (!text) return;
    isStreamActiveRef.current = false;
    speechQueueRef.current.push(text);
    playNextInQueue(lang);
  }, [clearSpeechQueue, playNextInQueue]);

  useLayoutEffect(() => {
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      prevLangRef.current = activeLangCode;
      speakGreeting(activeLangCode);
    } else if (prevLangRef.current !== activeLangCode) {
      prevLangRef.current = activeLangCode;
      stopAllVoiceOperations();
      speakGreeting(activeLangCode);
    }
  }, [activeLangCode, speakGreeting, stopAllVoiceOperations]);

  // Primary Voice Lifecycle & Safety Teardown Hook (Hard Maximum 10-Second Guarantee)
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      // 1. Mark component as unmounted immediately
      isMountedRef.current = false;

      // 2. Stop all voice operations synchronously
      stopAllVoiceOperations();

      // 3. Remove pending voiceschanged listener if registered
      if (voicesChangedHandlerRef.current && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandlerRef.current);
        voicesChangedHandlerRef.current = null;
      }

      // 4. Guaranteed immediate cancel of native speech synthesis
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      // 5. Hard Maximum 10-Second Safety Guarantee:
      // Active watchdog monitor for up to 10 seconds to ensure any lagging native synthesis cancels
      let checks = 0;
      const safetyWatchdog = setInterval(() => {
        checks++;
        if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
          try {
            window.speechSynthesis.cancel();
          } catch (e) {}
        }
        if (checks >= 20) { // 20 * 500ms = 10.0 seconds maximum safety ceiling
          clearInterval(safetyWatchdog);
        }
      }, 500);
    };
  }, [stopAllVoiceOperations]);

  const handleStop = () => {
    stopAllVoiceOperations();
  };

  const resetConversation = async () => {
    stopAllVoiceOperations();
    setLastUserSpeech('');
    setLastAiResponse('');
    setVoiceState('ready');
    setErrorMessage('');

    if (sessionIdRef.current) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://agrimitra-ai-l207.onrender.com' : 'http://localhost:8000');
        await fetch(`${API_BASE_URL}/api/assistant/session/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionIdRef.current })
        });
      } catch (e) {}
    }
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    speakGreeting(activeLangCode);
  };

  const processFarmerVoiceQuery = useCallback(async (userSpokenText) => {
    if (!isMountedRef.current || !userSpokenText || !userSpokenText.trim()) return;

    stopAllVoiceOperations();
    setErrorMessage('');
    setLastUserSpeech(userSpokenText);

    const currentRequestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    activeRequestIdRef.current = currentRequestId;
    isStreamActiveRef.current = true;
    hasRenderedFirstChunkRef.current = false;

    const targetLangCode = getNormalizedLangCode(activeLangCode);
    const selectedLanguageName = getLangName(targetLangCode);

    setVoiceState('connecting');
    const context = getSmartContext ? getSmartContext() : null;

    let responseText = '';
    let success = false;
    let spokenIndex = 0;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://agrimitra-ai-l207.onrender.com' : 'http://localhost:8000');
      const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          message: userSpokenText,
          language: selectedLanguageName,
          session_id: sessionIdRef.current,
          context: context || {
            state: 'Tamil Nadu',
            district: 'Thanjavur',
            crop: 'Unknown'
          }
        })
      });

      if (!isMountedRef.current || activeRequestIdRef.current !== currentRequestId) return;

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let currentText = "";
        let streamError = "";
        let buffer = "";

        while (!done) {
          if (!isMountedRef.current || activeRequestIdRef.current !== currentRequestId) {
            try { reader.cancel(); } catch (e) {}
            break;
          }
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (!isMountedRef.current || activeRequestIdRef.current !== currentRequestId) {
            try { reader.cancel(); } catch (e) {}
            break;
          }
          if (value) {
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6);
                if (dataStr.trim() === '[DONE]') continue;
                try {
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj.error) {
                    streamError = dataObj.error;
                    if (isMountedRef.current) {
                      setErrorMessage(dataObj.error);
                    }
                  } else if (dataObj.text) {
                    currentText += dataObj.text;
                    if (isMountedRef.current && activeRequestIdRef.current === currentRequestId) {
                      if (!hasRenderedFirstChunkRef.current) {
                        hasRenderedFirstChunkRef.current = true;
                        setLastAiResponse(currentText);
                      } else if (!rafTextUpdateRef.current) {
                        const textToRender = currentText;
                        rafTextUpdateRef.current = requestAnimationFrame(() => {
                          rafTextUpdateRef.current = null;
                          if (isMountedRef.current && activeRequestIdRef.current === currentRequestId) {
                            setLastAiResponse(textToRender);
                          }
                        });
                      }

                      const unstreamed = currentText.substring(spokenIndex);
                      const sentenceRegex = /([^.!?।|\n]+[.!?।|\n]+)/g;
                      let match;
                      let lastMatchedEnd = 0;
                      while ((match = sentenceRegex.exec(unstreamed)) !== null) {
                        const sentence = match[0];
                        if (sentence.trim()) {
                          queueSentenceForSpeech(sentence.trim(), targetLangCode, currentRequestId);
                        }
                        lastMatchedEnd = sentenceRegex.lastIndex;
                      }
                      if (lastMatchedEnd > 0) {
                        spokenIndex += lastMatchedEnd;
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }

        if (rafTextUpdateRef.current) {
          cancelAnimationFrame(rafTextUpdateRef.current);
          rafTextUpdateRef.current = null;
        }

        if (isMountedRef.current && activeRequestIdRef.current === currentRequestId) {
          if (currentText) {
            setLastAiResponse(currentText);
            responseText = currentText;
            success = true;
            isStreamActiveRef.current = false;

            const remaining = currentText.substring(spokenIndex).trim();
            if (remaining) {
              queueSentenceForSpeech(remaining, targetLangCode, currentRequestId);
            } else if (speechQueueRef.current.length === 0 && !isPlayingQueueRef.current) {
              setVoiceState('ready');
              if (autoListenTimeoutRef.current) clearTimeout(autoListenTimeoutRef.current);
              autoListenTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  startListening(targetLangCode);
                }
              }, 100);
            }
          } else {
            // Stream finished without yielding any text
            isStreamActiveRef.current = false;
            setVoiceState('ready');
            if (!streamError) {
              setErrorMessage("Unable to get response from AgriMitra. Please try speaking again.");
            }
          }
        }
      } else {
        if (isMountedRef.current) {
          const errData = await response.json().catch(() => ({}));
          setErrorMessage(errData.detail || `Assistant server returned HTTP ${response.status}`);
          setVoiceState('ready');
        }
      }
    } catch (err) {
      if (isMountedRef.current && err.name !== 'AbortError' && activeRequestIdRef.current === currentRequestId) {
        console.warn("Assistant voice endpoint error:", err);
        setErrorMessage(err.message || 'Failed to connect to assistant service');
        setVoiceState('ready');
      }
    } finally {
      if (isMountedRef.current && activeRequestIdRef.current === currentRequestId && voiceStateRef.current === 'connecting') {
        setVoiceState('ready');
      }
    }

    if (isMountedRef.current && success && responseText && activeRequestIdRef.current === currentRequestId) {
      if (user?.uid) {
        addDoc(collection(db, 'ai_chat_history'), {
          userId: user.uid,
          userPrompt: userSpokenText,
          aiResponse: responseText,
          language: selectedLanguageName,
          location: `${context?.district || 'Thanjavur'}, ${context?.state || 'Tamil Nadu'}`,
          createdAt: serverTimestamp()
        }).catch(e => {
          console.warn('Firestore voice log warning:', e);
        });
      }
    }
  }, [activeLangCode, getSmartContext, queueSentenceForSpeech, startListening, stopAllVoiceOperations, user?.uid]);

  useEffect(() => {
    window.__farmAiQuery = processFarmerVoiceQuery;
    return () => {
      window.__farmAiQuery = null;
    };
  }, [processFarmerVoiceQuery]);

  const toggleMic = useCallback(() => {
    if (!isMountedRef.current) return;
    if (voiceState === 'speaking' || voiceState === 'connecting') {
      stopAllVoiceOperations();
      startListening(activeLangCode);
      return;
    }

    if (isRecording || voiceState === 'listening' || isRecognitionRunningRef.current) {
      const pendingSpeech = interimTranscriptRef.current.trim();
      if (pendingSpeech) {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
        }
        isRecognitionRunningRef.current = false;
        setIsRecording(false);
        processFarmerVoiceQuery(pendingSpeech);
        return;
      }
      stopAllVoiceOperations();
      return;
    }

    stopAllVoiceOperations();
    startListening(activeLangCode);
  }, [activeLangCode, isRecording, processFarmerVoiceQuery, startListening, stopAllVoiceOperations, voiceState]);

  const statusTexts = STATUS_TEXTS[activeLangCode] || STATUS_TEXTS['ta'] || STATUS_TEXTS['en'];

  const getStatusDisplayLabel = () => {
    switch (voiceState) {
      case 'listening': return statusTexts.listening;
      case 'connecting': return statusTexts.connecting;
      case 'speaking': return statusTexts.speaking;
      case 'ready':
      default: return statusTexts.ready;
    }
  };

  const currentDefaultGreeting = GREETING_TEXTS[activeLangCode] || GREETING_TEXTS['ta'] || GREETING_TEXTS['en'];

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-130px)] font-sans flex flex-col justify-between overflow-hidden select-none pb-2">
      
      {/* 1. Full-Screen Background Image (Exact Reference Background) */}
      <div className="absolute inset-0 z-0">
        <img
          src="/farm-ai-assets/bg_farmer.webp"
          alt="Farmland Farmer"
          className="w-full h-full object-cover object-[25%_top] scale-[1.02]"
        />
        {/* Soft vignette overlay for crisp contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/75 pointer-events-none" />
      </div>

      {/* 2. Top Controls inside Farm AI Center Area */}
      <div className="relative z-20 w-full flex items-center justify-between px-4 pt-3">
        {/* SINGLE Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-gray-900 text-xs font-extrabold shadow-md backdrop-blur-md transition active:scale-95 cursor-pointer border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4 text-gray-800" />
          <span>Back</span>
        </button>

        {/* TOP REFRESH / RESTART CONTROL */}
        <button
          onClick={resetConversation}
          title="Refresh & Restart Voice Session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#0D5C2E] text-xs font-extrabold shadow-md backdrop-blur-md transition active:scale-95 cursor-pointer border border-emerald-200"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0D5C2E]" />
          <span>Reset</span>
        </button>
      </div>

      {/* Error Toast if Present */}
      {errorMessage && (
        <div className="relative z-30 px-4 w-full max-w-md mx-auto mt-2">
          <div className="bg-red-600/95 backdrop-blur-md px-3.5 py-2 rounded-2xl text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* 3. Center Branding Header */}
      <div className="relative z-20 flex flex-col items-center justify-center pt-2 text-center">
        {/* Circular White Leaf Icon Badge */}
        <div className="w-13 h-13 rounded-full bg-white flex items-center justify-center shadow-xl border border-emerald-100 mb-2">
          <Leaf className="w-6.5 h-6.5 text-emerald-600 fill-emerald-600/20" />
        </div>

        {/* AgriMitra AI Title + Green Status Dot */}
        <h1 className="text-white font-extrabold text-xl tracking-tight flex items-center gap-2 drop-shadow-md">
          <span>AgriMitra AI</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
        </h1>

        {/* Status Subtitle */}
        <p className="text-emerald-100 text-xs font-semibold mt-0.5 tracking-wide drop-shadow-sm">
          {getStatusDisplayLabel()}
        </p>

        {/* Small Animated Audio Waveform below Listening status */}
        <div className="flex items-center justify-center gap-1 h-5 mt-1.5">
          {WAVEFORM_HEIGHTS.map((h, idx) => (
            <div
              key={idx}
              className="w-0.75 bg-emerald-400/90 rounded-full transition-all duration-200"
              style={{
                height: isSessionActive ? `${h}px` : '5px',
                animation: isSessionActive ? `pulse 0.${(idx % 4) + 6}s ease-in-out infinite alternate` : 'none'
              }}
            />
          ))}
        </div>
      </div>

      {/* 4. SIMPLE, FAMILIAR & RECOGNIZABLE MICROPHONE */}
      <div className="relative z-20 flex flex-col items-center justify-center my-2 w-full px-4 text-center">
        
        {/* Simple, Natural-sized Microphone Button */}
        <div className="relative flex flex-col items-center justify-center">
          <button
            onClick={toggleMic}
            className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl cursor-pointer ${
              voiceState === 'listening'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-300/80 animate-pulse scale-105'
                : voiceState === 'speaking'
                ? 'bg-teal-600 text-white ring-4 ring-teal-300/80 scale-105'
                : voiceState === 'connecting'
                ? 'bg-amber-600 text-white ring-4 ring-amber-300/80'
                : 'bg-[#15803D] hover:bg-[#166534] text-white border-2 border-emerald-300/80 hover:scale-105'
            }`}
            aria-label="Toggle Microphone"
          >
            {voiceState === 'speaking' ? (
              <Volume2 className="w-10 h-10 animate-bounce" />
            ) : (
              <Mic className={`w-10 h-10 ${voiceState === 'listening' ? 'animate-pulse' : ''}`} />
            )}
          </button>

          {/* Simple Status Label under microphone */}
          <span className="text-white text-xs font-bold tracking-wide mt-2 bg-black/60 px-3 py-1 rounded-full border border-white/20 shadow-sm">
            {getStatusDisplayLabel()}
          </span>
        </div>

        {/* Interrupt/Stop Button if active */}
        {isSessionActive && (
          <button
            onClick={handleStop}
            className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/90 hover:bg-red-700 active:scale-95 transition text-white text-xs font-bold rounded-full shadow-lg border border-red-400/50 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop Conversation</span>
          </button>
        )}

      </div>

      {/* 5. CONVERSATION CONTENT BOX — POSITIONED HIGHER TO PREVENT CLIPPING */}
      <div className="w-full max-w-sm mx-auto mt-1 mb-8 sm:mb-12 px-4 z-30">
        <div className="bg-black/85 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 text-left">
          
          {/* Box Header Badge & Audio Replay Button */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                {activeLangCode === 'ta' ? 'அக்ரிமித்ரா AI உரையாடல்' : 'AgriMitra AI Conversation'}
              </span>
            </div>
            <button
              onClick={() => speakAssistantResponse(lastAiResponse || currentDefaultGreeting, activeSpeechLang)}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-full text-[10.5px] font-bold transition active:scale-95 cursor-pointer border border-emerald-400/30"
            >
              <Headphones className="w-3 h-3" />
              <span>Replay</span>
            </button>
          </div>

          {/* Live Dialogue Stream Area */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto hide-scrollbar pr-1">
            
            {/* 1. Existing Default Greeting / Current AI Initial Statement */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wide">
                Farm AI (அக்ரிமித்ரா)
              </span>
              <p className="text-white/95 text-xs font-medium leading-relaxed bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/30">
                {currentDefaultGreeting}
              </p>
            </div>

            {/* 2. User Live Spoken Speech Box (if spoken or currently transcribing) */}
            {(lastUserSpeech || (voiceState === 'listening' && interimTranscriptRef.current)) && (
              <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wide flex items-center justify-between">
                  <span>You (நீங்கள்)</span>
                  {voiceState === 'listening' && <span className="text-emerald-400 text-[9px] animate-pulse">Listening...</span>}
                </span>
                <p className="text-white text-xs font-semibold leading-relaxed bg-black/60 p-2.5 rounded-xl border border-amber-400/40">
                  "{lastUserSpeech || interimTranscriptRef.current}"
                </p>
              </div>
            )}

            {/* 3. Farm AI Actual Response Box (if responding or connecting) */}
            {(lastAiResponse || voiceState === 'connecting' || (voiceState === 'speaking' && lastAiResponse)) && (
              <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wide">
                  Farm AI Response
                </span>
                <div className="text-white text-xs font-medium leading-relaxed bg-emerald-900/90 p-2.5 rounded-xl border border-emerald-400/50">
                  {voiceState === 'connecting' ? (
                    <span className="text-emerald-200 animate-pulse">Thinking & Analyzing your query...</span>
                  ) : (
                    lastAiResponse
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>



      {/* 7. Ambient SVG Wave Lines Accent */}
      <div className="relative z-10 w-full overflow-hidden leading-none -mb-1 opacity-70">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8">
          <path
            d="M0,40 C150,90 350,0 500,50 C650,100 900,10 1200,45"
            fill="none"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M0,60 C200,20 450,80 700,30 C950,-10 1100,70 1200,50"
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

class AssistantErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error?.message || 'An unexpected error occurred in Farm AI.' };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Farm AI Error Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center bg-white rounded-2xl border border-amber-200 shadow-sm max-w-md mx-auto my-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700 font-bold">!</div>
          <h3 className="text-base font-bold text-gray-800">AgriMitra Farm AI</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            {this.state.errorInfo || "Farm AI encountered an issue. Click below to try again."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-[#16803C] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#0B4D2F] transition"
          >
            Reopen Voice Assistant
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AIAssistant = (props) => (
  <AssistantErrorBoundary>
    <AIAssistantMain {...props} />
  </AssistantErrorBoundary>
);

export default AIAssistant;
