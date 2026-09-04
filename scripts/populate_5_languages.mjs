import fs from 'fs';
import path from 'path';

const baseDir = path.resolve('src/locales');

// Load current locales
const enPath = path.join(baseDir, 'en.json');
const taPath = path.join(baseDir, 'ta.json');
const tePath = path.join(baseDir, 'te.json');
const mlPath = path.join(baseDir, 'ml.json');
const hiPath = path.join(baseDir, 'hi.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const ta = JSON.parse(fs.readFileSync(taPath, 'utf-8'));
const te = JSON.parse(fs.readFileSync(tePath, 'utf-8'));
const ml = JSON.parse(fs.readFileSync(mlPath, 'utf-8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf-8'));

// New comprehensive translation batches for Dashboard, Agro Monitoring, Market, Schemes, Settings, Alerts
const newTranslations = {
  welcome_back: {
    en: "Welcome back",
    ta: "மீண்டும் வருக",
    te: "తిరిగి స్వాగతం",
    ml: "തിരികെ സ്വാഗതം",
    hi: "वापसी पर स्वागत है"
  },
  smart_farming_tagline: {
    en: "Smart Farming,\nBetter Tomorrow.",
    ta: "ஸ்மார்ட் விவசாயம்,\nசிறந்த எதிர்காலம்.",
    te: "స్మార్ట్ వ్యవసాయం,\nమెరుగైన రేపు.",
    ml: "സ്മാർട്ട് കൃഷി,\nമികച്ച നാളെ.",
    hi: "स्मार्ट खेती,\nबेहतर कल।"
  },
  humidity_label: {
    en: "Humidity",
    ta: "ஈரப்பதம்",
    te: "తేమ",
    ml: "ഈർപ്പം",
    hi: "नमी"
  },
  wind_label: {
    en: "Wind",
    ta: "காற்று",
    te: "గాలి",
    ml: "കാറ്റ്",
    hi: "हवा"
  },
  seven_day_forecast: {
    en: "7 Day Forecast",
    ta: "7 நாள் வானிலை முன்னறிவிப்பு",
    te: "7 రోజుల వాతావరణ సూచన",
    ml: "7 ദിവസത്തെ പ്രവചനം",
    hi: "7 दिवसीय मौसम पूर्वानुमान"
  },
  check_weather_updates: {
    en: "Check weather updates",
    ta: "வானிலை விவரங்களைச் சரிபார்க்கவும்",
    te: "వాతావరణ వివరాలను తనిఖీ చేయండి",
    ml: "കാലാവസ്ഥാ വിവരങ്ങൾ പരിശോധിക്കുക",
    hi: "मौसम अपडेट देखें"
  },
  view_forecast: {
    en: "View Forecast",
    ta: "முன்னறிவிப்பைப் பார்க்கவும்",
    te: "సూచనను చూడండి",
    ml: "പ്രവചനം കാണുക",
    hi: "पूर्वानुमान देखें"
  },
  view_all: {
    en: "View All",
    ta: "அனைத்தையும் காண்க",
    te: "అన్నీ చూడండి",
    ml: "എല്ലാം കാണുക",
    hi: "सभी देखें"
  },
  quick_access: {
    en: "Quick Access",
    ta: "விரைவு அணுகல்",
    te: "త్వరిత ప్రాప్యత",
    ml: "ദ്രുത പ്രവേശനം",
    hi: "त्वरित पहुँच"
  },
  nav_crop: {
    en: "Crop",
    ta: "பயிர்",
    te: "పంట",
    ml: "വിള",
    hi: "फसल"
  },
  nav_farm_ai: {
    en: "Farm AI",
    ta: "பண்ணை AI",
    te: "ఫామ్ AI",
    ml: "ഫാം AI",
    hi: "फार्म AI"
  },
  nav_agro_monitoring: {
    en: "Agro Monitoring",
    ta: "பண்ணை கண்காணிப்பு",
    te: "వ్యవసాయ పర్యవేక్షణ",
    ml: "കാർഷിക നിരീക്ഷണം",
    hi: "कृषि निगरानी"
  },
  nav_agri_prices: {
    en: "Agri Prices",
    ta: "விவசாய விலைகள்",
    te: "వ్యవసాయ ధరలు",
    ml: "കാർഷിക വിലകൾ",
    hi: "कृषि मूल्य"
  },
  nav_govt_schemes: {
    en: "Govt Schemes",
    ta: "அரசு திட்டங்கள்",
    te: "ప్రభుత్వ పథకాలు",
    ml: "സർക്കാർ പദ്ധതികൾ",
    hi: "सरकारी योजनाएं"
  },
  nav_smart_irrigation: {
    en: "Smart Irrigation",
    ta: "ஸ்மார்ட் பாசனம்",
    te: "స్మార్ట్ సాగునీరు",
    ml: "സ്മാർട്ട് ജലസേചനം",
    hi: "स्मार्ट सिंचाई"
  },
  nav_weather_meteorology: {
    en: "Weather",
    ta: "வானிலை",
    te: "వాతావరణం",
    ml: "കാലാവസ്ഥ",
    hi: "मौसम"
  },
  field_status_healthy: {
    en: "Field Status: Healthy",
    ta: "வயல் நிலை: ஆரோக்கியமானது",
    te: "క్షేత్ర స్థితి: ఆరోగ్యకరమైనది",
    ml: "വയൽ നില: ആരോഗ്യകരം",
    hi: "खेत की स्थिति: स्वस्थ"
  },
  all_systems_normal: {
    en: "All systems normal",
    ta: "அனைத்து அமைப்புகளும் சீராக உள்ளன",
    te: "అన్ని వ్యవస్థలు సాధారణంగా ఉన్నాయి",
    ml: "എല്ലാ സിസ്റ്റങ്ങളും സാധാരണ നിലയിലാണ്",
    hi: "सभी प्रणालियाँ सामान्य हैं"
  },
  connecting_sensors: {
    en: "Connecting to live sensors...",
    ta: "நேரடி சென்சார்களுடன் இணைகிறது...",
    te: "ప్రత్యక్ష సెన్సార్‌లకు కనెక్ట్ అవుతోంది...",
    ml: "ലൈവ് സെൻസറുകളിലേക്ക് ബന്ധിപ്പിക്കുന്നു...",
    hi: "लाइव सेंसर से कनेक्ट हो रहा है..."
  },
  status_live: {
    en: "Live",
    ta: "நேரலை",
    te: "లైవ్",
    ml: "തത്സമയം",
    hi: "लाइव"
  },
  status_connecting: {
    en: "Connecting",
    ta: "இணைகிறது",
    te: "కనెక్ట్ అవుతోంది",
    ml: "കണക്റ്റുചെയ്യുന്നു",
    hi: "कनेक्ट हो रहा है"
  },
  last_update: {
    en: "Last Update",
    ta: "கடைசி புதுப்பிப்பு",
    te: "చివరి అప్‌డేట్",
    ml: "അവസാന അപ്‌ഡേറ്റ്",
    hi: "अंतिम अपडेट"
  },
  live_sensor_readings: {
    en: "Live Sensor Readings",
    ta: "நேரடி சென்சார் அளவீடுகள்",
    te: "ప్రత్యక్ష సెన్సార్ రీడింగ్‌లు",
    ml: "തത്സമയ സെൻസർ അളവുകൾ",
    hi: "लाइव सेंसर रीडिंग"
  },
  temperature_label: {
    en: "Temperature",
    ta: "வெப்பநிலை",
    te: "ఉష్ణోగ్రత",
    ml: "താപനില",
    hi: "तापमान"
  },
  status_high: {
    en: "High",
    ta: "அதிகம்",
    te: "అధికం",
    ml: "ഉയർന്നത്",
    hi: "उच्च"
  },
  status_normal: {
    en: "Normal",
    ta: "சீரானது",
    te: "సాధారణం",
    ml: "സാധാരണം",
    hi: "सामान्य"
  },
  awaiting_data: {
    en: "Awaiting Data",
    ta: "தரவுக்காகக் காத்திருக்கிறது",
    te: "డేటా కోసం వేచి ఉంది",
    ml: "ഡാറ്റയ്ക്കായി കാത്തിരിക്കുന്നു",
    hi: "डेटा की प्रतीक्षा है"
  },
  status_detected: {
    en: "Object Detected",
    ta: "பொருள் கண்டறியப்பட்டது",
    te: "వస్తువు గుర్తించబడింది",
    ml: "വസ്തു കണ്ടെത്തി",
    hi: "वस्तु का पता चला"
  },
  status_clear: {
    en: "Field Clear",
    ta: "வயல் பாதுகாப்பாக உள்ளது",
    te: "క్షేత్రం స్పష్టంగా ఉంది",
    ml: "വയൽ സുരക്ഷിതം",
    hi: "खेत सुरक्षित है"
  },
  sensor_offline: {
    en: "Sensor Offline",
    ta: "சென்சார் ஆஃப்லைன்",
    te: "సెన్సార్ ఆఫ్‌లైన్",
    ml: "സെൻസർ ഓഫ്‌ലൈൻ",
    hi: "सेंसर ऑफ़लाइन"
  },
  sensors_connected_node: {
    en: "Sensors connected via field node",
    ta: "வயல் முனையம் வழியாக சென்சார்கள் இணைக்கப்பட்டுள்ளன",
    te: "ఫీల్డ్ నోడ్ ద్వారా సెన్సార్లు కనెక్ట్ చేయబడ్డాయి",
    ml: "ഫീൽഡ് നോഡ് വഴി സെൻസറുകൾ ബന്ധിപ്പിച്ചിരിക്കുന്നു",
    hi: "फील्ड नोड के माध्यम से सेंसर जुड़े हैं"
  },
  proximity_range: {
    en: "Proximity Range",
    ta: "அருகாமைத் தூரம்",
    te: "సామీప్య పరిధి",
    ml: "സാമീപ്യ പരിധി",
    hi: "निकटता सीमा"
  },
  govt_schemes_title: {
    en: "Government Schemes",
    ta: "அரசு நலத்திட்டங்கள்",
    te: "ప్రభుత్వ పథకాలు",
    ml: "സർക്കാർ പദ്ധതികൾ",
    hi: "सरकारी योजनाएं"
  },
  govt_schemes_subtitle: {
    en: "Verified agricultural subsidies, credit support & government schemes",
    ta: "சரிபார்க்கப்பட்ட விவசாய மானியங்கள், கடன் ஆதரவு மற்றும் அரசு நலத்திட்டங்கள்",
    te: "ధృవీకరించబడిన వ్యవసాయ రాయితీలు, రుణ మద్దతు మరియు ప్రభుత్వ పథకాలు",
    ml: "പരിശോധിച്ച കാർഷിക സബ്‌സിഡികൾ, വായ്പാ പിന്തുണ, സർക്കാർ പദ്ധതികൾ",
    hi: "सत्यापित कृषि सब्सिडी, ऋण सहायता और सरकारी योजनाएं"
  },
  search_schemes_placeholder: {
    en: "Search schemes by keyword, crop, benefits...",
    ta: "திட்டங்களைத் தேடுங்கள்...",
    te: "పథకాలను శోధించండి...",
    ml: "പദ്ധതികൾ തിരയുക...",
    hi: "योजनाएं खोजें..."
  },
  category_all: {
    en: "All",
    ta: "அனைத்தும்",
    te: "అన్నీ",
    ml: "എല്ലാം",
    hi: "सभी"
  },
  category_financial: {
    en: "Financial Support",
    ta: "நிதி உதவி",
    te: "ఆర్థిక మద్దతు",
    ml: "സാമ്പത്തിക സഹായം",
    hi: "वित्तीय सहायता"
  },
  category_irrigation: {
    en: "Irrigation & Water",
    ta: "பாசனம் & நீர்",
    te: "సాగునీరు & నీరు",
    ml: "ജലസേചനവും വെള്ളവും",
    hi: "सिंचाई और जल"
  },
  category_insurance: {
    en: "Crop Insurance",
    ta: "பயிர் காப்பீடு",
    te: "పంట భీమా",
    ml: "വിള ഇൻഷുറൻസ്",
    hi: "फसल बीमा"
  },
  category_subsidies: {
    en: "Subsidies & Inputs",
    ta: "மானியங்கள் & இடுபொருட்கள்",
    te: "రాయితీలు & ఇన్‌పుట్‌లు",
    ml: "സബ്‌സിഡികളും ഉപകരണങ്ങളും",
    hi: "सब्सिडी और कृषि सामग्री"
  },
  scheme_eligibility: {
    en: "Eligibility",
    ta: "தகுதி வரம்புகள்",
    te: "అర్హత",
    ml: "യോഗ്യത",
    hi: "पात्रता"
  },
  scheme_benefits: {
    en: "Benefits",
    ta: "பயன்கள் & நன்மைகள்",
    te: "ప్రయోజనాలు",
    ml: "ആനുകൂല്യങ്ങൾ",
    hi: "लाभ"
  },
  scheme_documents: {
    en: "Documents Required",
    ta: "தேவையான ஆவணங்கள்",
    te: "అవసరమైన పత్రాలు",
    ml: "ആവശ്യമായ രേഖകൾ",
    hi: "आवश्यक दस्तावेज"
  },
  scheme_how_to_apply: {
    en: "How to Apply",
    ta: "விண்ணப்பிக்கும் முறை",
    te: "ఎలా దరఖాస్తు చేయాలి",
    ml: "എങ്ങനെ അപേക്ഷിക്കാം",
    hi: "आवेदन कैसे करें"
  },
  scheme_apply_online: {
    en: "Apply on Official Portal",
    ta: "அரசு இணையதளத்தில் விண்ணப்பிக்கவும்",
    te: "అధికారిక పోర్టల్‌లో దరఖాస్తు చేయండి",
    ml: "ഔദ്യോഗിക പോർട്ടലിൽ അപേക്ഷിക്കുക",
    hi: "आधिकारिक पोर्टल पर आवेदन करें"
  },
  no_schemes_found: {
    en: "No government schemes found matching your search.",
    ta: "உங்கள் தேடலுக்கு ஏற்ற திட்டங்கள் எதுவும் கிடைக்கவில்லை.",
    te: "మీ శోధనకు సరిపోలే పథకాలు ఏవీ కనుగొనబడలేదు.",
    ml: "പദ്ധതികളൊന്നും കണ്ടെത്താനായില്ല.",
    hi: "कोई सरकारी योजना नहीं मिली।"
  },
  mandi_prices_title: {
    en: "Market Intelligence",
    ta: "சந்தை விலை நுண்ணறிவு",
    te: "మార్కెట్ సమాచారం",
    ml: "വിപണി വിവരങ്ങൾ",
    hi: "मंडी भाव एवं बाजार विश्लेषण"
  },
  mandi_prices_subtitle: {
    en: "Real-time mandi rates, modal price trends & arrival volume analytics",
    ta: "நேரடி மண்டி விலைகள் மற்றும் வரத்து பகுப்பாய்வு",
    te: "రియల్ టైమ్ మార్కెట్ ధరలు మరియు ట్రెండ్‌లు",
    ml: "തത്സമയ വിപണി നിരക്കുകളും ട്രെൻഡുകളും",
    hi: "लाइव मंडी भाव, मॉडल मूल्य रुझान और आवक विश्लेषण"
  },
  filter_state: {
    en: "State",
    ta: "மாநிலம்",
    te: "రాష్ట్రం",
    ml: "സംസ്ഥാനം",
    hi: "राज्य"
  },
  filter_district: {
    en: "District",
    ta: "மாவட்டம்",
    te: "జిల్లా",
    ml: "ജില്ല",
    hi: "जिला"
  },
  filter_market: {
    en: "Market / Mandi",
    ta: "சந்தை / மண்டி",
    te: "మార్కెట్ / మండి",
    ml: "മാർക്കറ്റ് / മണ്ടി",
    hi: "मंडी / बाजार"
  },
  filter_commodity: {
    en: "Commodity",
    ta: "விவசாயப் பொருள்",
    te: "వ్యవసాయ వస్తువు",
    ml: "ഉൽപ്പന്നം",
    hi: "फसल / जींस"
  },
  filter_variety: {
    en: "Variety",
    ta: "பயிர் ரகம்",
    te: "రకం",
    ml: "ഇനം",
    hi: "किस्म"
  },
  filter_grade: {
    en: "Grade",
    ta: "தரம்",
    te: "గ్రేడ్",
    ml: "ഗ്രേഡ്",
    hi: "ग्रेड"
  },
  sync_live_prices: {
    en: "Sync Live Prices",
    ta: "நேரடி விலைகளைப் புதுப்பி",
    te: "ధరలను సమకాలీకరించండి",
    ml: "വിലകൾ സമന്വയിപ്പിക്കുക",
    hi: "लाइव कीमतें सिंक करें"
  },
  modal_price: {
    en: "Modal Price",
    ta: "சராசரி விலை",
    te: "సగటు ధర",
    ml: "ശരാശരി വില",
    hi: "मॉडल भाव"
  },
  min_max_price: {
    en: "Min - Max Price",
    ta: "குறைந்தபட்ச - அதிகபட்ச விலை",
    te: "కనిష్ట - గరిష్ట ధర",
    ml: "കുറഞ്ഞ - കൂടിയ വില",
    hi: "न्यूनतम - अधिकतम भाव"
  },
  price_arrival_trend: {
    en: "Price & Arrival Trends",
    ta: "விலை மற்றும் வரத்து போக்குகள்",
    te: "ధర మరియు రాక ట్రెండ్‌లు",
    ml: "വിലയും വരവും ട്രെൻഡുകൾ",
    hi: "मूल्य एवं आवक रुझान"
  },
  nearby_markets: {
    en: "Nearby Markets Comparison",
    ta: "அருகிலுள்ள சந்தைகள் ஒப்பீடு",
    te: "సమీప మార్కెట్ల పోలిక",
    ml: "സമീപത്തെ മാർക്കറ്റുകൾ താരതമ്യം",
    hi: "निकटवर्ती मंडियों की तुलना"
  },
  preferences: {
    en: "Preferences",
    ta: "விருப்பத்தேர்வுகள்",
    te: "ప్రాధాన్యతలు",
    ml: "മുൻഗണനകൾ",
    hi: "प्राथमिकताएं"
  },
  default_farm_location: {
    en: "Default Farm Location",
    ta: "இயல்புநிலை பண்ணை இடம்",
    te: "డిఫాల్ట్ వ్యవసాయ స్థానం",
    ml: "സ്ഥിരമായ ഫാം ലൊക്കേഷൻ",
    hi: "डिफ़ॉल्ट खेत का स्थान"
  },
  regional_language_preference: {
    en: "Regional Language Preference",
    ta: "வட்டார மொழித் தேர்வு",
    te: "ప్రాంతీయ భాష ప్రాధాన్యత",
    ml: "പ്രാദേശിക ഭാഷാ മുൻഗണന",
    hi: "क्षेत्रीय भाषा प्राथमिकता"
  },
  app_language: {
    en: "Application Language",
    ta: "செயலி மொழி",
    te: "అప్లికేషన్ భాష",
    ml: "ആപ്ലിക്കേഷൻ ഭാഷ",
    hi: "ऐप की भाषा"
  },
  notification_channels: {
    en: "Notification Channels",
    ta: "அறிவிப்பு வழிகள்",
    te: "నోటిఫికేషన్ ఛానెల్‌లు",
    ml: "അറിയിപ്പ് ചാനലുകൾ",
    hi: "अधिसूचना माध्यम"
  },
  save_settings: {
    en: "Save Changes",
    ta: "மாற்றங்களைச் சேமி",
    te: "మార్పులను సేవ్ చేయండి",
    ml: "മാറ്റങ്ങൾ സംരക്ഷിക്കുക",
    hi: "बदलाव सहेजें"
  },
  settings_saved_success: {
    en: "Settings saved successfully.",
    ta: "அமைப்புகள் வெற்றிகரமாகச் சேமிக்கப்பட்டன.",
    te: "సెట్టింగ్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి.",
    ml: "ക്രമീകരണങ്ങൾ വിജയകരമായി സംരക്ഷിച്ചു.",
    hi: "सेटिंग्स सफलतापूर्वक सहेजी गईं।"
  },
  login_google: {
    en: "Sign in with Google",
    ta: "Google மூலம் உள்நுழைக",
    te: "Google తో సైన్ ఇన్ చేయండి",
    ml: "Google ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക",
    hi: "Google से साइन इन करें"
  },
  verified_gov_sources: {
    en: "Verified Government Sources",
    ta: "சரிபார்க்கப்பட்ட அரசு ஆதாரங்கள்",
    te: "ధృవీకరించబడిన ప్రభుత్వ వనరులు",
    ml: "പരിശോധിച്ച സർക്കാർ വിവരങ്ങൾ",
    hi: "सत्यापित सरकारी स्रोत"
  },
  search_updates_placeholder: {
    en: "Search updates, schemes, guidelines...",
    ta: "திட்டங்கள் மற்றும் வழிகாட்டுதல்களைத் தேடுங்கள்...",
    te: "పథకాలు, మార్గదర్శకాలను శోధించండి...",
    ml: "പദ്ധതികളും മാർഗ്ഗനിർദ്ദേശങ്ങളും തിരയുക...",
    hi: "योजनाएं, दिशानिर्देश खोजें..."
  },
  verified_updates_count: {
    en: "Verified Official Schemes",
    ta: "சரிபார்க்கப்பட்ட அதிகாரப்பூர்வ திட்டங்கள்",
    te: "ధృవీకరించబడిన అధికారిక పథకాలు",
    ml: "പരിശോധിച്ച ഔദ്യോഗിക പദ്ധതികൾ",
    hi: "सत्यापित आधिकारिक योजनाएं"
  },
  filter_all: {
    en: "All",
    ta: "அனைத்தும்",
    te: "అన్నీ",
    ml: "എല്ലാം",
    hi: "सभी"
  },
  filter_central_govt: {
    en: "Central Govt",
    ta: "மத்திய அரசு",
    te: "కేంద్ర ప్రభుత్వం",
    ml: "കേന്ദ്ര സർക്കാർ",
    hi: "केंद्र सरकार"
  },
  filter_state_govt: {
    en: "State Govt",
    ta: "மாநில அரசு",
    te: "రాష్ట్ర ప్రభుత్వం",
    ml: "സംസ്ഥാന സർക്കാർ",
    hi: "राज्य सरकार"
  },
  state_tamil_nadu: {
    en: "Tamil Nadu",
    ta: "தமிழ்நாடு",
    te: "తమిళనాడు",
    ml: "തമിഴ്‌നാട്",
    hi: "तमिलनाडु"
  },
  state_karnataka: {
    en: "Karnataka",
    ta: "கர்நாடகா",
    te: "కర్ణాటక",
    ml: "കർണാടക",
    hi: "कर्नाटक"
  },
  state_andhra_pradesh: {
    en: "Andhra Pradesh",
    ta: "ஆந்திர பிரதேசம்",
    te: "ఆంధ్రప్రదేశ్",
    ml: "ആന്ധ്രാപ്രദേശ്",
    hi: "आंध्र प्रदेश"
  },
  state_maharashtra: {
    en: "Maharashtra",
    ta: "மகாராஷ்டிரா",
    te: "మహారాష్ట్ర",
    ml: "മഹാരാഷ്ട്ര",
    hi: "महाराष्ट्र"
  }
};

// Merge all keys
const dicts = { en, ta, te, ml, hi };

for (const [k, v] of Object.entries(newTranslations)) {
  for (const lang of ['en', 'ta', 'te', 'ml', 'hi']) {
    dicts[lang][k] = v[lang] || v.en;
  }
}

// Write back to files
fs.writeFileSync(enPath, JSON.stringify(dicts.en, null, 2) + '\n', 'utf-8');
fs.writeFileSync(taPath, JSON.stringify(dicts.ta, null, 2) + '\n', 'utf-8');
fs.writeFileSync(tePath, JSON.stringify(dicts.te, null, 2) + '\n', 'utf-8');
fs.writeFileSync(mlPath, JSON.stringify(dicts.ml, null, 2) + '\n', 'utf-8');
fs.writeFileSync(hiPath, JSON.stringify(dicts.hi, null, 2) + '\n', 'utf-8');

console.log('Successfully updated 5 locale files. Total keys per language:', Object.keys(dicts.en).length);
