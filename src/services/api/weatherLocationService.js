/**
 * Weather Location & Real Data Service (Dedicated to Weather Intelligence)
 * Fully isolated from backend APIs and locked shell components.
 * 
 * Pipeline:
 * REAL WEATHER DATA + REAL CROP CONTEXT -> WEATHER CONDITIONS -> RULE-BASED INTELLIGENCE -> RISK LEVEL -> SIMPLE FARMER ACTION
 * 
 * Principle:
 * "AI/ENGINE THINKS COMPLEX. FARMER SEES SIMPLE."
 */

import { getLocationCoordinates } from '../../data/indiaLocations.js';

/**
 * Configurable Weather Intelligence Thresholds
 */
export const WEATHER_THRESHOLDS = {
  rain: {
    heavyProb: 65,          // >= 65% triggers heavy rain risk
    skipIrrigationProb: 35, // > 35% triggers irrigation skip
    delayHarvestProb: 35,   // > 35% delays harvest
    avoidSprayProb: 35,     // > 35% avoids spraying
    lowProb: 20             // <= 20% considered dry/low rain
  },
  wind: {
    avoidSpray: 18,         // > 18 km/h avoids spraying
    cautionSprayMin: 12     // 12 - 18 km/h caution window
  },
  humidity: {
    high: 80,               // > 80% caution for harvest, high risk for disease
    moderate: 70            // > 70% moderate disease risk
  },
  temperature: {
    highHeat: 38,           // >= 38°C High Heat
    moderateHeatMin: 34,    // 34°C - 37.9°C Moderate Heat
    diseaseWarmMin: 22,     // 22°C - 34°C warm temp favoring fungal disease
    diseaseWarmMax: 34
  },
  precipitation: {
    heavyMm: 20             // >= 20 mm heavy rain
  }
};

/**
 * Structured Farmer-First Message Dictionary
 * Ultra-short, high-clarity phrasing designed for easy future localization.
 */
/**
 * Structured Farmer-First Message Dictionary
 * Comprehensive 5-language localization: English, Tamil, Telugu, Malayalam, Hindi.
 */
