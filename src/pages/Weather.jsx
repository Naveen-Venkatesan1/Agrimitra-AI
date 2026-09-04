import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Sun, CloudSun, CloudRain, Wind, Droplets, MapPin, 
  RefreshCw, ShieldAlert, Cloud, CloudLightning,
  AlertCircle, X, Sprout,
  ChevronRight, Volume2, Square, CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { acquireLocation, fetchRealWeatherByCoords, getWeatherConditionAsset } from '../services/api/weatherLocationService';
import { db, doc, onSnapshot, auth } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';

/**
 * Weather Icon mapper based on condition keywords
 */
const getWeatherIcon = (condition, className = "w-8 h-8") => {
  if (!condition) return <Cloud className={`${className} text-gray-400`} />;
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return <CloudLightning className={`${className} text-indigo-500`} />;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return <CloudRain className={`${className} text-blue-500`} />;
  if (c.includes('cloud') || c.includes('overcast')) return <CloudSun className={`${className} text-amber-500`} />;
  if (c.includes('clear') || c.includes('sun')) return <Sun className={`${className} text-amber-500 fill-amber-400`} />;
  return <CloudSun className={`${className} text-amber-500`} />;
};

/**
 * 5-Language UI Dictionary strictly for Tamil, English, Telugu, Malayalam, Hindi
 */
const UI_TEXT = {
  todays_farm_plan: {
    en: "Today's Farm Plan",
    ta: "இன்றைய விவசாய திட்டம்",
    te: "నేటి వ్యవసాయ ప్రణాళిక",
    ml: "ഇന്നത്തെ കാർഷിക പദ്ധതി",
    hi: "आज की कृषि योजना"
  },
  what_is_happening: {
    en: "What is happening?",
    ta: "இப்போது என்ன நடக்கிறது?",
    te: "ప్రస్తుత పరిస్థితి ఏమిటి?",
    ml: "ഇപ്പോൾ എന്ത് സംഭവിക്കുന്നു?",
    hi: "अभी क्या स्थिति है?"
  },
  what_should_i_do: {
    en: "What should I do?",
    ta: "நான் என்ன செய்ய வேண்டும்?",
    te: "నేను ఏమి చేయాలి?",
    ml: "ഞാൻ എന്ത് ചെയ്യണം?",
    hi: "मुझे क्या करना चाहिए?"
  },
  what_should_i_avoid: {
    en: "What should I avoid?",
    ta: "நான் எதைத் தவிர்க்க வேண்டும்?",
    te: "నేను ఏమి నివారించాలి?",
    ml: "ഞാൻ എന്താണ് ഒഴിവാക്കേണ്ടത്?",
    hi: "मुझे क्या नहीं करना चाहिए?"
  },
  best_time_window: {
    en: "Best Time Window",
    ta: "சிறந்த வேலை நேரம்",
    te: "అనుకూలమైన సమయం",
    ml: "ഏറ്റവും അനുയോജ്യമായ സമയം",
    hi: "सबसे उपयुक्त समय"
  },
  why: {
    en: "Why?",
    ta: "ஏன்?",
    te: "ఎందుకు?",
    ml: "എന്തുകൊണ്ട്?",
    hi: "क्यों?"
  },
  listen: {
    en: "Listen",
    ta: "கேளுங்கள்",
    te: "వినండి",
    ml: "കേൾക്കുക",
    hi: "सुनें"
  },
  stop: {
    en: "Stop",
    ta: "நிறுத்து",
    te: "ఆపండి",
    ml: "നിർത്തുക",
    hi: "रोकें"
  },
  supporting_actions: {
    en: "Supporting Actions",
    ta: "துணைப் பரிந்துரைகள்",
    te: "అనుబంధ చర్యలు",
    ml: "അനുബന്ധ നിർദ്ദേശങ്ങൾ",
    hi: "सहायक कार्य"
  },
  current_conditions: {
    en: "Current Conditions",
    ta: "தற்போதைய வானிலை",
    te: "ప్రస్తుత వాతావరణం",
    ml: "നിലവിലെ കാലാവസ്ഥ",
    hi: "वर्तमान मौसम"
  },
  live_data: {
    en: "Live Data",
    ta: "நேரடித் தரவு",
    te: "లైవ్ డేటా",
    ml: "തത്സമയ വിവരം",
    hi: "लाइव डेटा"
  },
  feels_like: {
    en: "Feels like",
    ta: "உணர்வு",
    te: "అనిపించే ఉష్ణోగ్రత",
    ml: "തോന്നുന്ന ചൂട്",
    hi: "महसूस होता है"
  },
  rain: {
    en: "Rain",
    ta: "மழை",
    te: "వర్షం",
    ml: "മഴ",
    hi: "बारिश"
  },
  humid: {
    en: "Humid",
    ta: "ஈரப்பதம்",
    te: "తేమ",
    ml: "ഈർപ്പം",
    hi: "नमी"
  },
  wind_unit: {
    en: "km/h",
    ta: "கி.மீ/ம",
    te: "కి.మీ/గం",
    ml: "കി.മീ/മ",
    hi: "किमी/घंटा"
  },
  seven_day_forecast: {
    en: "7-Day Forecast",
    ta: "7-நாள் கணிப்பு",
    te: "7 రోజుల అంచనా",
    ml: "7 ദിവസത്തെ പ്രവചനം",
    hi: "7-दिवसीय पूर्वानुमान"
  },
  view_all: {
    en: "View All",
    ta: "அனைத்தையும் காட்டு",
    te: "అన్నీ చూడండి",
    ml: "എല്ലാം കാണുക",
    hi: "सभी देखें"
  },
  today: {
    en: "Today",
    ta: "இன்று",
    te: "ఈరోజు",
    ml: "ഇന്ന്",
    hi: "आज"
  },
  analyzing_weather: {
    en: "Analyzing Field Weather...",
    ta: "வானிலை தரவுகள் ஆய்வு செய்யப்படுகின்றன...",
    te: "వాతావరణాన్ని విశ్లేషిస్తోంది...",
    ml: "കാലാവസ്ഥ വിശകലനം ചെയ്യുന്നു...",
    hi: "मौसम का विश्लेषण हो रहा है..."
  },
  retry: {
    en: "Retry Connection",
    ta: "மீண்டும் முயற்சிக்கவும்",
    te: "మళ్లీ ప్రయత్నించండి",
    ml: "വീണ്ടും ശ്രമിക്കുക",
    hi: "पुनः प्रयास करें"
  }
};

/**
 * 5-Language Day Names
 */
const DAY_NAMES = {
  Sun: { en: "Sun", ta: "ஞாயிறு", te: "ఆది", ml: "ഞായർ", hi: "रवि" },
  Mon: { en: "Mon", ta: "திங்கள்", te: "సోమ", ml: "തിങ്കൾ", hi: "सोम" },
  Tue: { en: "Tue", ta: "செவ்வாய்", te: "మంగళ", ml: "ചൊവ്വ", hi: "मंगल" },
  Wed: { en: "Wed", ta: "புதன்", te: "బుధ", ml: "ബുധൻ", hi: "बुध" },
  Thu: { en: "Thu", ta: "வியாழன்", te: "గురు", ml: "വ്യാഴം", hi: "गुरु" },
  Fri: { en: "Fri", ta: "வெள்ளி", te: "శుక్ర", ml: "വെള്ളി", hi: "शुक्र" },
  Sat: { en: "Sat", ta: "சனி", te: "శని", ml: "ശനി", hi: "शनि" }
};