export const FARMER_MESSAGES = {
  rain_expected: {
    situation: {
      en: "Rain is likely.",
      ta: "மழை வர வாய்ப்பு உள்ளது.",
      te: "వర్షం పడే అవకాశం ఉంది.",
      ml: "മഴ പെയ്യാൻ സാധ്യതയുണ്ട്.",
      hi: "बारिश की संभावना है।"
    },
    action: {
      en: "Skip watering today.",
      ta: "இன்று தண்ணீர் விட வேண்டாம்.",
      te: "ఈరోజు నీరు పెట్టవద్దు.",
      ml: "ഇന്ന് നനയ്ക്കരുത്.",
      hi: "आज सिंचाई न करें।"
    }
  },
  heavy_rain_risk: {
    situation: {
      en: "Heavy rain is expected.",
      ta: "மழை அதிகம் வர வாய்ப்பு உள்ளது.",
      te: "భారీ వర్ష సూచన ఉంది.",
      ml: "കനത്ത മഴയ്ക്ക് സാധ്യതയുണ്ട്.",
      hi: "भारी बारिश की संभावना है।"
    },
    action: {
      en: "Check field drainage and avoid watering.",
      ta: "வடிகால் பாதையைச் சரிபார்க்கவும், தண்ணீர் பாய்ச்ச வேண்டாம்.",
      te: "డ్రైనేజీ తనిఖీ చేయండి, నీరు పెట్టవద్దు.",
      ml: "ചാലുകൾ പരിശോധിക്കുക, നനയ്ക്കരുത്.",
      hi: "जल निकासी जांचें और सिंचाई से बचें।"
    }
  },
  dry_high_heat: {
    situation: {
      en: "Hot and dry conditions.",
      ta: "வெயில் அதிகம் உள்ளது.",
      te: "ఎండ ఎక్కువగా ఉంది.",
      ml: "കടുത്ത ചൂടും വരണ്ട കാലാവസ്ഥയും.",
      hi: "तेज धूप और सूखा मौसम।"
    },
    action: {
      en: "Check soil before watering.",
      ta: "நிலத்தைப் பார்த்து தண்ணீர் விடவும்.",
      te: "నేల తేమ చూసి నీరు పెట్టండి.",
      ml: "മണ്ണ് പരിശോധിച്ച് നനയ്ക്കുക.",
      hi: "मिट्टी देखकर ही सिंचाई करें।"
    }
  },
  normal_irrigation: {
    situation: {
      en: "Normal weather conditions.",
      ta: "வழக்கமான வானிலை.",
      te: "సాధారణ వాతావరణం.",
      ml: "സാധാരണ കാലാവസ്ഥ.",
      hi: "सामान्य मौसम।"
    },
    action: {
      en: "Follow routine watering schedule.",
      ta: "வழக்கம்போல தண்ணீர் விடலாம்.",
      te: "ఎప్పటిలాగే నీరు పెట్టవచ్చు.",
      ml: "പതിവുപോലെ നനയ്ക്കാം.",
      hi: "नियमित रूप से सिंचाई कर सकते हैं।"
    }
  },
  high_wind: {
    situation: {
      en: "Wind is high.",
      ta: "காற்று அதிகம் உள்ளது.",
      te: "గాలి వేగం ఎక్కువగా ఉంది.",
      ml: "കാറ്റ് ശക്തമാണ്.",
      hi: "हवा तेज चल रही है।"
    },
    action: {
      en: "Avoid spraying today.",
      ta: "இன்று மருந்து தெளிக்க வேண்டாம்.",
      te: "ఈరోజు పిచికారీ చేయవద్దు.",
      ml: "ഇന്ന് കീടനാശിനി തളിക്കരുത്.",
      hi: "आज छिड़काव न करें।"
    }
  },
  rain_spray_avoid: {
    situation: {
      en: "Rain is expected soon.",
      ta: "விரைவில் மழை வர வாய்ப்புள்ளது.",
      te: "త్వరలో వర్షం రావచ్చు.",
      ml: "ഉടൻ മഴയ്ക്ക് സാധ്യത.",
      hi: "जल्द बारिश की संभावना है।"
    },
    action: {
      en: "Avoid spraying today.",
      ta: "இன்று மருந்து தெளிப்பதைத் தவிர்க்கவும்.",
      te: "ఈరోజు పిచికారీ చేయవద్దు.",
      ml: "ഇന്ന് മരുന്ന് തളിക്കരുത്.",
      hi: "आज छिड़काव से बचें।"
    }
  },
  caution_spraying: {
    situation: {
      en: "Breezy conditions.",
      ta: "லேசான காற்று வீசுகிறது.",
      te: "కొద్దిగా గాలి వీస్తోంది.",
      ml: "ചെറിയ കാറ്റുണ്ട്.",
      hi: "हल्की तेज हवा है।"
    },
    action: {
      en: "Spray only in calm early hours.",
      ta: "அதிகாலையில் மட்டும் தெளிக்கவும்.",
      te: "ఉదయం ప్రశాంత వేళల్లోనే పిచికారీ చేయండి.",
      ml: "അതിരാവിലെ മാത്രം മരുന്ന് തളിക്കുക.",
      hi: "सुबह शांत समय में ही छिड़काव करें।"
    }
  },
  favorable_spraying: {
    situation: {
      en: "Low wind and clear skies.",
      ta: "காற்று குறைவு, தெளிவான வானம்.",
      te: "తక్కువ గాలి, నిర్మల ఆకాశం.",
      ml: "ശാന്തമായ കാറ്റും തെളിഞ്ഞ ആകാശവും.",
      hi: "शांत हवा और साफ़ मौसम।"
    },
    action: {
      en: "Favorable window for spraying.",
      ta: "மருந்து தெளிக்க நல்ல நேரம்.",
      te: "పిచికారీకి అనుకూలమైన సమయం.",
      ml: "മരുന്ന് തളിക്കാൻ നല്ല സമയം.",
      hi: "छिड़काव के लिए अनुकूल समय।"
    }
  },
  delay_harvest: {
    situation: {
      en: "Rain is likely.",
      ta: "மழை வர வாய்ப்பு உள்ளது.",
      te: "వర్షం పడే అవకాశం ఉంది.",
      ml: "മഴയ്ക്ക് സാധ്യതയുണ്ട്.",
      hi: "बारिश की संभावना है।"
    },
    action: {
      en: "Consider delaying harvest.",
      ta: "அறுவடையைத் தள்ளிப்போடவும்.",
      te: "కోతను కొద్దిగా వాయిదా వేయండి.",
      ml: "വിളവെടുപ്പ് അല്പം മാറ്റിവെക്കുക.",
      hi: "कटाई को कुछ समय टालें।"
    }
  },
  caution_harvest: {
    situation: {
      en: "High humidity.",
      ta: "காற்றில் ஈரம் அதிகம் உள்ளது.",
      te: "గాలిలో తేమ ఎక్కువ.",
      ml: "ഈർപ്പം കൂടുതലാണ്.",
      hi: "हवा में नमी अधिक है।"
    },
    action: {
      en: "Ensure sheltered crop drying space.",
      ta: "பயிர்களைப் பாதுகாக்க இடம் உறுதி செய்யவும்.",
      te: "పంట ఆరబెట్టే స్థలాన్ని సిద్ధం చేయండి.",
      ml: "വിള ഉണക്കാൻ സുരക്ഷിത സ്ഥലം ഉറപ്പാക്കുക.",
      hi: "फसल सुखाने के लिए सुरक्षित स्थान रखें।"
    }
  },
  good_harvest: {
    situation: {
      en: "Dry weather expected.",
      ta: "வானிலை வறண்டு சாதகமாக உள்ளது.",
      te: "పొడి వాతావరణం ఉంటుంది.",
      ml: "വരണ്ട തെളിഞ്ഞ കാലാവസ്ഥ.",
      hi: "सूखा मौसम रहेगा।"
    },
    action: {
      en: "Good window for harvesting.",
      ta: "அறுவடைக்கு வானிலை மிகவும் சிறந்தது.",
      te: "పంట కోతకు మంచి సమయం.",
      ml: "വിളവെടുപ്പിന് അനുയോജ്യമായ സമയം.",
      hi: "फसल कटाई के लिए अच्छा समय है।"
    }
  },
  harvest_if_ready: {
    situation: {
      en: "Dry weather window.",
      ta: "வறண்ட வானிலை நிலவுகிறது.",
      te: "పొడి వాతావరణ సమయం.",
      ml: "അനുകൂല വരണ്ട കാലാവസ്ഥ.",
      hi: "अनुकूल मौसम का समय।"
    },
    action: {
      en: "Weather is suitable if crop is mature.",
      ta: "பயிர் முற்றியிருந்தால் அறுவடை செய்யலாம்.",
      te: "పంట సిద్ధమైతే కోత చేపట్టవచ్చు.",
      ml: "വിള പാകമാണെങ്കിൽ വിളവെടുക്കാം.",
      hi: "फसल पक गई हो तो कटाई कर सकते हैं।"
    }
  },
  high_disease: {
    situation: {
      en: "Rain and humidity are high.",
      ta: "மழையும் ஈரப்பதமும் அதிகம் உள்ளது.",
      te: "వర్షం మరియు తేమ ఎక్కువ.",
      ml: "മഴയും ഈർപ്പവും കൂടുതലാണ്.",
      hi: "बारिश और नमी अधिक है।"
    },
    action: {
      en: "Be careful. Check the leaves.",
      ta: "கவனம். பயிர் இலைகளைப் பரிசோதிக்கவும்.",
      te: "జాగ్రత్త. ఆకులను పరిశీలించండి.",
      ml: "ശ്രദ്ധിക്കുക. ഇലകൾ പരിശോധിക്കുക.",
      hi: "सावधानी रखें। पत्तों की जांच करें।"
    }
  },
  moderate_disease: {
    situation: {
      en: "Moist weather conditions.",
      ta: "ஈரப்பதம் நிலவுகிறது.",
      te: "తేమతో కూడిన వాతావరణం.",
      ml: "ഈർപ്പമുള്ള കാലാവസ്ഥ.",
      hi: "नमी वाला मौसम।"
    },
    action: {
      en: "Monitor the crop closely.",
      ta: "பயிரைக் கவனமாகக் கண்காணிக்கவும்.",
      te: "పంటను నిశితంగా గమనించండి.",
      ml: "വിളകൾ ശ്രദ്ധയോടെ നിരീക്ഷിക്കുക.",
      hi: "फसल की सावधानीपूर्वक निगरानी करें।"
    }
  },
  low_disease: {
    situation: {
      en: "Dry air conditions.",
      ta: "வானிலை வறண்டுள்ளது.",
      te: "పొడి గాలి వాతావరణం.",
      ml: "വരണ്ട വായു.",
      hi: "शुष्क हवा का मौसम।"
    },
    action: {
      en: "Lower disease-conducive risk.",
      ta: "நோய் பரவும் அபாயம் குறைவு.",
      te: "తెగుళ్ల ముప్పు తక్కువ.",
      ml: "രോഗസാധ്യത കുറവാണ്.",
      hi: "रोग का खतरा कम है।"
    }
  },
  disease_missing_data: {
    situation: {
      en: "Humidity data unavailable.",
      ta: "ஈரப்பத விவரம் கிடைக்கவில்லை.",
      te: "తేమ సమాచారం అందుబాటులో లేదు.",
      ml: "ഈർപ്പ വിവരം ലഭ്യമല്ല.",
      hi: "नमी का डेटा उपलब्ध नहीं है।"
    },
    action: {
      en: "Inspect leaves visually.",
      ta: "பயிரை நேரடியாகப் பார்வையிடவும்.",
      te: "ఆకులను నేరుగా పరిశీలించండి.",
      ml: "ഇലകൾ നേരിട്ട് പരിശോധിക്കുക.",
      hi: "पत्तों की प्रत्यक्ष जांच करें।"
    }
  },
  high_heat: {
    situation: {
      en: "High heat expected.",
      ta: "அதிக வெயில் எதிர்பார்க்கப்படுகிறது.",
      te: "ఎండ తీవ్రత ఎక్కువగా ఉంది.",
      ml: "കടുത്ത ചൂടിന് സാധ്യത.",
      hi: "कड़ी धूप रहने की संभावना है।"
    },
    action: {
      en: "Avoid heavy work at midday.",
      ta: "மதிய நேரக் கடின வேலைகளைத் தவிர்க்கவும்.",
      te: "మధ్యాహ్న వేళల్లో శ్రమతో కూడిన పనులు నివారించండి.",
      ml: "ഉച്ചസമയത്തെ കഠിന ജോലി ഒഴിവാക്കുക.",
      hi: "दोपहर में भारी काम से बचें।"
    }
  },
  moderate_heat: {
    situation: {
      en: "Warm conditions expected.",
      ta: "வெதுவெதுப்பான வானிலை.",
      te: "వెచ్చని వాతావరణం ఉంటుంది.",
      ml: "ചൂടുള്ള കാലാവസ്ഥ.",
      hi: "गर्म मौसम की संभावना है।"
    },
    action: {
      en: "Prefer morning or evening work.",
      ta: "காலை அல்லது மாலை வேலை செய்வது நல்லது.",
      te: "ఉదయం లేదా సాయంత్రం వేళల్లో పని చేయడం మంచిది.",
      ml: "രാവിലെ/വൈകുന്നേരം ജോലി ചെയ്യുക.",
      hi: "सुबह या शाम को कार्य करना उचित है।"
    }
  },
  normal_heat: {
    situation: {
      en: "Normal temperatures today.",
      ta: "மிதமான வெப்பநிலை நிலவுகிறது.",
      te: "సాధారణ ఉష్ణోగ్రత.",
      ml: "സാധാരണ താപനില.",
      hi: "सामान्य तापमान रहेगा।"
    },
    action: {
      en: "Normal field hours.",
      ta: "வழக்கமான வேலை நேரம்.",
      te: "ఎప్పటిలాగే పనులు చేసుకోవచ్చు.",
      ml: "സാധാരണ ജോലി സമയം.",
      hi: "सामान्य कार्य समय।"
    }
  },
  stable_weather: {
    situation: {
      en: "Weather conditions are stable.",
      ta: "வானிலை சீராக உள்ளது.",
      te: "వాతావరణం ప్రశాంతంగా ఉంది.",
      ml: "കാലാവസ്ഥ സ്ഥിരതയുള്ളതാണ്.",
      hi: "मौसम शांत और स्थिर है।"
    },
    action: {
      en: "Continue routine farm operations.",
      ta: "வழக்கமான விவசாயப் பணிகளைத் தொடரலாம்.",
      te: "సాధారణ వ్యవసాయ పనులు కొనసాగించండి.",
      ml: "പതിവ് കൃഷിപ്പണികൾ തുടരുക.",
      hi: "नियमित कृषि कार्य जारी रखें।"
    }
  }
};

/**
 * 5-Language Weather Condition Dictionaries
 */
export const WEATHER_CONDITION_TRANSLATIONS = {
  clear_sky: {
    en: "Clear Sky / Sunny",
    ta: "தெளிவான வானம் / வெயில்",
    te: "నిర్మలమైన ఆకాశం / ఎండ",
    ml: "തെളിഞ്ഞ ആകാശം / വെയിൽ",
    hi: "साफ़ आसमान / धूप"
  },
  partly_cloudy: {
    en: "Partly Cloudy",
    ta: "ஓரளவு மேகமூட்டம்",
    te: "పాక్షికంగా మేఘావృతం",
    ml: "ഭാഗികമായി മേഘാവൃതം",
    hi: "आंशिक रूप से बादल छाए रहेंगे"
  },
  misty: {
    en: "Misty / Foggy",
    ta: "பனிமூட்டம்",
    te: "పొగమంచు",
    ml: "മൂടൽമഞ്ഞ്",
    hi: "धुंध / कोहरा"
  },
  light_drizzle: {
    en: "Light Drizzle",
    ta: "லேசான தூறல்",
    te: "తేలికపాటి జల్లులు",
    ml: "നേരിയ ചാറ്റൽമഴ",
    hi: "हल्की बूंदाबांदी"
  },
  rain_showers: {
    en: "Rain Showers",
    ta: "மழைத்தூறல் / மழை",
    te: "వర్షపు జల్లులు",
    ml: "മഴക്കാറ്റ് / മഴ",
    hi: "बारिश की फुहारें"
  },
  heavy_rain: {
    en: "Heavy Rain",
    ta: "கனமழை",
    te: "భారీ వర్షం",
    ml: "കനത്ത മഴ",
    hi: "भारी बारिश"
  },
  thunderstorms: {
    en: "Thunderstorms",
    ta: "இடி மின்னலுடன் கூடிய மழை",
    te: "ఉరుములతో కూడిన వర్షం",
    ml: "ഇടിമിന്നലോടുകൂടിയ മഴ",
    hi: "गरज के साथ बारिश"
  },
  fair_weather: {
    en: "Fair Weather",
    ta: "சீரான வானிலை",
    te: "అనుకూల వాతావరణం",
    ml: "അനുകൂല കാലാവസ്ഥ",
    hi: "अनुकूल मौसम"
  }
};

/**
 * WMO Weather Code Mapper with 5-Language Support
 */
export const mapWmoCode = (code) => {
  if (code === 0) {
    return {
      conditionKey: "clear_sky",
      condition: "Clear Sky / Sunny",
      translations: WEATHER_CONDITION_TRANSLATIONS.clear_sky,
      isRainy: false,
      isThunderstorm: false
    };
  }
  if ([1, 2, 3].includes(code)) {
    return {
      conditionKey: "partly_cloudy",
      condition: "Partly Cloudy",
      translations: WEATHER_CONDITION_TRANSLATIONS.partly_cloudy,
      isRainy: false,
      isThunderstorm: false
    };
  }
  if ([45, 48].includes(code)) {
    return {
      conditionKey: "misty",
      condition: "Misty / Foggy",
      translations: WEATHER_CONDITION_TRANSLATIONS.misty,
      isRainy: false,
      isThunderstorm: false
    };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      conditionKey: "light_drizzle",
      condition: "Light Drizzle",
      translations: WEATHER_CONDITION_TRANSLATIONS.light_drizzle,
      isRainy: true,
      isThunderstorm: false
    };
  }
  if ([61, 63, 65, 66, 67].includes(code)) {
    return {
      conditionKey: "rain_showers",
      condition: "Rain Showers",
      translations: WEATHER_CONDITION_TRANSLATIONS.rain_showers,
      isRainy: true,
      isThunderstorm: false
    };
  }
  if ([80, 81, 82].includes(code)) {
    return {
      conditionKey: "heavy_rain",
      condition: "Heavy Rain",
      translations: WEATHER_CONDITION_TRANSLATIONS.heavy_rain,
      isRainy: true,
      isThunderstorm: false
    };
  }
  if ([95, 96, 99].includes(code)) {
    return {
      conditionKey: "thunderstorms",
      condition: "Thunderstorms",
      translations: WEATHER_CONDITION_TRANSLATIONS.thunderstorms,
      isRainy: true,
      isThunderstorm: true
    };
  }
  return {
    conditionKey: "fair_weather",
    condition: "Fair Weather",
    translations: WEATHER_CONDITION_TRANSLATIONS.fair_weather,
    isRainy: false,
    isThunderstorm: false
  };
};

/**
 * Strict Weather-State to Weather-Asset Mapping
 * Maps real WMO / condition strings to high-resolution, glossy 3D weather icons.
 * @param {string} conditionKey - WMO condition key (e.g. 'clear_sky', 'partly_cloudy')
 * @param {string} conditionText - Human-readable condition text
 * @param {boolean} isDay - Whether it is currently daytime (default: true)
 */