export const Weather = () => {
  const { 
    user, 
    selectedState = "Tamil Nadu", 
    selectedDistrict = "Thanjavur" 
  } = useAppStore();

  const { currentLang = 'ta' } = useTranslation();
  const activeLang = ['ta', 'en', 'te', 'ml', 'hi'].includes(currentLang) ? currentLang : 'en';

  const cropContext = useMemo(() => {
    const crop = user?.primaryCrop || user?.crop || null;
    const cropStage = user?.cropStage || null;
    const variety = user?.cropVariety || null;
    return (crop || cropStage) ? { crop, cropStage, variety } : null;
  }, [user?.primaryCrop, user?.crop, user?.cropStage, user?.cropVariety]);

  const [locInfo, setLocInfo] = useState({
    status: 'INITIAL',
    lat: null,
    lon: null,
    locationName: `${selectedDistrict}, ${selectedState}`,
    isGps: false,
    message: ''
  });

  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dismissedNotice, setDismissedNotice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

  // Sequence ID to prevent stale network response overwriting newer district selections
  const latestRequestIdRef = useRef(0);

  // Live Agro Monitoring Soil Moisture Sensor state
  const [sensorData, setSensorData] = useState({
    soilMoisture: null,
    isAvailable: false,
    isStale: false,
    timestamp: null
  });

  // Real-time Firestore subscription to sensor_readings/latest
  useEffect(() => {
    let unsubscribe = null;

    const initSensorListener = async () => {
      if (auth && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Firebase anonymous authentication notice:", e);
        }
      }

      try {
        if (db) {
          const sensorDocRef = doc(db, 'sensor_readings', 'latest');
          unsubscribe = onSnapshot(
            sensorDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const rawSM = data.soil_moisture_percent ?? data.soil_moisture ?? null;
                const smNum = rawSM != null && !isNaN(Number(rawSM)) ? Number(rawSM) : null;

                let isStale = false;
                let readingDate = null;

                if (data.timestamp) {
                  if (typeof data.timestamp?.toDate === 'function') {
                    readingDate = data.timestamp.toDate();
                  } else if (typeof data.timestamp === 'number') {
                    readingDate = data.timestamp > 1e11 ? new Date(data.timestamp) : (data.timestamp > 1e9 ? new Date(data.timestamp * 1000) : null);
                  } else if (typeof data.timestamp === 'string' && data.timestamp.includes('-')) {
                    readingDate = new Date(data.timestamp);
                  }
                }

                if (readingDate && !isNaN(readingDate.getTime())) {
                  const ageHours = (Date.now() - readingDate.getTime()) / (1000 * 60 * 60);
                  if (ageHours > 24 || ageHours < 0) {
                    isStale = true;
                  }
                }

                setSensorData({
                  soilMoisture: smNum,
                  isAvailable: smNum != null && !isStale,
                  isStale,
                  timestamp: readingDate
                });
              } else {
                setSensorData({
                  soilMoisture: null,
                  isAvailable: false,
                  isStale: false,
                  timestamp: null
                });
              }
            },
            (err) => {
              console.warn("Firestore sensor_readings/latest subscription notice:", err);
              setSensorData({
                soilMoisture: null,
                isAvailable: false,
                isStale: false,
                timestamp: null
              });
            }
          );
        }
      } catch (e) {
        console.warn("Firestore sensor listener init notice:", e);
      }
    };

    initSensorListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch live weather data for given coordinates
  const loadWeatherForCoords = useCallback(async (lat, lon, locName, isSilent = false) => {
    const requestId = ++latestRequestIdRef.current;

    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    const res = await fetchRealWeatherByCoords(lat, lon, locName, cropContext);

    // If another request was triggered while waiting, ignore this stale response
    if (requestId !== latestRequestIdRef.current) return;

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setWeatherData(res.weather);
      setLastUpdatedTime(new Date());
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [cropContext]);

  // Initialize weather when district or state changes
  const initWeather = useCallback(async (forceGps = false) => {
    if (!forceGps) setIsLoading(true);

    const loc = await acquireLocation(selectedState, selectedDistrict, forceGps);
    setLocInfo(loc);
    setDismissedNotice(false);

    await loadWeatherForCoords(loc.lat, loc.lon, loc.locationName, false);
  }, [selectedState, selectedDistrict, loadWeatherForCoords]);

  // Immediate District-Wise Weather Fetch upon selection
  useEffect(() => {
    initWeather(false);
  }, [initWeather]);

  // Automatic 15-Minute Background Weather Refresh (900,000 ms)
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

    const intervalId = setInterval(() => {
      if (locInfo.lat && locInfo.lon) {
        loadWeatherForCoords(locInfo.lat, locInfo.lon, locInfo.locationName, true);
      } else {
        initWeather(false);
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [locInfo.lat, locInfo.lon, locInfo.locationName, initWeather, loadWeatherForCoords]);

  const handleRefresh = () => {
    if (locInfo.lat && locInfo.lon) {
      loadWeatherForCoords(locInfo.lat, locInfo.lon, locInfo.locationName, true);
    } else {
      initWeather(false);
    }
  };

  const current = weatherData?.current;
  const forecastDays = weatherData?.dailyForecast || [];
  const todayFarmAction = weatherData?.todayFarmAction;
  const cropName = weatherData?.cropName;
  const cropStage = weatherData?.cropStage;

  const formattedTime = useMemo(() => {
    try {
      return (lastUpdatedTime || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '12:00 PM';
    }
  }, [lastUpdatedTime]);

  // Combined Weather + Live Soil Moisture Recommendation Engine in 5 Languages
  const { recommendationData, adaptiveMode } = useMemo(() => {
    const temp = current?.temp != null ? Number(current.temp) : 28;
    const windSpeedNum = parseFloat(String(current?.windSpeed || '0').replace(/[^\d.]/g, '')) || 0;
    const rainProb = current?.rainProbability != null ? Number(current.rainProbability) : 0;
    const tomorrowRainProb = forecastDays[1]?.rainProb != null ? Number(forecastDays[1].rainProb) : 0;
    const precipitationMm = current?.precipitationMm != null ? Number(current.precipitationMm) : 0;
    const isRainy = Boolean(current?.isRainy);
    const isThunderstorm = Boolean(current?.isThunderstorm);

    // High confidence rain conditions only (prevents false rain claims)
    const isConfidentRain = isRainy || isThunderstorm || precipitationMm >= 2.0 || rainProb >= 50 || tomorrowRainProb >= 65;
    const isConfidentDry = !isRainy && !isThunderstorm && precipitationMm < 0.5 && rainProb < 35 && tomorrowRainProb < 45;

    // Soil Moisture States
    const hasLiveSoil = sensorData.isAvailable && sensorData.soilMoisture != null;
    const sm = hasLiveSoil ? Number(sensorData.soilMoisture) : null;
    const isSoilLow = hasLiveSoil && sm < 35;
    const isSoilSufficient = hasLiveSoil && sm >= 40;

    // --- CASE A: Rain expected + Soil moisture is sufficient/high ---
    if (hasLiveSoil && isConfidentRain && isSoilSufficient) {
      const texts = {
        situation: {
          en: "Rain is likely and soil moisture is already sufficient.",
          ta: "மழை வர வாய்ப்பு உள்ளது, மண்ணில் போதுமான ஈரப்பதமும் உள்ளது.",
          te: "వర్షం పడే అవకాశం ఉంది మరియు నేలలో తేమ ఇప్పటికే సరిపడా ఉంది.",
          ml: "മഴ പെയ്യാൻ സാധ്യതയുണ്ട്, മണ്ണിൽ ആവശ്യത്തിന് ഈർപ്പവുമുണ്ട്.",
          hi: "बारिश की संभावना है और मिट्टी में पहले से पर्याप्त नमी है।"
        },
        main: {
          en: "Do not irrigate today",
          ta: "இன்று நீர்ப்பாசனம் செய்ய வேண்டாம்",
          te: "ఈరోజు నీటిపారుదల చేయవద్దు",
          ml: "ഇന്ന് നനയ്ക്കരുത്",
          hi: "आज सिंचाई न करें"
        },
        avoid: {
          en: "Avoid watering field and chemical spraying.",
          ta: "வயலுக்கு தண்ணீர் பாய்ச்சுவதையும், இரசாயனம் தெளிப்பதையும் தவிர்க்கவும்.",
          te: "పొలానికి నీరు పెట్టడం మరియు రసాయన పిచికారీని నివారించండి.",
          ml: "വയലിൽ വെള്ളം നനയ്ക്കുന്നതും കീടനാശിനി തളിക്കുന്നതും ഒഴിവാക്കുക.",
          hi: "खेत में पानी देने और कीटनाशक छिड़काव से बचें।"
        },
        bestTime: {
          en: "After rain reduces",
          ta: "மழை குறைந்த பிறகு",
          te: "వర్షం తగ్గిన తర్వాత",
          ml: "മഴ ശമിച്ച ശേഷം",
          hi: "बारिश कम होने के बाद"
        },
        why: {
          en: "Soil moisture is already adequate and expected rainfall will supply water. Extra irrigation risks waterlogging.",
          ta: "மண்ணில் ஏற்கனவே போதுமான ஈரப்பதம் உள்ளது, மேலும் மழை வர வாய்ப்புள்ளதால் கூடுதல் பாசனம் நீர் தேங்கி வேரழுகலை ஏற்படுத்தும்.",
          te: "నేలలో ఇప్పటికే తగినంత తేమ ఉంది, వర్షం వల్ల నీరు అందుతుంది. అదనపు నీరు నిలిచి వేరు కుళ్లుకు దారితీయవచ్చు.",
          ml: "മണ്ണിൽ ആവശ്യത്തിന് ഈർപ്പമുണ്ട്, മഴ ലഭിക്കുകയും ചെയ്യും. അധിക നനവ് വേരുകൾ ചീയാൻ ഇടയാക്കും.",
          hi: "मिट्टी में पहले से पर्याप्त नमी है और बारिश से पानी मिलेगा। अतिरिक्त सिंचाई से जलभराव और जड़ सड़न हो सकती है।"
        },
        supporting: {
          en: ["Check drainage channels", "Avoid spraying chemicals", "Monitor standing water", "Protect harvested crops"],
          ta: ["வடிகால் வாய்க்கால்களைச் சரிபார்க்கவும்", "மருந்து தெளிப்பதைத் தவிர்க்கவும்", "நீர் தேங்குவதைக் கண்காணிக்கவும்", "அறுவடை செய்த பயிர்களைப் பாதுகாக்கவும்"],
          te: ["డ్రైనేజీ కాలువలను పరిశీలించండి", "రసాయన పిచికారీని నివారించండి", "నీరు నిలవకుండా చూడండి", "కోసిన పంటను భద్రపరచండి"],
          ml: ["ഡ്രെയിനേജ് ചാലുകൾ പരിശോധിക്കുക", "കീടനാശിനി പ്രയോഗം ഒഴിവാക്കുക", "വെള്ളക്കെട്ട് നിരീക്ഷിക്കുക", "വിളവെടുത്തവ സുരക്ഷിതമാക്കുക"],
          hi: ["जल निकासी नालियों की जांच करें", "दवाई छिड़काव से बचें", "जलभराव पर नजर रखें", "कटी हुई फसल को सुरक्षित रखें"]
        }
      };

      return {
        adaptiveMode: 'RAIN',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // --- CASE B: Rain not expected + Soil moisture is low ---
    if (hasLiveSoil && isConfidentDry && isSoilLow) {
      const texts = {
        situation: {
          en: "Soil moisture is low and rain is unlikely.",
          ta: "மண்ணில் ஈரப்பதம் குறைவாக உள்ளது, மழை வாய்ப்பும் குறைவு.",
          te: "నేలలో తేమ తక్కువగా ఉంది మరియు వర్ష సూచన లేదు.",
          ml: "മണ്ണിൽ ഈർപ്പം കുറവാണ്, മഴ സാധ്യതയുമില്ല.",
          hi: "मिट्टी में नमी कम है और बारिश की संभावना नहीं है।"
        },
        main: {
          en: "Irrigate field as needed",
          ta: "தேவையான அளவு தண்ணீர் விடலாம்",
          te: "అవసరమైన మేరకు నీటిపారుదల చేయండి",
          ml: "ആവശ്യാനുസരണം നനയ്ക്കാം",
          hi: "आवश्यकतानुसार सिंचाई करें"
        },
        avoid: {
          en: "Avoid irrigating during peak afternoon sun (12 PM - 3 PM).",
          ta: "உச்ச வெயில் நேரங்களில் (மதியம் 12 - 3 மணி) தண்ணீர் பாய்ச்சுவதைத் தவிர்க்கவும்.",
          te: "తీవ్రమైన ఎండ వేళల్లో (మధ్యాహ్నం 12 - 3 గంటల మధ్య) నీరు పెట్టవద్దు.",
          ml: "ഉച്ചവെയിലിൽ (12 - 3 മണി) നനയ്ക്കുന്നത് ഒഴിവാക്കുക.",
          hi: "कड़ी धूप में (दोपहर 12 से 3 बजे के बीच) सिंचाई करने से बचें।"
        },
        bestTime: {
          en: "Early morning or late evening",
          ta: "அதிகாலை அல்லது மாலை நேரம்",
          te: "ఉదయం లేదా సాయంత్రం వేళల్లో",
          ml: "രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം",
          hi: "सुबह या शाम के समय"
        },
        why: {
          en: "Soil is dry and rain is unlikely. Timely watering prevents crop moisture stress.",
          ta: "மண் வறண்டுள்ளது மற்றும் மழை வாய்ப்பு இல்லாததால், பயிர் வாடுவதைத் தடுக்க தேவையான பாசனம் அவசியம்.",
          te: "నేల పొడిగా ఉంది మరియు వర్షం లేదు. సకాలంలో నీరు పెట్టడం వల్ల పంట వాడిపోకుండా ఉంటుంది.",
          ml: "മണ്ണ് വരണ്ടതാണ്, മഴയുമില്ല. കൃത്യസമയത്ത് നനയ്ക്കുന്നത് വിള വാടുന്നത് തടയും.",
          hi: "मिट्टी सूखी है और बारिश नहीं है। समय पर सिंचाई से फसल को पानी की कमी से बचाया जा सकता है।"
        },
        supporting: {
          en: ["Irrigate early morning or evening", "Monitor soil moisture regularly", "Ensure uniform water delivery to roots", "Check soil condition before fertilizing"],
          ta: ["அதிகாலையில் அல்லது மாலையில் தண்ணீர் பாய்ச்சவும்", "மண்ணின் ஈரப்பதத்தைத் தொடர்ந்து கண்காணிக்கவும்", "வேர்ப்பகுதியில் நீர் சீராக செல்வதை உறுதி செய்யவும்", "உரமிடுவதற்கு முன் மண்ணின் ஈரப்பதத்தைச் சரிபார்க்கவும்"],
          te: ["ఉదయం లేదా సాయంత్రం నీరు పెట్టండి", "నేల తేమను క్రమం తప్పకుండా గమనించండి", "వేర్లకు సమానంగా నీరు అందేలా చూడండి", "ఎరువులు వేసే ముందు తేమను తనిఖీ చేయండి"],
          ml: ["രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം നനയ്ക്കുക", "മണ്ണിലെ ഈർപ്പം നിരീക്ഷിക്കുക", "വേരുകളിലേക്ക് ജലസേചനം ഉറപ്പാക്കുക", "വളപ്രയോഗത്തിന് മുൻപ് ഈർപ്പം പരിശോധിക്കുക"],
          hi: ["सुबह या शाम को सिंचाई करें", "मिट्टी की नमी की नियमित जांच करें", "जड़ों तक पानी पहुंचना सुनिश्चित करें", "उर्वरक देने से पहले नमी जांचें"]
        }
      };

      return {
        adaptiveMode: temp >= 36 ? 'HEAT' : 'OPTIMAL',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // --- CASE C: Rain expected + Soil moisture is low ---
    if (hasLiveSoil && isConfidentRain && isSoilLow) {
      const texts = {
        situation: {
          en: "Soil moisture is low, but rain is expected soon.",
          ta: "மண்ணில் ஈரப்பதம் குறைவாக உள்ளது, ஆனால் மழை வர வாய்ப்புள்ளது.",
          te: "నేలలో తేమ తక్కువగా ఉంది, కానీ త్వరలో వర్షం పడవచ్చు.",
          ml: "മണ്ണിൽ ഈർപ്പം കുറവാണ്, എങ്കിലും ഉടൻ മഴ ലഭിച്ചേക്കാം.",
          hi: "मिट्टी में नमी कम है, लेकिन जल्द बारिश की संभावना है।"
        },
        main: {
          en: "Delay heavy watering; check rain timing",
          ta: "மழையைக் கவனித்து குறைந்த அளவு தண்ணீர் பாய்ச்சவும்",
          te: "భారీ నీటిపారుదల ఆపండి; వర్ష సమయాన్ని గమనించండి",
          ml: "കനത്ത നനവ് മാറ്റിവെയ്ക്കുക; മഴയുടെ സമയം ശ്രദ്ധിക്കുക",
          hi: "भारी सिंचाई रोकें; बारिश के समय पर नजर रखें"
        },
        avoid: {
          en: "Avoid heavy flood irrigation before expected rain.",
          ta: "அதிகப்படியான நீர் பாய்ச்சுவதைத் தவிர்க்கவும்; மழை பெய்தால் நீர் தேங்கிவிடும்.",
          te: "వర్షానికి ముందు భారీగా నీరు పారించవద్దు; నీరు నిలిచిపోయే ప్రమాదం ఉంది.",
          ml: "മഴയ്ക്ക് മുൻപ് കൂടുതൽ വെള്ളം തുറന്നുവിടുന്നത് ഒഴിവാക്കുക.",
          hi: "बारिश से पहले भारी सिंचाई से बचें; जलभराव हो सकता है।"
        },
        bestTime: {
          en: "Light watering only if rain is delayed",
          ta: "மழை தாமதமானால் லேசான பாசனம்",
          te: "వర్షం ఆలస్యమైతే మాత్రమే స్వల్పంగా నీరు పెట్టండి",
          ml: "മഴ വൈകുകയാണെങ്കിൽ മാത്രം നേരിയ നനവ്",
          hi: "बारिश में देरी होने पर ही हल्की सिंचाई करें"
        },
        why: {
          en: "Soil needs water, but incoming rain may provide natural relief. Avoid heavy watering now to prevent waterlogging.",
          ta: "மண் வறண்டிருந்தாலும் விரைவில் மழை வரக்கூடும் என்பதால், கனமழையை எதிர்நோக்கி அதிக நீர் பாய்ச்சாமல் இருப்பதே சிறந்தது.",
          te: "నేలకు నీరు అవసరం, కానీ త్వరలో వర్షం కురవవచ్చు. ఇప్పుడు భారీగా నీరు పెడితే నీరు నిలిచి నష్టం జరగవచ్చు.",
          ml: "മണ്ണിന് വെള്ളം ആവശ്യമാണെങ്കിലും മഴ ലഭിച്ചേക്കാം. ഇപ്പോൾ കൂടുതൽ നനച്ചാൽ വെള്ളക്കെട്ടുണ്ടാകും.",
          hi: "मिट्टी को पानी चाहिए, लेकिन बारिश होने वाली है। अभी ज्यादा पानी देने से जलभराव का खतरा होगा।"
        },
        supporting: {
          en: ["Track rain timing before running pumps", "Apply light watering only if crops show wilting", "Inspect field drainage channels", "Recheck soil moisture after rain passes"],
          ta: ["மழை தொடங்கும் நேரத்தை வானிலை மூலம் கண்காணிக்கவும்", "பயிர் அதிகம் வாடினால் மட்டும் குறைந்த அளவு தண்ணீர் விடவும்", "வயலின் வடிகால் வசதியைச் சரிபார்க்கவும்", "மழை நின்ற பிறகு மீண்டும் ஈரப்பதத்தைச் சரிபார்க்கவும்"],
          te: ["పంపులు ఆన్ చేసే ముందు వర్షాన్ని గమనించండి", "పంట వాడిపోతేనే కొద్దిగా నీరు పెట్టండి", "డ్రైనేజీ కాలువలు సరిగ్గా ఉన్నాయో లేదో చూడండి", "వర్షం తగ్గాక మళ్లీ తేమను పరీక్షించండి"],
          ml: ["പമ്പ് പ്രവർത്തിപ്പിക്കുന്നതിന് മുൻപ് മഴ ശ്രദ്ധിക്കുക", "വിള വാടുന്നുണ്ടെങ്കിൽ മാത്രം നേരിയ നനവ് നൽകുക", "ചാലുകൾ വൃത്തിയാക്കുക", "മഴ കഴിഞ്ഞ ശേഷം വീണ്ടും ഈർപ്പം പരിശോധിക്കുക"],
          hi: ["पंप चलाने से पहले बारिश के समय पर नजर रखें", "फसल मुरझाने पर ही हल्का पानी दें", "खेत की जल निकासी नाली देखें", "बारिश के बाद दोबारा मिट्टी की नमी जांचें"]
        }
      };

      return {
        adaptiveMode: 'RAIN',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // --- CASE D: Clear skies + Soil moisture is already sufficient ---
    if (hasLiveSoil && !isConfidentRain && isSoilSufficient) {
      const selectedMode = windSpeedNum >= 20 ? 'WIND' : (temp >= 36 ? 'HEAT' : 'OPTIMAL');
      const texts = {
        situation: {
          en: "Skies are clear and soil moisture is adequate.",
          ta: "வானிலை சீராக உள்ளது மற்றும் மண்ணில் போதுமான ஈரப்பதம் உள்ளது.",
          te: "ఆకాశం నిర్మలంగా ఉంది మరియు నేలలో తగినంత తేమ ఉంది.",
          ml: "ആകാശം തെളിഞ്ഞതാണ്, മണ്ണിൽ ആവശ്യത്തിന് ഈർപ്പവുമുണ്ട്.",
          hi: "आसमान साफ़ है और मिट्टी में पर्याप्त नमी मौजूद है।"
        },
        main: {
          en: "Skip watering; soil moisture is sufficient",
          ta: "இன்று தண்ணீர் விடத் தேவையில்லை",
          te: "నీటిపారుదల అవసరం లేదు; తేమ సరిపడా ఉంది",
          ml: "നനയ്ക്കേണ്ടതില്ല; ഈർപ്പം മതിയാകും",
          hi: "सिंचाई की आवश्यकता नहीं है; नमी पर्याप्त है"
        },
        avoid: {
          en: "Avoid unnecessary irrigation.",
          ta: "தேவையற்ற நீர்ப்பாசனத்தைத் தவிர்க்கவும்.",
          te: "అనవసరమైన నీటిపారుదలను నివారించండి.",
          ml: "അനാവശ്യമായ ജലസേചനം ഒഴിവാക്കുക.",
          hi: "अनावश्यक सिंचाई से बचें।"
        },
        bestTime: {
          en: "Anytime during daylight for field work",
          ta: "வழக்கமான வயல் பணிகளுக்கு ஏற்ற நேரம்",
          te: "పొలం పనులకు పగటి వేళ అనుకూలం",
          ml: "വയൽ ജോലികൾക്ക് പകൽ സമയം അനുയോജ്യമാണ്",
          hi: "खेत के कार्यों के लिए दिन का समय उपयुक्त है"
        },
        why: {
          en: "Soil already holds sufficient moisture for root uptake. Extra watering is unnecessary.",
          ta: "மண்ணில் ஏற்கனவே போதுமான அளவு ஈரப்பதம் உள்ளது. கூடுதல் நீர் பாய்ச்சல் நீர் விரயத்தை மட்டுமே ஏற்படுத்தும்.",
          te: "వేర్లకు అవసరమైన తేమ నేలలో ఉంది. అదనపు నీరు వృధా మాత్రమే.",
          ml: "വേരുകൾക്ക് ആവശ്യമായ ഈർപ്പം മണ്ണിലുണ്ട്. അധിക നനവ് വെറുതെ വെള്ളം പാഴാക്കും.",
          hi: "जड़ों के लिए मिट्टी में पर्याप्त नमी है। अतिरिक्त सिंचाई से केवल पानी की बर्बादी होगी।"
        },
        supporting: {
          en: ["Continue routine field maintenance", "Conduct crop health inspection and weeding", "Check soil moisture again tomorrow", "Proceed with planned field activities"],
          ta: ["வழக்கமான வயல் பணிகளைத் தொடரலாம்", "களை எடுத்தல் மற்றும் பயிர் ஆய்வு செய்யவும்", "மண்ணின் ஈரப்பதத்தை நாளைய தினம் மீண்டும் சோதிக்கவும்", "திட்டமிட்டபடி வேளாண் பணிகளைச் செய்யவும்"],
          te: ["సాధారణ వ్యవసాయ పనులను కొనసాగించండి", "కలుపు తీయడం మరియు పంటను తనిఖీ చేయండి", "రేపు మళ్లీ నేల తేమను పరిశీలించండి", "ప్రణాళిక ప్రకారం పనులు చేయండి"],
          ml: ["സാധാരണ വയൽ ജോലികൾ തുടരുക", "കളപറിക്കലും വിള പരിശോധനയും നടത്തുക", "നാളെ വീണ്ടും ഈർപ്പം പരിശോധിക്കുക", "ആസൂത്രണം ചെയ്ത പണികൾ ചെയ്യുക"],
          hi: ["खेत के सामान्य कार्य जारी रखें", "निराई-गुड़ाई और फसल की जांच करें", "कल दोबारा मिट्टी की नमी जांचें", "योजनानुसार कृषि कार्य करें"]
        }
      };

      return {
        adaptiveMode: selectedMode,
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // --- CASE E / Moderate Soil Moisture ---
    if (hasLiveSoil && !isConfidentRain) {
      const selectedMode = windSpeedNum >= 20 ? 'WIND' : (temp >= 36 ? 'HEAT' : 'OPTIMAL');
      const texts = {
        situation: {
          en: "Moderate soil moisture with stable weather.",
          ta: "மிதமான மண் ஈரப்பதம் மற்றும் சீரான வானிலை.",
          te: "మితమైన నేల తేమ మరియు స్థిరమైన వాతావరణం.",
          ml: "മിതമായ ഈർപ്പവും സുസ്ഥിര കാലാവസ്ഥയും.",
          hi: "मध्यम मिट्टी की नमी और स्थिर मौसम।"
        },
        main: {
          en: "Maintain routine watering schedule",
          ta: "வழக்கம்போல தேவையான அளவு தண்ணீர் விடலாம்",
          te: "సాధారణ నీటిపారుదల షెడ్యూల్ కొనసాగించండి",
          ml: "പതിവ് നനവ് തുടരുക",
          hi: "नियमित सिंचाई का पालन करें"
        },
        avoid: {
          en: "Avoid over-irrigating field.",
          ta: "அதிகப்படியான நீர் பாய்ச்சுவதைத் தவிர்க்கவும்.",
          te: "అధికంగా నీరు పెట్టవద్దు.",
          ml: "കൂടുതൽ വെള്ളം നനയ്ക്കുന്നത് ഒഴിവാക്കുക.",
          hi: "खेत में अत्यधिक पानी देने से बचें।"
        },
        bestTime: {
          en: "Early morning or evening",
          ta: "காலை அல்லது மாலை நேரம்",
          te: "ఉదయం లేదా సాయంత్రం వేళ",
          ml: "രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം",
          hi: "सुबह या शाम के समय"
        },
        why: {
          en: "Soil moisture is in moderate range. Light routine watering maintains optimal crop condition.",
          ta: "மண்ணில் மிதமான ஈரப்பதம் உள்ளது. வழக்கமான பாசனம் பயிரின் சீரான வளர்ச்சிக்கு உதவும்.",
          te: "నేలలో మితమైన తేమ ఉంది. స్వల్ప నీటిపారుదల పంటకు అనుకూలంగా ఉంటుంది.",
          ml: "മണ്ണിൽ മിതമായ ഈർപ്പമുണ്ട്. ചെറിയ നനവ് വിളയ്ക്ക് നല്ലതാണ്.",
          hi: "मिट्टी में मध्यम नमी है। हल्की नियमित सिंचाई फसल के लिए उत्तम रहेगी।"
        },
        supporting: {
          en: ["Inspect field moisture before watering", "Prefer morning or evening watering", "Monitor crop health", "Plan routine field operations"],
          ta: ["தண்ணீர் பாய்ச்சும் முன் மண்ணைச் சோதிக்கவும்", "காலை அல்லது மாலையில் தண்ணீர் பாய்ச்சவும்", "பயிர் ஆரோக்கியத்தைக் கண்காணிக்கவும்", "வழக்கமான பணிகளைத் திட்டமிடவும்"],
          te: ["నీరు పెట్టే ముందు తేమను చూడండి", "ఉదయం లేదా సాయంత్రం నీరు పెట్టండి", "పంట ఆరోగ్యాన్ని గమనించండి", "సాధారణ పనులను సిద్ధం చేయండి"],
          ml: ["നനയ്ക്കുന്നതിന് മുൻപ് ഈർപ്പം പരിശോധിക്കുക", "രാവിലെയോ വൈകുന്നേരമോ നനയ്ക്കുക", "വിള ആരോഗ്യം നിരീക്ഷിക്കുക", "പതിവ് ജോലികൾ ആസൂത്രണം ചെയ്യുക"],
          hi: ["पानी देने से पहले नमी जांचें", "सुबह या शाम को पानी दें", "फसल स्वास्थ्य पर नजर रखें", "दैनिक कृषि कार्य जारी रखें"]
        }
      };

      return {
        adaptiveMode: selectedMode,
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // --- SENSOR DATA UNAVAILABLE / STALE: WEATHER-ONLY FALLBACKS ---
    if (isConfidentRain) {
      const texts = {
        situation: {
          en: todayFarmAction?.situation || "Rain is likely today.",
          ta: todayFarmAction?.situationTa || "இன்று மழை வர வாய்ப்பு உள்ளது.",
          te: todayFarmAction?.situationTe || "ఈరోజు వర్షం పడే అవకాశం ఉంది.",
          ml: todayFarmAction?.situationMl || "ഇന്ന് മഴയ്ക്ക് സാധ്യതയുണ്ട്.",
          hi: todayFarmAction?.situationHi || "आज बारिश की संभावना है।"
        },
        main: {
          en: "Do not irrigate today",
          ta: "இன்று நீர்ப்பாசனம் செய்ய வேண்டாம்",
          te: "ఈరోజు నీటిపారుదల చేయవద్దు",
          ml: "ഇന്ന് നനയ്ക്കരുത്",
          hi: "आज सिंचाई न करें"
        },
        avoid: {
          en: "Avoid watering field and chemical spraying.",
          ta: "வயலுக்கு தண்ணீர் பாய்ச்சுவதையும், இரசாயனம் தெளிப்பதையும் தவிர்க்கவும்.",
          te: "పొలానికి నీరు పెట్టడం మరియు రసాయన పిచికారీని నివారించండి.",
          ml: "വയലിൽ വെള്ളം നനയ്ക്കുന്നതും കീടനാശിനി തളിക്കുന്നതും ഒഴിവാക്കുക.",
          hi: "खेत में पानी देने और कीटनाशक छिड़काव से बचें।"
        },
        bestTime: {
          en: "After rain reduces",
          ta: "மழை குறைந்த பிறகு",
          te: "వర్షం తగ్గిన తర్వాత",
          ml: "മഴ ശമിച്ച ശേഷം",
          hi: "बारिश कम होने के बाद"
        },
        why: {
          en: "Natural rainfall supplies crop water needs. Avoid extra irrigation to prevent waterlogging.",
          ta: "இயற்கை மழையே பயிர்களுக்குத் தேவையான ஈரப்பதத்தை வழங்குகிறது. நீர் தேங்குவதைத் தவிர்க்க பாசனத்தை நிறுத்தவும்.",
          te: "వర్షపు నీరే పంటకు సరిపోతుంది. నీరు నిలవకుండా అదనపు నీటిని నివారించండి.",
          ml: "പ്രകൃതിദത്ത മഴ ആവശ്യത്തിന് വെള്ളം നൽകുന്നു. അധിക നനവ് ഒഴിവാക്കുക.",
          hi: "प्राकृतिक बारिश ही फसल को पर्याप्त पानी देती है। जलभराव से बचने के लिए सिंचाई रोकें।"
        },
        supporting: {
          en: ["Check drainage channels", "Avoid spraying chemicals", "Monitor standing water", "Protect harvested crops"],
          ta: ["வடிகால் வாய்க்கால்களைச் சரிபார்க்கவும்", "மருந்து தெளிப்பதைத் தவிர்க்கவும்", "நீர் தேங்குவதைக் கண்காணிக்கவும்", "அறுவடை செய்த பயிர்களைப் பாதுகாக்கவும்"],
          te: ["డ్రైనేజీ కాలువలను పరిశీలించండి", "రసాయన పిచికారీని నివారించండి", "నీరు నిలవకుండా చూడండి", "కోసిన పంటను భద్రపరచండి"],
          ml: ["ഡ്രെയിനേജ് ചാലുകൾ പരിശോധിക്കുക", "കീടനാശിനി പ്രയോഗം ഒഴിവാക്കുക", "വെള്ളക്കെട്ട് നിരീക്ഷിക്കുക", "വിളവെടുത്തവ സുരക്ഷിതമാക്കുക"],
          hi: ["जल निकासी नालियों की जांच करें", "दवाई छिड़काव से बचें", "जलभराव पर नजर रखें", "कटी हुई फसल को सुरक्षित रखें"]
        }
      };

      return {
        adaptiveMode: 'RAIN',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    if (windSpeedNum >= 20) {
      const texts = {
        situation: {
          en: "High wind speeds detected.",
          ta: "காற்று அதிகம் உள்ளது.",
          te: "గాలి వేగం ఎక్కువగా ఉంది.",
          ml: "കാറ്റ് ശക്തമാണ്.",
          hi: "हवा तेज चल रही है।"
        },
        main: {
          en: "Avoid spraying today",
          ta: "இன்று மருந்து தெளிப்பதைத் தவிர்க்கவும்",
          te: "ఈరోజు పిచికారీ చేయవద్దు",
          ml: "ഇന്ന് മരുന്ന് തളിക്കരുത്",
          hi: "आज छिड़काव से बचें"
        },
        avoid: {
          en: "Avoid chemical application and open burning.",
          ta: "இரசாயனப் பயன்பாடு மற்றும் திறந்தவெளியில் எரியூட்டுவதைத் தவிர்க்கவும்.",
          te: "రసాయన పిచికారీ మరియు పొలంలో మంటలు వేయడం నివారించండి.",
          ml: "കീടനാശിനി പ്രയോഗവും തുറന്ന തീയിടലും ഒഴിവാക്കുക.",
          hi: "दवाई छिड़काव और आग जलाने से बचें।"
        },
        bestTime: {
          en: "Low wind period",
          ta: "காற்று வேகம் குறைவாக இருக்கும் நேரம்",
          te: "గాలి తక్కువగా ఉండే సమయం",
          ml: "കാറ്റ് കുറഞ്ഞ സമയം",
          hi: "शांत हवा का समय"
        },
        why: {
          en: "Strong wind reduces spraying effectiveness and causes chemical drift.",
          ta: "பலத்த காற்று தெளிக்கும் மருந்தின் செயல்திறனைக் குறைக்கும் மற்றும் மருந்து சிதறலை ஏற்படுத்தும்.",
          te: "తీవ్రమైన గాలి వల్ల రసాయనాలు గాల్లో కలిసి వృధా అవుతాయి.",
          ml: "ശക്തമായ കാറ്റ് കീടനാശിനി പാഴാകാൻ ഇടയാക്കും.",
          hi: "तेज हवा से छिड़काव का प्रभाव कम होता है और दवाई बह जाती है।"
        },
        supporting: {
          en: ["Delay chemical application", "Check crop support", "Monitor damage risk", "Plan work during calm hours"],
          ta: ["இரசாயனம் தெளிப்பதைத் தள்ளிப்போடவும்", "பயிர்களின் முட்டுக் கொடுக்கும் அமைப்பைச் சரிபார்க்கவும்", "பயிர் சேத ஆபத்தைக் கண்காணிக்கவும்", "அமைதியான நேரங்களில் வேலை செய்யத் திட்டமிடவும்"],
          te: ["పిచికారీని వాయిదా వేయండి", "పంట మద్దతు ఏర్పాట్లను చూడండి", "నష్ట ముప్పును గమనించండి", "ప్రశాంత వేళల్లో పని చేయండి"],
          ml: ["മരുന്ന് തളിക്കൽ മാറ്റിവെക്കുക", "വിളകളുടെ താങ്ങ് പരിശോധിക്കുക", "നാശനഷ്ട സാധ്യത നിരീക്ഷിക്കുക", "ശാന്തമായ സമയത്ത് ജോലി ചെയ്യുക"],
          hi: ["छिड़काव को टालें", "फसलों के सहारे की जांच करें", "नुकसान के खतरे पर नजर रखें", "शांत समय में काम करें"]
        }
      };

      return {
        adaptiveMode: 'WIND',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    if (temp >= 36) {
      const texts = {
        situation: {
          en: "High heat expected today.",
          ta: "வெயில் அதிகம் உள்ளது.",
          te: "తీవ్రమైన ఎండ ఉండే అవకాశం ఉంది.",
          ml: "കടുത്ത ചൂട് അനുഭവപ്പെടാം.",
          hi: "आज अत्यधिक गर्मी की संभावना है।"
        },
        main: {
          en: "Avoid midday field work",
          ta: "நண்பகலில் வயல் வேலைகளைத் தவிர்க்கவும்",
          te: "మధ్యాహ్నం వేళ పొలం పనులను నివారించండి",
          ml: "ഉച്ചസമയത്തെ വയൽ ജോലികൾ ഒഴിവാക്കുക",
          hi: "दोपहर में खेत के कार्य से बचें"
        },
        avoid: {
          en: "Avoid working during peak sun (12 PM - 3 PM).",
          ta: "உச்ச வெயிலில் (மதியம் 12 - 3 மணி) வேலை செய்வதையும், உரமிடுவதையும் தவிர்க்கவும்.",
          te: "తీవ్రమైన ఎండలో (మధ్యాహ్నం 12 - 3 గంటల మధ్య) పనిచేయడం నివారించండి.",
          ml: "ഉച്ചവെയിലിൽ (12 - 3 മണി) അധ്വാനിക്കുന്നത് ഒഴിവാക്കുക.",
          hi: "कड़ी धूप में (दोपहर 12 से 3 बजे के बीच) काम करने से बचें।"
        },
        bestTime: {
          en: "Morning or evening",
          ta: "காலை அல்லது மாலை",
          te: "ఉదయం లేదా సాయంత్రం",
          ml: "രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം",
          hi: "सुबह या शाम"
        },
        why: {
          en: "High heat increases crop moisture evaporation and worker fatigue.",
          ta: "அதிக வெப்பம் பயிர்களில் நீர் இழப்பை அதிகரிக்கும் மற்றும் பயிர் அழுத்தத்தை ஏற்படுத்தும்.",
          te: "ఎండ తీవ్రత వల్ల నేలలో తేమ త్వరగా ఆవిరవుతుంది మరియు అలసట కలుగుతుంది.",
          ml: "കടുത്ത ചൂട് വെള്ളം പെട്ടെന്ന് ബാഷ്പീകരിക്കാനും ക്ഷീണത്തിനും കാരണമാകും.",
          hi: "तेज धूप से पानी का वाष्पीकरण बढ़ता है और थकान होती है।"
        },
        supporting: {
          en: ["Irrigate early morning/evening", "Check soil moisture", "Protect sensitive crops", "Avoid unnecessary stress"],
          ta: ["அதிகாலையில் அல்லது மாலையில் தண்ணீர் பாய்ச்சவும்", "மண்ணின் ஈரப்பதத்தைச் சரிபார்க்கவும்", "வெப்ப பாதிப்புக்குள்ளாகும் பயிர்களைப் பாதுகாக்கவும்", "பயிர்களுக்குத் தேவையற்ற அழுத்தத்தைத் தவிர்க்கவும்"],
          te: ["ఉదయం/సాయంత్రం నీరు పెట్టండి", "నేల తేమను పరిశీలించండి", "సున్నితమైన పంటలను కాపాడండి", "ఒత్తిడిని నివారించండి"],
          ml: ["രാവിലെയോ വൈകുന്നേരമോ നനയ്ക്കുക", "ഈർപ്പം പരിശോധിക്കുക", "വിളകളെ സംരക്ഷിക്കുക", "അനാവശ്യ സമ്മർദ്ദം ഒഴിവാക്കുക"],
          hi: ["सुबह या शाम को पानी दें", "मिट्टी की नमी जांचें", "संवेदनशील फसलों की रक्षा करें", "तनाव से बचें"]
        }
      };

      return {
        adaptiveMode: 'HEAT',
        recommendationData: {
          situation: texts.situation[activeLang] || texts.situation.en,
          main: texts.main[activeLang] || texts.main.en,
          avoid: texts.avoid[activeLang] || texts.avoid.en,
          bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
          why: texts.why[activeLang] || texts.why.en,
          supporting: texts.supporting[activeLang] || texts.supporting.en
        }
      };
    }

    // Default Optimal Farming Window
    const texts = {
      situation: {
        en: "Weather conditions are stable.",
        ta: "வானிலை சீராக உள்ளது.",
        te: "వాతావరణం ప్రశాంతంగా ఉంది.",
        ml: "കാലാവസ്ഥ സ്ഥിരതയുള്ളതാണ്.",
        hi: "मौसम अनुकूल व स्थिर है।"
      },
      main: {
        en: "Good farming window",
        ta: "விவசாயப் பணிகளுக்குச் சாதகமான காலம்",
        te: "వ్యవసాయ పనులకు అనుకూల సమయం",
        ml: "കൃഷിപ്പണികൾക്ക് നല്ല സമയം",
        hi: "कृषि कार्यों के लिए उत्तम समय"
      },
      avoid: {
        en: "Avoid neglecting regular field inspections.",
        ta: "வழக்கமான வயல் ஆய்வுகளைத் தவிர்க்க வேண்டாம்.",
        te: "సాధారణ పొలం పరిశీలనను విస్మరించవద్దు.",
        ml: "പതിവ് വയൽ നിരീക്ഷണം ഒഴിവാക്കരുത്.",
        hi: "नियमित खेत निरीक्षण की अनदेखी न करें।"
      },
      bestTime: {
        en: "Anytime during daylight",
        ta: "பகலில் எந்த நேரமும்",
        te: "పగటి వేళ ఎప్పుడైనా",
        ml: "പകൽ സമയം എപ്പോൾ വേണമെങ്കിലും",
        hi: "दिन में किसी भी समय"
      },
      why: {
        en: "Weather conditions are highly favorable for regular field operations.",
        ta: "விவசாயப் பணிகளைச் செய்ய வானிலை மிகவும் சாதகமாக உள்ளது.",
        te: "పొలం పనులు చేసుకోవడానికి వాతావరణం ఎంతో అనుకూలంగా ఉంది.",
        ml: "വയൽ ജോലികൾ ചെയ്യാൻ കാലാവസ്ഥ വളരെ അനുയോജ്യമാണ്.",
        hi: "कृषि कार्यों के लिए मौसम पूरी तरह से अनुकूल है।"
      },
      supporting: {
        en: ["Crop inspection", "Weeding", "Field activities", "Planned spraying"],
        ta: ["பயிர் கண்காணிப்பு", "களை எடுத்தல்", "வழக்கமான வயல் பணிகள்", "திட்டமிட்டபடி மருந்து தெளித்தல்"],
        te: ["పంట పరిశీలన", "కలుపు తీయడం", "సాధారణ పొలం పనులు", "ప్రణాళిక ప్రకారం పిచికారీ"],
        ml: ["വിള നിരീക്ഷണം", "കളപറിക്കൽ", "സാധാരണ വയൽ ജോലികൾ", "ആസൂത്രിത മരുന്ന് തളിക്കൽ"],
        hi: ["फसल निरीक्षण", "निराई-गुड़ाई", "सामान्य कृषि कार्य", "योजनाबद्ध छिड़काव"]
      }
    };

    return {
      adaptiveMode: 'OPTIMAL',
      recommendationData: {
        situation: texts.situation[activeLang] || texts.situation.en,
        main: texts.main[activeLang] || texts.main.en,
        avoid: texts.avoid[activeLang] || texts.avoid.en,
        bestTime: texts.bestTime[activeLang] || texts.bestTime.en,
        why: texts.why[activeLang] || texts.why.en,
        supporting: texts.supporting[activeLang] || texts.supporting.en
      }
    };
  }, [current, forecastDays, todayFarmAction, sensorData, activeLang]);

  // Strict Deterministic Weather-State to Weather-Asset Mapping (Day/Night aware)
  const weatherAsset = useMemo(() => {
    // Use API-provided isDay field; fall back to local hour check if unavailable
    const isDaytime = current?.isDay != null
      ? Boolean(current.isDay)
      : (() => { const h = new Date().getHours(); return h >= 6 && h < 19; })();
    return getWeatherConditionAsset(current?.conditionKey, current?.condition, isDaytime);
  }, [current?.conditionKey, current?.condition, current?.isDay]);

  // Visual Theme Styling based on agro-meteorological advisory mode
  const theme = useMemo(() => {
    switch (adaptiveMode) {
      case 'RAIN':
        return {
          bgGradient: 'bg-gradient-to-br from-[#E0F2FE] via-[#EFF6FF] to-[#BFDBFE]',
          titleText: 'text-blue-900',
          whatText: 'text-blue-800',
          situationText: 'text-blue-950',
          doActionText: 'text-rose-600',
          weatherAsset
        };
      case 'HEAT':
        return {
          bgGradient: 'bg-gradient-to-br from-[#FEF3C7] via-[#FFFBEB] to-[#FDE68A]',
          titleText: 'text-amber-900',
          whatText: 'text-amber-800',
          situationText: 'text-amber-950',
          doActionText: 'text-orange-700',
          weatherAsset
        };
      case 'WIND':
        return {
          bgGradient: 'bg-gradient-to-br from-[#CFFAFE] via-[#ECFEFF] to-[#BAE6FD]',
          titleText: 'text-cyan-900',
          whatText: 'text-cyan-800',
          situationText: 'text-cyan-950',
          doActionText: 'text-rose-600',
          weatherAsset
        };
      case 'OPTIMAL':
      default:
        return {
          bgGradient: 'bg-gradient-to-br from-[#D1FAE5] via-[#F0FDF4] to-[#A7F3D0]',
          titleText: 'text-emerald-900',
          whatText: 'text-emerald-800',
          situationText: 'text-emerald-950',
          doActionText: 'text-emerald-700',
          weatherAsset
        };
    }
  }, [adaptiveMode, weatherAsset]);

  // Multilingual Speech Synthesis for Farmer Advice
  const handleListenTip = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const t = UI_TEXT;
    const situationLbl = t.what_is_happening[activeLang] || t.what_is_happening.en;
    const actionLbl = t.what_should_i_do[activeLang] || t.what_should_i_do.en;
    const avoidLbl = t.what_should_i_avoid[activeLang] || t.what_should_i_avoid.en;
    const whyLbl = t.why[activeLang] || t.why.en;

    const tipText = `${situationLbl}: ${recommendationData.situation}. ${actionLbl}: ${recommendationData.main}. ${avoidLbl}: ${recommendationData.avoid}. ${whyLbl}: ${recommendationData.why}`;

    const utterance = new SpeechSynthesisUtterance(tipText);
    const langVoiceMap = {
      ta: 'ta-IN',
      te: 'te-IN',
      ml: 'ml-IN',
      hi: 'hi-IN',
      en: 'en-IN'
    };
    utterance.lang = langVoiceMap[activeLang] || 'en-IN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Helper for 5-language UI text
  const t = (key) => {
    const entry = UI_TEXT[key];
    if (!entry) return key;
    return entry[activeLang] || entry.en || key;
  };

  // Condition string translated into current language
  const translatedCondition = useMemo(() => {
    if (current?.conditionTranslations && current.conditionTranslations[activeLang]) {
      return current.conditionTranslations[activeLang];
    }
    return current?.condition || 'Partly Cloudy';
  }, [current, activeLang]);

  return (
    <div className="w-full max-w-[440px] mx-auto px-4 py-3 space-y-5 select-none pb-36 overflow-x-hidden font-sans">
      
      {/* 1. LOCATION & CROP CONTEXT */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-black text-gray-950 leading-tight truncate">
              {locInfo.locationName || `${selectedDistrict}, ${selectedState}`}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-[13px] font-bold text-gray-600 truncate">
              <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cropName || user?.primaryCrop || user?.crop || 'Cotton'}</span>
              {cropStage && <span className="text-gray-400 font-medium truncate">· {cropStage}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition disabled:opacity-50"
            title="Refresh weather"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            {formattedTime}
          </span>
        </div>
      </div>

      {!dismissedNotice && (locInfo.status === 'DENIED' || locInfo.status === 'TIMEOUT' || locInfo.status === 'UNAVAILABLE') && (
        <div className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[12px]">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-bold leading-tight">{locInfo.message}</p>
          </div>
          <button onClick={() => setDismissedNotice(true)} className="p-0.5 text-amber-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-base font-black text-gray-800">{t('analyzing_weather')}</p>
        </div>
      ) : errorMessage ? (
        <div className="py-16 px-5 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-base font-bold text-gray-800">{errorMessage}</p>
          <button 
            onClick={handleRefresh} 
            className="mt-6 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl active:scale-95 transition shadow-sm hover:bg-emerald-700"
          >
            {t('retry')}
          </button>
        </div>
      ) : current ? (
        <>
          {/* 2. THE PREMIUM FARMER DECISION ASSISTANT CARD */}
          <div className="rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 mt-2 bg-white">
            {/* Top Area: Today's Farm Plan / What is Happening with native blending weather visuals */}
            <div className={`${theme.bgGradient} p-6 overflow-hidden`}>
              <div>
                <span className={`text-[11px] font-black uppercase tracking-widest block mb-1 ${theme.titleText}`}>
                  {t('todays_farm_plan')}
                </span>
                <span className={`text-[12px] font-black uppercase tracking-widest block mb-3 ${theme.whatText}`}>
                  {t('what_is_happening')}
                </span>
                
                {/* Headline Row: text + beautifully framed adaptive weather card widget aligned inline */}
                <div className="flex justify-between items-center gap-5">
                  <h2 className={`text-[25px] xs:text-[27px] leading-[1.2] font-black flex-1 min-w-0 ${theme.situationText}`}>
                    {recommendationData.situation}
                  </h2>
                  {/* Styled card container to frame the weather asset cleanly */}
                  <div className="w-[84px] h-[84px] bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-sm border border-white/30">
                    <img 
                      src={theme.weatherAsset} 
                      alt="Weather Condition" 
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => { e.currentTarget.src = '/dashboard-images/weather_sun_cloud.png'; }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Area: Decisions, Time, Why & Speaker */}
            <div className="p-5 xs:p-6 space-y-5 relative bg-white">
              
              <button 
                onClick={handleListenTip}
                className="absolute right-5 top-5 bg-emerald-50 border border-emerald-100 text-emerald-800 hover:bg-emerald-100 p-2.5 rounded-full shadow-xs transition active:scale-95 z-10 flex items-center gap-1.5 font-bold text-[11px] px-3 py-1.5"
                aria-label="Listen to advice"
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
                    <span>{t('stop')}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{t('listen')}</span>
                  </>
                )}
              </button>

              <div className="pr-20">
                <span className="text-[12px] font-black uppercase tracking-widest text-emerald-800 block mb-1">
                  {t('what_should_i_do')}
                </span>
                <h3 className={`text-[21px] leading-tight font-black ${theme.doActionText}`}>
                  {recommendationData.main}
                </h3>
              </div>

              <div className="h-px bg-gray-100"></div>

              <div>
                <span className="text-[12px] font-black uppercase tracking-widest text-rose-800 block mb-1">
                  {t('what_should_i_avoid')}
                </span>
                <p className="text-[15px] font-extrabold text-gray-900 leading-snug">
                  {recommendationData.avoid}
                </p>
              </div>

              <div className="h-px bg-gray-100"></div>

              <div>
                <span className="text-[12px] font-black uppercase tracking-widest text-cyan-800 block mb-1">
                  {t('best_time_window')}
                </span>
                <p className="text-[15px] font-extrabold text-gray-900 leading-snug">
                  {recommendationData.bestTime}
                </p>
              </div>

              <div className="h-px bg-gray-100"></div>

              {/* AgriMitra farmer guidance avatar in explanation section */}
              <div className="flex gap-4 items-start relative z-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-emerald-100/60 shadow-xs bg-emerald-50/50 p-1 flex items-center justify-center">
                  <img 
                    src="/dashboard-images/agrimitra_farmer_avatar.png" 
                    alt="Farmer Guidance" 
                    className="w-full h-full object-contain mix-blend-multiply" 
                  />
                </div>
                <div className="flex-1 pt-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 block mb-1">
                    {t('why')}
                  </span>
                  <p className="text-[14.5px] font-bold leading-normal text-gray-700">
                    {recommendationData.why}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* 3. SUPPORTING ACTIONS CHECKLIST */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-[16px] font-black text-gray-900">
                {t('supporting_actions')}
              </h3>
            </div>
            
            <div className="space-y-2.5">
              {recommendationData.supporting.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <p className="text-[14px] font-bold text-gray-800 leading-tight">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. CURRENT WEATHER (Supporting Metrics with Large Integrated Icon) */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-black text-gray-900">
                {t('current_conditions')}
              </h3>
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                {t('live_data')}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="flex items-baseline shrink-0">
                  <span className="text-[52px] font-black text-gray-950 leading-none tracking-tighter">
                    {current.temp != null ? current.temp : 29}
                  </span>
                  <span className="text-[22px] font-black text-gray-900 ml-0.5">°C</span>
                </div>

                <div className="flex flex-col min-w-0 justify-center">
                  <span className="text-[17px] font-black text-gray-900 leading-tight truncate">
                    {translatedCondition}
                  </span>
                  <span className="text-[13px] font-bold text-gray-500 mt-1">
                    {t('feels_like')} {current.feelsLike != null ? current.feelsLike : 32}°C
                  </span>
                </div>
              </div>

              {/* Weather Image Widget */}
              <div className="w-[72px] h-[72px] bg-white rounded-2xl p-1.5 flex items-center justify-center shrink-0 border border-gray-150 shadow-xs">
                <img 
                  src={theme.weatherAsset} 
                  alt="Weather Icon" 
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => { e.currentTarget.src = '/dashboard-images/weather_sun_cloud.png'; }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                <CloudRain className="w-5 h-5 text-blue-500 mb-1.5" />
                <span className="text-[14px] font-black text-gray-900">
                  {current.rainProbability != null ? `${current.rainProbability}%` : '0%'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {t('rain')}
                </span>
              </div>

              <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                <Droplets className="w-5 h-5 text-sky-500 mb-1.5" />
                <span className="text-[14px] font-black text-gray-900">
                  {current.humidity != null ? `${current.humidity}%` : '65%'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {t('humid')}
                </span>
              </div>

              <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                <Wind className="w-5 h-5 text-cyan-500 mb-1.5" />
                <span className="text-[14px] font-black text-gray-900">
                  {String(current.windSpeed || '14').replace('km/h', '')}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {t('wind_unit')}
                </span>
              </div>
            </div>
          </div>

          {/* 5. 7-DAY FORECAST */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[16px] font-black text-gray-900">
                {t('seven_day_forecast')}
              </h3>
              <button className="text-[12px] font-black text-emerald-700 flex items-center gap-1 active:scale-95 transition">
                {t('view_all')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 snap-x scroll-smooth">
              {forecastDays.map((item, idx) => {
                const localizedDay = item.isToday 
                  ? t('today') 
                  : (DAY_NAMES[item.dayName]?.[activeLang] || item.dayName);

                return (
                  <div
                    key={idx}
                    className={`shrink-0 w-[86px] rounded-3xl p-3 flex flex-col items-center text-center snap-start transition border ${
                      item.isToday
                        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                        : 'bg-white border-gray-100 shadow-sm'
                    }`}
                  >
                    <span className={`text-[13px] font-black ${item.isToday ? 'text-emerald-900' : 'text-gray-800'}`}>
                      {localizedDay}
                    </span>

                    <div className="my-2.5 h-9 flex items-center justify-center">
                      {getWeatherIcon(item.condition, "w-8 h-8")}
                    </div>

                    <span className="text-[14px] font-black text-gray-950">
                      {item.high}°
                    </span>

                    <div className="flex items-center gap-1 mt-1.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                      <Droplets className="w-3 h-3" />
                      <span className="text-[10px] font-black">{item.rainProb}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Weather;