export const getWeatherConditionAsset = (conditionKey = '', conditionText = '', isDay = true) => {
  const key = String(conditionKey || '').toLowerCase();
  const text = String(conditionText || '').toLowerCase();

  // 1. THUNDERSTORM / STORM  (same day or night — storm is storm)
  if (key.includes('thunder') || text.includes('thunder') || text.includes('storm')) {
    return '/dashboard-images/weather_thunderstorm.png';
  }

  // 2. HEAVY RAIN  (same day or night)
  if (key.includes('heavy_rain') || text.includes('heavy rain') || text.includes('downpour')) {
    return '/dashboard-images/weather_heavy_rain.png';
  }

  // 3. LIGHT RAIN / DRIZZLE / SHOWERS / RAIN  (same day or night)
  if (
    key.includes('rain') ||
    key.includes('drizzle') ||
    key.includes('showers') ||
    text.includes('rain') ||
    text.includes('drizzle') ||
    text.includes('shower')
  ) {
    return '/dashboard-images/weather_rain_cloud.png';
  }

  // 4. CLOUDY / OVERCAST / FOG / MIST  (same day or night)
  if (
    key === 'overcast' ||
    key === 'cloudy' ||
    key === 'misty' ||
    text.includes('overcast') ||
    (text.includes('cloudy') && !text.includes('partly')) ||
    text.includes('fog') ||
    text.includes('mist')
  ) {
    return '/dashboard-images/weather_cloudy.png';
  }

  // 5. PARTLY CLOUDY
  if (key.includes('partly_cloudy') || text.includes('partly')) {
    // At night, use cloudy icon (no sun visible)
    return isDay
      ? '/dashboard-images/weather_sun_cloud.png'
      : '/dashboard-images/weather_cloudy.png';
  }

  // 6. CLEAR SKY / SUNNY / FAIR
  if (
    key.includes('clear') ||
    key.includes('sun') ||
    text.includes('clear') ||
    text.includes('sun') ||
    key === 'fair_weather'
  ) {
    // At night, show moon instead of sun
    return isDay
      ? '/dashboard-images/weather_sunny.png'
      : '/dashboard-images/weather_night.png';
  }

  // Safe fallback — day: partly cloudy  /  night: moon
  return isDay
    ? '/dashboard-images/weather_sun_cloud.png'
    : '/dashboard-images/weather_night.png';
};

const safeRound = (val) => val != null && !isNaN(val) ? Math.round(val) : null;

/**
 * Rule-Based Crop-Aware Farm Weather Intelligence Engine
 * 
 * Inputs:
 * - current: { temp, rainProbability, precipitationMm, windSpeed, humidity, condition, isRainy, isThunderstorm }
 * - dailyForecast: Array of 7 days
 * - cropContext: { crop: string | null, cropStage: string | null, variety: string | null }
 * 
 * Output:
 * Simple farmer-first structure:
 * { extremeRisk, todayFarmAction, farmActions, cropContextUsed }
 */
export const evaluateWeatherIntelligence = (current = {}, dailyForecast = [], cropContext = null) => {
  const hasRainProb = current.rainProbability != null && !isNaN(current.rainProbability);
  const rainProb = hasRainProb ? Number(current.rainProbability) : null;

  const hasTemp = current.temp != null && !isNaN(current.temp);
  const temp = hasTemp ? Number(current.temp) : null;

  const hasWind = current.windSpeed != null && !isNaN(parseFloat(current.windSpeed));
  const windSpeed = hasWind ? parseFloat(current.windSpeed) : null;

  const hasHumidity = current.humidity != null && !isNaN(current.humidity);
  const humidity = hasHumidity ? Number(current.humidity) : null;

  const precipitationMm = (current.precipitationMm != null && !isNaN(current.precipitationMm)) 
    ? Number(current.precipitationMm) 
    : 0;

  const isThunderstorm = current.isThunderstorm || 
    (typeof current.condition === 'string' && current.condition.toLowerCase().includes('thunder'));

  const tomorrowRainProb = (dailyForecast[1]?.rainProb != null && !isNaN(dailyForecast[1]?.rainProb))
    ? Number(dailyForecast[1].rainProb)
    : null;

  // Real crop context extraction (NEVER guess crop or stage)
  const rawCropName = cropContext?.crop || cropContext?.primaryCrop || null;
  const rawCropStage = cropContext?.cropStage || cropContext?.stage || null;
  const hasRealCrop = Boolean(rawCropName && typeof rawCropName === 'string' && rawCropName.trim().length > 0);
  const hasRealStage = Boolean(rawCropStage && typeof rawCropStage === 'string' && rawCropStage.trim().length > 0);
  const cropName = hasRealCrop ? rawCropName.trim() : null;
  const cropStage = hasRealStage ? rawCropStage.trim() : null;

  const isStageMatureOrHarvest = hasRealStage && 
    (cropStage.toLowerCase().includes('harvest') || 
     cropStage.toLowerCase().includes('matur') || 
     cropStage.toLowerCase().includes('ripe'));

  // --------------------------------------------------------------------------
  // 1. Extreme Weather Risk Layer (Heavy Rain Risk)
  // --------------------------------------------------------------------------
  const isHeavyRainRisk = 
    (rainProb != null && rainProb >= WEATHER_THRESHOLDS.rain.heavyProb) ||
    precipitationMm >= WEATHER_THRESHOLDS.precipitation.heavyMm ||
    isThunderstorm ||
    (tomorrowRainProb != null && tomorrowRainProb >= WEATHER_THRESHOLDS.rain.heavyProb);

  const extremeRisk = {
    active: isHeavyRainRisk,
    title: 'Heavy Rain Risk',
    titleTa: 'மழை அதிகம் வர வாய்ப்பு',
    severity: 'critical',
    situation: FARMER_MESSAGES.heavy_rain_risk.situation.en,
    situationTa: FARMER_MESSAGES.heavy_rain_risk.situation.ta,
    action: FARMER_MESSAGES.heavy_rain_risk.action.en,
    actionTa: FARMER_MESSAGES.heavy_rain_risk.action.ta,
    source: 'weather'
  };

  // --------------------------------------------------------------------------
  // 2. Crop-Aware Irrigation Intelligence
  // --------------------------------------------------------------------------
  let irrigation;
  if (isHeavyRainRisk) {
    irrigation = {
      id: 'irrigation',
      emoji: '💧',
      title: 'Irrigation',
      titleTa: 'நீர்ப்பாசனம்',
      status: 'Heavy Rain Risk',
      statusTa: 'வேண்டாம்',
      severity: 'critical',
      messageKey: 'heavy_rain_risk',
      situation: FARMER_MESSAGES.heavy_rain_risk.situation.en,
      situationTa: FARMER_MESSAGES.heavy_rain_risk.situation.ta,
      action: FARMER_MESSAGES.heavy_rain_risk.action.en,
      actionTa: FARMER_MESSAGES.heavy_rain_risk.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if (
    (rainProb != null && rainProb > WEATHER_THRESHOLDS.rain.skipIrrigationProb) ||
    (tomorrowRainProb != null && tomorrowRainProb > WEATHER_THRESHOLDS.rain.skipIrrigationProb) ||
    current.isRainy
  ) {
    irrigation = {
      id: 'irrigation',
      emoji: '💧',
      title: 'Irrigation',
      titleTa: 'நீர்ப்பாசனம்',
      status: 'Skip Today',
      statusTa: 'வேண்டாம்',
      severity: 'warning',
      messageKey: 'rain_expected',
      situation: FARMER_MESSAGES.rain_expected.situation.en,
      situationTa: FARMER_MESSAGES.rain_expected.situation.ta,
      action: FARMER_MESSAGES.rain_expected.action.en,
      actionTa: FARMER_MESSAGES.rain_expected.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if (
    hasTemp && temp >= WEATHER_THRESHOLDS.temperature.moderateHeatMin &&
    (rainProb == null || rainProb <= WEATHER_THRESHOLDS.rain.lowProb)
  ) {
    irrigation = {
      id: 'irrigation',
      emoji: '💧',
      title: 'Irrigation',
      titleTa: 'நீர்ப்பாசனம்',
      status: 'Irrigate Now',
      statusTa: 'தேவைப்படலாம்',
      severity: 'info',
      messageKey: 'dry_high_heat',
      situation: FARMER_MESSAGES.dry_high_heat.situation.en,
      situationTa: FARMER_MESSAGES.dry_high_heat.situation.ta,
      action: FARMER_MESSAGES.dry_high_heat.action.en,
      actionTa: FARMER_MESSAGES.dry_high_heat.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200'
    };
  } else {
    irrigation = {
      id: 'irrigation',
      emoji: '💧',
      title: 'Irrigation',
      titleTa: 'நீர்ப்பாசனம்',
      status: 'Normal',
      statusTa: 'வழக்கம்போல',
      severity: 'safe',
      messageKey: 'normal_irrigation',
      situation: FARMER_MESSAGES.normal_irrigation.situation.en,
      situationTa: FARMER_MESSAGES.normal_irrigation.situation.ta,
      action: FARMER_MESSAGES.normal_irrigation.action.en,
      actionTa: FARMER_MESSAGES.normal_irrigation.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  // --------------------------------------------------------------------------
  // 3. Crop-Aware Spraying Intelligence
  // --------------------------------------------------------------------------
  let spraying;
  if (hasWind && windSpeed > WEATHER_THRESHOLDS.wind.avoidSpray) {
    spraying = {
      id: 'spraying',
      emoji: '🧪',
      title: 'Spraying',
      titleTa: 'மருந்து தெளிப்பு',
      status: 'Avoid Today',
      statusTa: 'வேண்டாம்',
      severity: 'critical',
      messageKey: 'high_wind',
      situation: FARMER_MESSAGES.high_wind.situation.en,
      situationTa: FARMER_MESSAGES.high_wind.situation.ta,
      action: FARMER_MESSAGES.high_wind.action.en,
      actionTa: FARMER_MESSAGES.high_wind.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if ((rainProb != null && rainProb > WEATHER_THRESHOLDS.rain.avoidSprayProb) || current.isRainy) {
    spraying = {
      id: 'spraying',
      emoji: '🧪',
      title: 'Spraying',
      titleTa: 'மருந்து தெளிப்பு',
      status: 'Avoid Today',
      statusTa: 'வேண்டாம்',
      severity: 'critical',
      messageKey: 'rain_spray_avoid',
      situation: FARMER_MESSAGES.rain_spray_avoid.situation.en,
      situationTa: FARMER_MESSAGES.rain_spray_avoid.situation.ta,
      action: FARMER_MESSAGES.rain_spray_avoid.action.en,
      actionTa: FARMER_MESSAGES.rain_spray_avoid.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if (hasWind && windSpeed >= WEATHER_THRESHOLDS.wind.cautionSprayMin) {
    spraying = {
      id: 'spraying',
      emoji: '🧪',
      title: 'Spraying',
      titleTa: 'மருந்து தெளிப்பு',
      status: 'Caution',
      statusTa: 'கவனம்',
      severity: 'warning',
      messageKey: 'caution_spraying',
      situation: FARMER_MESSAGES.caution_spraying.situation.en,
      situationTa: FARMER_MESSAGES.caution_spraying.situation.ta,
      action: FARMER_MESSAGES.caution_spraying.action.en,
      actionTa: FARMER_MESSAGES.caution_spraying.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  } else {
    spraying = {
      id: 'spraying',
      emoji: '🧪',
      title: 'Spraying',
      titleTa: 'மருந்து தெளிப்பு',
      status: 'Favorable',
      statusTa: 'செய்யலாம்',
      severity: 'safe',
      messageKey: 'favorable_spraying',
      situation: FARMER_MESSAGES.favorable_spraying.situation.en,
      situationTa: FARMER_MESSAGES.favorable_spraying.situation.ta,
      action: FARMER_MESSAGES.favorable_spraying.action.en,
      actionTa: FARMER_MESSAGES.favorable_spraying.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  // --------------------------------------------------------------------------
  // 4. Crop-Aware Harvest Weather Intelligence
  // --------------------------------------------------------------------------
  let harvest;
  if ((rainProb != null && rainProb > WEATHER_THRESHOLDS.rain.delayHarvestProb) || current.isRainy || isHeavyRainRisk) {
    harvest = {
      id: 'harvest',
      emoji: '🌾',
      title: 'Harvest',
      titleTa: 'அறுவடை',
      status: 'Delay Harvest',
      statusTa: 'பொறுக்கவும்',
      severity: 'critical',
      messageKey: 'delay_harvest',
      situation: FARMER_MESSAGES.delay_harvest.situation.en,
      situationTa: FARMER_MESSAGES.delay_harvest.situation.ta,
      action: FARMER_MESSAGES.delay_harvest.action.en,
      actionTa: FARMER_MESSAGES.delay_harvest.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if (hasHumidity && humidity > WEATHER_THRESHOLDS.humidity.high) {
    harvest = {
      id: 'harvest',
      emoji: '🌾',
      title: 'Harvest',
      titleTa: 'அறுவடை',
      status: 'Caution',
      statusTa: 'கவனம்',
      severity: 'warning',
      messageKey: 'caution_harvest',
      situation: FARMER_MESSAGES.caution_harvest.situation.en,
      situationTa: FARMER_MESSAGES.caution_harvest.situation.ta,
      action: FARMER_MESSAGES.caution_harvest.action.en,
      actionTa: FARMER_MESSAGES.caution_harvest.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  } else if (isStageMatureOrHarvest) {
    // Only claim good window if crop stage confirmed readiness
    harvest = {
      id: 'harvest',
      emoji: '🌾',
      title: 'Harvest',
      titleTa: 'அறுவடை',
      status: 'Good to Harvest',
      statusTa: 'நல்ல நேரம்',
      severity: 'safe',
      messageKey: 'good_harvest',
      situation: FARMER_MESSAGES.good_harvest.situation.en,
      situationTa: FARMER_MESSAGES.good_harvest.situation.ta,
      action: FARMER_MESSAGES.good_harvest.action.en,
      actionTa: FARMER_MESSAGES.good_harvest.action.ta,
      source: 'weather',
      cropContextUsed: true,
      cropName,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  } else {
    // If maturity is unknown or stage is not mature, do NOT claim readiness
    harvest = {
      id: 'harvest',
      emoji: '🌾',
      title: 'Harvest',
      titleTa: 'அறுவடை',
      status: 'Good to Harvest',
      statusTa: 'வானிலை நன்று',
      severity: 'safe',
      messageKey: 'harvest_if_ready',
      situation: FARMER_MESSAGES.harvest_if_ready.situation.en,
      situationTa: FARMER_MESSAGES.harvest_if_ready.situation.ta,
      action: FARMER_MESSAGES.harvest_if_ready.action.en,
      actionTa: FARMER_MESSAGES.harvest_if_ready.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  // --------------------------------------------------------------------------
  // 5. Crop-Aware Disease Weather Risk (Weather-Conducive Risk Only)
  // --------------------------------------------------------------------------
  let disease;
  if (!hasHumidity) {
    disease = {
      id: 'disease',
      emoji: '🦠',
      title: 'Disease Risk',
      titleTa: 'நோய் வாய்ப்பு',
      status: 'Low Risk',
      statusTa: 'குறைவு',
      severity: 'safe',
      messageKey: 'disease_missing_data',
      situation: FARMER_MESSAGES.disease_missing_data.situation.en,
      situationTa: FARMER_MESSAGES.disease_missing_data.situation.ta,
      action: FARMER_MESSAGES.disease_missing_data.action.en,
      actionTa: FARMER_MESSAGES.disease_missing_data.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200'
    };
  } else {
    const isWarmTemp = hasTemp && temp >= WEATHER_THRESHOLDS.temperature.diseaseWarmMin && temp <= WEATHER_THRESHOLDS.temperature.diseaseWarmMax;
    const isHighHumidity = humidity > WEATHER_THRESHOLDS.humidity.high;
    const isModHumidity = humidity > WEATHER_THRESHOLDS.humidity.moderate;

    if (isWarmTemp && isHighHumidity) {
      disease = {
        id: 'disease',
        emoji: '🦠',
        title: 'Disease Risk',
        titleTa: 'நோய் வாய்ப்பு',
        status: 'High Risk',
        statusTa: 'அதிக வாய்ப்பு',
        severity: 'critical',
        messageKey: 'high_disease',
        situation: FARMER_MESSAGES.high_disease.situation.en,
        situationTa: FARMER_MESSAGES.high_disease.situation.ta,
        action: FARMER_MESSAGES.high_disease.action.en,
        actionTa: FARMER_MESSAGES.high_disease.action.ta,
        source: 'weather',
        cropContextUsed: hasRealCrop,
        cropName,
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    } else if (isModHumidity) {
      disease = {
        id: 'disease',
        emoji: '🦠',
        title: 'Disease Risk',
        titleTa: 'நோய் வாய்ப்பு',
        status: 'Moderate Risk',
        statusTa: 'கவனம்',
        severity: 'warning',
        messageKey: 'moderate_disease',
        situation: FARMER_MESSAGES.moderate_disease.situation.en,
        situationTa: FARMER_MESSAGES.moderate_disease.situation.ta,
        action: FARMER_MESSAGES.moderate_disease.action.en,
        actionTa: FARMER_MESSAGES.moderate_disease.action.ta,
        source: 'weather',
        cropContextUsed: hasRealCrop,
        cropName,
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    } else {
      disease = {
        id: 'disease',
        emoji: '🦠',
        title: 'Disease Risk',
        titleTa: 'நோய் வாய்ப்பு',
        status: 'Low Risk',
        statusTa: 'குறைவு',
        severity: 'safe',
        messageKey: 'low_disease',
        situation: FARMER_MESSAGES.low_disease.situation.en,
        situationTa: FARMER_MESSAGES.low_disease.situation.ta,
        action: FARMER_MESSAGES.low_disease.action.en,
        actionTa: FARMER_MESSAGES.low_disease.action.ta,
        source: 'weather',
        cropContextUsed: hasRealCrop,
        cropName,
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
  }

  // --------------------------------------------------------------------------
  // 6. Crop-Aware Heat Risk
  // --------------------------------------------------------------------------
  let heat;
  if (!hasTemp) {
    heat = {
      id: 'heat',
      emoji: '☀️',
      title: 'Heat Risk',
      titleTa: 'வெயில் தாக்கம்',
      status: 'Normal',
      statusTa: 'இயல்பு',
      severity: 'safe',
      messageKey: 'normal_heat',
      situation: FARMER_MESSAGES.normal_heat.situation.en,
      situationTa: FARMER_MESSAGES.normal_heat.situation.ta,
      action: FARMER_MESSAGES.normal_heat.action.en,
      actionTa: FARMER_MESSAGES.normal_heat.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200'
    };
  } else if (temp >= WEATHER_THRESHOLDS.temperature.highHeat) {
    heat = {
      id: 'heat',
      emoji: '☀️',
      title: 'Heat Risk',
      titleTa: 'வெயில் தாக்கம்',
      status: 'High Heat',
      statusTa: 'அதிக வெயில்',
      severity: 'critical',
      messageKey: 'high_heat',
      situation: FARMER_MESSAGES.high_heat.situation.en,
      situationTa: FARMER_MESSAGES.high_heat.situation.ta,
      action: FARMER_MESSAGES.high_heat.action.en,
      actionTa: FARMER_MESSAGES.high_heat.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else if (temp >= WEATHER_THRESHOLDS.temperature.moderateHeatMin) {
    heat = {
      id: 'heat',
      emoji: '☀️',
      title: 'Heat Risk',
      titleTa: 'வெயில் தாக்கம்',
      status: 'Moderate Heat',
      statusTa: 'மிதமானது',
      severity: 'warning',
      messageKey: 'moderate_heat',
      situation: FARMER_MESSAGES.moderate_heat.situation.en,
      situationTa: FARMER_MESSAGES.moderate_heat.situation.ta,
      action: FARMER_MESSAGES.moderate_heat.action.en,
      actionTa: FARMER_MESSAGES.moderate_heat.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  } else {
    heat = {
      id: 'heat',
      emoji: '☀️',
      title: 'Heat Risk',
      titleTa: 'வெயில் தாக்கம்',
      status: 'Normal',
      statusTa: 'இயல்பு',
      severity: 'safe',
      messageKey: 'normal_heat',
      situation: FARMER_MESSAGES.normal_heat.situation.en,
      situationTa: FARMER_MESSAGES.normal_heat.situation.ta,
      action: FARMER_MESSAGES.normal_heat.action.en,
      actionTa: FARMER_MESSAGES.normal_heat.action.ta,
      source: 'weather',
      cropContextUsed: hasRealCrop,
      cropName,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  // --------------------------------------------------------------------------
  // 7. Today's Farm Action Synthesis
  // Priority: 1. Extreme Rain -> 2. High Heat -> 3. Irrigation -> 4. Spraying -> 5. Harvest -> 6. Disease -> 7. Normal
  // --------------------------------------------------------------------------
  let todayFarmAction;
  if (extremeRisk.active) {
    todayFarmAction = {
      icon: '🌧️',
      statusIcon: '🔴',
      headline: 'Heavy Rain Risk',
      headlineTa: 'மழை அதிகம் வர வாய்ப்பு',
      headlineTe: 'భారీ వర్ష సూచన',
      headlineMl: 'കനത്ത മഴ മുന്നറിയിപ്പ്',
      headlineHi: 'भारी बारिश की चेतावनी',
      situation: extremeRisk.situation,
      situationTa: extremeRisk.situationTa,
      situationTe: FARMER_MESSAGES.heavy_rain_risk.situation.te,
      situationMl: FARMER_MESSAGES.heavy_rain_risk.situation.ml,
      situationHi: FARMER_MESSAGES.heavy_rain_risk.situation.hi,
      action: extremeRisk.action,
      actionTa: extremeRisk.actionTa,
      actionTe: FARMER_MESSAGES.heavy_rain_risk.action.te,
      actionMl: FARMER_MESSAGES.heavy_rain_risk.action.ml,
      actionHi: FARMER_MESSAGES.heavy_rain_risk.action.hi,
      severity: 'critical'
    };
  } else if (heat.severity === 'critical') {
    todayFarmAction = {
      icon: '☀️',
      statusIcon: '🔴',
      headline: 'High Heat Advisory',
      headlineTa: 'வெயில் அதிகம்',
      headlineTe: 'తీవ్ర ఎండ హెచ్చరిక',
      headlineMl: 'കടുത്ത ചൂട് മുന്നറിയിപ്പ്',
      headlineHi: 'अत्यधिक गर्मी की चेतावनी',
      situation: heat.situation,
      situationTa: heat.situationTa,
      situationTe: FARMER_MESSAGES.high_heat.situation.te,
      situationMl: FARMER_MESSAGES.high_heat.situation.ml,
      situationHi: FARMER_MESSAGES.high_heat.situation.hi,
      action: heat.action,
      actionTa: heat.actionTa,
      actionTe: FARMER_MESSAGES.high_heat.action.te,
      actionMl: FARMER_MESSAGES.high_heat.action.ml,
      actionHi: FARMER_MESSAGES.high_heat.action.hi,
      severity: 'critical'
    };
  } else if (irrigation.status === 'Skip Today') {
    todayFarmAction = {
      icon: '🌧️',
      statusIcon: '🔴',
      headline: 'Irrigation Advisory',
      headlineTa: 'மழை வர வாய்ப்பு',
      headlineTe: 'నీటిపారుదల సలహా',
      headlineMl: 'ജലസേചന ഉപദേശം',
      headlineHi: 'सिंचाई परामर्श',
      situation: irrigation.situation,
      situationTa: irrigation.situationTa,
      situationTe: FARMER_MESSAGES.rain_expected.situation.te,
      situationMl: FARMER_MESSAGES.rain_expected.situation.ml,
      situationHi: FARMER_MESSAGES.rain_expected.situation.hi,
      action: irrigation.action,
      actionTa: irrigation.actionTa,
      actionTe: FARMER_MESSAGES.rain_expected.action.te,
      actionMl: FARMER_MESSAGES.rain_expected.action.ml,
      actionHi: FARMER_MESSAGES.rain_expected.action.hi,
      severity: 'warning'
    };
  } else if (spraying.status === 'Avoid Today') {
    todayFarmAction = {
      icon: '💨',
      statusIcon: '🔴',
      headline: 'Spraying Advisory',
      headlineTa: 'காற்று அதிகம்',
      headlineTe: 'పిచికారీ సలహా',
      headlineMl: 'മരുന്ന് തളിക്കൽ ഉപദേശം',
      headlineHi: 'छिड़काव परामर्श',
      situation: spraying.situation,
      situationTa: spraying.situationTa,
      situationTe: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.situation.te) || FARMER_MESSAGES.high_wind.situation.te,
      situationMl: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.situation.ml) || FARMER_MESSAGES.high_wind.situation.ml,
      situationHi: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.situation.hi) || FARMER_MESSAGES.high_wind.situation.hi,
      action: spraying.action,
      actionTa: spraying.actionTa,
      actionTe: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.action.te) || FARMER_MESSAGES.high_wind.action.te,
      actionMl: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.action.ml) || FARMER_MESSAGES.high_wind.action.ml,
      actionHi: (spraying.messageKey && FARMER_MESSAGES[spraying.messageKey]?.action.hi) || FARMER_MESSAGES.high_wind.action.hi,
      severity: 'warning'
    };
  } else if (harvest.status === 'Delay Harvest') {
    todayFarmAction = {
      icon: '🌧️',
      statusIcon: '🟡',
      headline: 'Harvest Advisory',
      headlineTa: 'மழை வர வாய்ப்பு',
      headlineTe: 'పంట కోత సలహా',
      headlineMl: 'വിളവെടുപ്പ് ഉപദേശം',
      headlineHi: 'कटाई परामर्श',
      situation: harvest.situation,
      situationTa: harvest.situationTa,
      situationTe: FARMER_MESSAGES.delay_harvest.situation.te,
      situationMl: FARMER_MESSAGES.delay_harvest.situation.ml,
      situationHi: FARMER_MESSAGES.delay_harvest.situation.hi,
      action: harvest.action,
      actionTa: harvest.actionTa,
      actionTe: FARMER_MESSAGES.delay_harvest.action.te,
      actionMl: FARMER_MESSAGES.delay_harvest.action.ml,
      actionHi: FARMER_MESSAGES.delay_harvest.action.hi,
      severity: 'warning'
    };
  } else if (disease.status === 'High Risk') {
    todayFarmAction = {
      icon: '🦠',
      statusIcon: '🟡',
      headline: 'Disease Risk Advisory',
      headlineTa: 'மழையும் ஈரமும் அதிகம்',
      headlineTe: 'తెగుళ్ల ప్రమాద హెచ్చరిక',
      headlineMl: 'രോഗസാധ്യത മുന്നറിയിപ്പ്',
      headlineHi: 'रोग जोखिम परामर्श',
      situation: disease.situation,
      situationTa: disease.situationTa,
      situationTe: FARMER_MESSAGES.high_disease.situation.te,
      situationMl: FARMER_MESSAGES.high_disease.situation.ml,
      situationHi: FARMER_MESSAGES.high_disease.situation.hi,
      action: disease.action,
      actionTa: disease.actionTa,
      actionTe: FARMER_MESSAGES.high_disease.action.te,
      actionMl: FARMER_MESSAGES.high_disease.action.ml,
      actionHi: FARMER_MESSAGES.high_disease.action.hi,
      severity: 'warning'
    };
  } else {
    todayFarmAction = {
      icon: '🌱',
      statusIcon: '🟢',
      headline: "Today's Farm Action",
      headlineTa: 'வானிலை சீராக உள்ளது',
      headlineTe: 'వాతావరణం ప్రశాంతంగా ఉంది',
      headlineMl: 'കാലാവസ്ഥ സ്ഥിരതയുള്ളതാണ്',
      headlineHi: 'मौसम अनुकूल है',
      situation: FARMER_MESSAGES.stable_weather.situation.en,
      situationTa: FARMER_MESSAGES.stable_weather.situation.ta,
      situationTe: FARMER_MESSAGES.stable_weather.situation.te,
      situationMl: FARMER_MESSAGES.stable_weather.situation.ml,
      situationHi: FARMER_MESSAGES.stable_weather.situation.hi,
      action: FARMER_MESSAGES.stable_weather.action.en,
      actionTa: FARMER_MESSAGES.stable_weather.action.ta,
      actionTe: FARMER_MESSAGES.stable_weather.action.te,
      actionMl: FARMER_MESSAGES.stable_weather.action.ml,
      actionHi: FARMER_MESSAGES.stable_weather.action.hi,
      severity: 'safe'
    };
  }

  // 5 Operational Action Cards in strictly defined priority
  const farmActions = [
    irrigation,
    spraying,
    harvest,
    disease,
    heat
  ];

  return {
    extremeRisk,
    todayFarmAction,
    farmActions,
    cropContextUsed: hasRealCrop,
    cropName,
    cropStage
  };
};

/**
 * Location Acquisition Engine
 */
export const acquireLocation = async (preferredState = "Tamil Nadu", preferredDistrict = "Thanjavur", forceGps = false) => {
  const fallbackCoords = getLocationCoordinates(preferredState, preferredDistrict);
  const fallbackLocationName = `${preferredDistrict}, ${preferredState}`;

  const previouslyDenied = typeof localStorage !== 'undefined' && localStorage.getItem('agri_weather_gps_denied') === 'true';

  if (!forceGps && (previouslyDenied || (preferredDistrict && preferredState))) {
    let lat = fallbackCoords.lat;
    let lon = fallbackCoords.lon;
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(preferredDistrict)}&admin1=${encodeURIComponent(preferredState)}&country=India&count=1`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }
      }
    } catch {}

    return {
      status: previouslyDenied ? 'FALLBACK_PREVIOUSLY_DENIED' : 'FARM_LOCATION',
      lat,
      lon,
      locationName: fallbackLocationName,
      isGps: false,
      message: previouslyDenied 
        ? 'Using selected farm location (GPS previously declined)'
        : `Using farm location (${fallbackLocationName})`
    };
  }

  if (!navigator?.geolocation) {
    return {
      status: 'UNAVAILABLE',
      lat: fallbackCoords.lat,
      lon: fallbackCoords.lon,
      locationName: fallbackLocationName,
      isGps: false,
      message: 'Geolocation is not supported by your browser. Using farm location.'
    };
  }

  return new Promise((resolve) => {
    let completed = false;

    const timeoutTimer = setTimeout(() => {
      if (completed) return;
      completed = true;
      resolve({
        status: 'TIMEOUT',
        lat: fallbackCoords.lat,
        lon: fallbackCoords.lon,
        locationName: fallbackLocationName,
        isGps: false,
        message: 'GPS signal timed out. Using farm location.'
      });
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutTimer);

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        let resolvedName = `GPS (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const city = revData.city || revData.locality || revData.principalSubdivision;
            const state = revData.principalSubdivision;
            if (city && state) {
              resolvedName = `${city}, ${state}`;
            } else if (city || state) {
              resolvedName = city || state;
            }
          }
        } catch {
          resolvedName = fallbackLocationName;
        }

        if (typeof localStorage !== 'undefined') localStorage.removeItem('agri_weather_gps_denied');

        resolve({
          status: 'GRANTED',
          lat,
          lon,
          locationName: resolvedName,
          isGps: true,
          message: 'Real-time GPS location acquired.'
        });
      },
      (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutTimer);

        if (error.code === error.PERMISSION_DENIED) {
          if (typeof localStorage !== 'undefined') localStorage.setItem('agri_weather_gps_denied', 'true');
          resolve({
            status: 'DENIED',
            lat: fallbackCoords.lat,
            lon: fallbackCoords.lon,
            locationName: fallbackLocationName,
            isGps: false,
            message: 'Location permission denied. Using farm district location.'
          });
        } else if (error.code === error.TIMEOUT) {
          resolve({
            status: 'TIMEOUT',
            lat: fallbackCoords.lat,
            lon: fallbackCoords.lon,
            locationName: fallbackLocationName,
            isGps: false,
            message: 'GPS request timed out. Using farm district location.'
          });
        } else {
          resolve({
            status: 'UNAVAILABLE',
            lat: fallbackCoords.lat,
            lon: fallbackCoords.lon,
            locationName: fallbackLocationName,
            isGps: false,
            message: 'GPS location unavailable. Using farm district location.'
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  });
};

/**
 * Fetch Real Live Weather from Open-Meteo & Run Crop-Aware Intelligence
 */
export const fetchRealWeatherByCoords = async (lat, lon, locationName = "Farm Location", cropContext = null) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 9000);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const res = await fetch(url, { signal: abortController.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Weather service returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const currentWmo = mapWmoCode(data.current?.weather_code || 0);

    // Determine day/night: prefer Open-Meteo is_day field (1 = day, 0 = night),
    // fall back to local time check (6:00 AM – 7:00 PM = daytime).
    const apiIsDay = data.current?.is_day;
    const isDaytime = apiIsDay != null
      ? Boolean(apiIsDay === 1 || apiIsDay === true)
      : (() => { const h = new Date().getHours(); return h >= 6 && h < 19; })();

    // Current Weather Object
    const current = {
      location: locationName,
      temp: safeRound(data.current?.temperature_2m) ?? null,
      feelsLike: safeRound(data.current?.apparent_temperature) ?? safeRound(data.current?.temperature_2m) ?? null,
      condition: currentWmo.condition,
      conditionKey: currentWmo.conditionKey,
      conditionTranslations: currentWmo.translations,
      isRainy: currentWmo.isRainy,
      isThunderstorm: currentWmo.isThunderstorm,
      isDay: isDaytime,
      humidity: safeRound(data.current?.relative_humidity_2m) ?? null,
      rainProbability: data.daily?.precipitation_probability_max?.[0] != null 
        ? Math.round(data.daily.precipitation_probability_max[0]) 
        : null,
      precipitationMm: data.current?.precipitation != null ? Number(data.current.precipitation) : 0,
      windSpeed: data.current?.wind_speed_10m != null ? `${safeRound(data.current.wind_speed_10m)} km/h` : null,
      pressure: data.current?.surface_pressure != null ? `${safeRound(data.current.surface_pressure)} hPa` : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // 7-Day Forecast
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyForecast = (data.daily?.time || []).map((dateStr, idx) => {
      const dateObj = new Date(dateStr);
      const dayName = idx === 0 ? "Today" : daysOfWeek[dateObj.getDay()];
      const wmo = mapWmoCode(data.daily?.weather_code?.[idx] || 0);
      const high = safeRound(data.daily?.temperature_2m_max?.[idx]) ?? (current.temp != null ? current.temp + 1 : '--');
      const low = safeRound(data.daily?.temperature_2m_min?.[idx]) ?? (current.temp != null ? current.temp - 8 : '--');
      const rainProb = data.daily?.precipitation_probability_max?.[idx] != null
        ? Math.round(data.daily.precipitation_probability_max[idx])
        : (wmo.isRainy ? 70 : 15);

      return {
        dayName,
        date: dateStr,
        condition: wmo.condition,
        conditionKey: wmo.conditionKey,
        conditionTranslations: wmo.translations,
        temp: `${high}° / ${low}°`,
        high,
        low,
        rainProb,
        isToday: idx === 0
      };
    });

    // Run Rule-Based Crop-Aware Intelligence
    const intelligence = evaluateWeatherIntelligence(current, dailyForecast, cropContext);

    return {
      weather: {
        current,
        dailyForecast,
        ...intelligence
      },
      error: null
    };
  } catch (err) {
    return {
      weather: null,
      error: err.name === 'AbortError' 
        ? 'Weather request timed out. Please check your connection.'
        : 'Failed to fetch live weather data. Please try again.'
    };
  }
};
