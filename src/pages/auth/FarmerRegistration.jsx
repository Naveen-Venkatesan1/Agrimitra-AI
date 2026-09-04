import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Sprout, 
  Tractor, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  ChevronDown, 
  Check, 
  Navigation,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { getStatesAndUTs, getDistrictsByState } from '../../data/indiaLocations';
import { authApi } from '../../services/api';

const I18N = {
  en: {
    step: "Step",
    of: "of",
    // Step 1
    step1_title: "What is your name?",
    step1_sub: "Enter your full name.",
    full_name_label: "Full Name",
    name_placeholder: "Enter your name",
    // Step 2
    step2_title: "Where is your farm located?",
    step2_sub: "Use your current location or select manually.",
    use_live_location: "Use My Current Location",
    detecting_location: "Detecting location...",
    location_detected: "Location detected",
    or_divider: "OR",
    state_label: "State",
    select_state: "Select State",
    district_label: "District",
    select_district: "Select District",
    village_label: "Village",
    village_placeholder: "Enter village or town name",
    // Step 3
    step3_title: "What crops do you cultivate?",
    step3_sub: "Select one or more crops.",
    crops: {
      paddy: "Paddy",
      maize: "Maize",
      groundnut: "Groundnut",
      tomato: "Tomato",
      sugarcane: "Sugarcane",
      cotton: "Cotton",
      vegetables: "Vegetables",
      other: "Other Crops"
    },
    // Step 4
    step4_title: "What is your land size?",
    step4_sub: "Select your total land size.",
    land: {
      "1_acre": "1 acre",
      "2_acres": "2 acres",
      "3_acres": "3 acres",
      "5_acres": "5 acres",
      "10_plus_acres": "10+ acres",
      "other_custom": "Other / Custom"
    },
    // Step 5
    step5_title: "Review your details",
    step5_sub: "Check your information before creating your account.",
    name_summary: "Name",
    location_summary: "Location",
    crops_summary: "Selected Crops",
    land_summary: "Land Size",
    edit: "Edit",
    create_account_btn: "Create Account",
    creating_account: "Creating Account...",
    // Common
    next: "Next →",
    back: "Back"
  },
  ta: {
    step: "படி",
    of: "/",
    // Step 1
    step1_title: "உங்கள் பெயர் என்ன?",
    step1_sub: "உங்கள் முழு பெயரை உள்ளிடவும்.",
    full_name_label: "முழு பெயர்",
    name_placeholder: "உங்கள் பெயரை உள்ளிடவும்",
    // Step 2
    step2_title: "உங்கள் பண்ணை எங்குள்ளது?",
    step2_sub: "தற்போதைய இருப்பிடத்தைப் பயன்படுத்தவும் அல்லது தேர்வு செய்யவும்.",
    use_live_location: "என் தற்போதைய இடத்தை பயன்படுத்தவும்",
    detecting_location: "இடம் கண்டறியப்படுகிறது...",
    location_detected: "இடம் கண்டறியப்பட்டது",
    or_divider: "அல்லது",
    state_label: "மாநிலம்",
    select_state: "மாநிலத்தை தேர்வு செய்க",
    district_label: "மாவட்டம்",
    select_district: "மாவட்டத்தை தேர்வு செய்க",
    village_label: "கிராமம் / ஊர்",
    village_placeholder: "கிராமம் அல்லது ஊர் பெயர்",
    // Step 3
    step3_title: "நீங்கள் என்ன பயிர் செய்கிறீர்கள்?",
    step3_sub: "ஒன்று அல்லது அதற்கு மேற்பட்ட பயிர்களை தேர்வு செய்க.",
    crops: {
      paddy: "நெல்",
      maize: "சோளம்",
      groundnut: "நிலக்கடலை",
      tomato: "தக்காளி",
      sugarcane: "கரும்பு",
      cotton: "பருத்தி",
      vegetables: "காய்கறிகள்",
      other: "மற்ற பயிர்கள்"
    },
    // Step 4
    step4_title: "உங்கள் நிலத்தின் அளவு என்ன?",
    step4_sub: "உங்கள் மொத்த நில அளவை தேர்வு செய்க.",
    land: {
      "1_acre": "1 ஏக்கர்",
      "2_acres": "2 ஏக்கர்",
      "3_acres": "3 ஏக்கர்",
      "5_acres": "5 ஏக்கர்",
      "10_plus_acres": "10+ ஏக்கர்",
      "other_custom": "மற்றவை"
    },
    // Step 5
    step5_title: "விவரங்களை சரிபார்க்கவும்",
    step5_sub: "கணக்கு தொடங்குவதற்கு முன் விவரங்களை சரிபார்க்கவும்.",
    name_summary: "பெயர்",
    location_summary: "இருப்பிடம்",
    crops_summary: "பயிர்கள்",
    land_summary: "நில அளவு",
    edit: "மாற்று",
    create_account_btn: "கணக்கை உருவாக்கு",
    creating_account: "உருவாக்கப்படுகிறது...",
    // Common
    next: "அடுத்து →",
    back: "பின்செல்"
  },
  hi: {
    step: "चरण",
    of: "/",
    step1_title: "आपका नाम क्या है?",
    step1_sub: "अपना पूरा नाम दर्ज करें।",
    full_name_label: "पूरा नाम",
    name_placeholder: "अपना नाम लिखें",
    step2_title: "आपका खेत कहाँ स्थित है?",
    step2_sub: "अपना वर्तमान स्थान उपयोग करें या चुनें।",
    use_live_location: "मेरा वर्तमान स्थान उपयोग करें",
    detecting_location: "स्थान खोजा जा रहा है...",
    location_detected: "स्थान मिल गया",
    or_divider: "या",
    state_label: "राज्य",
    select_state: "राज्य चुनें",
    district_label: "जिला",
    select_district: "जिला चुनें",
    village_label: "गांव / कस्बा",
    village_placeholder: "गांव या कस्बे का नाम",
    step3_title: "आप कौन सी फसलें उगाते हैं?",
    step3_sub: "एक या अधिक फसलें चुनें।",
    crops: {
      paddy: "धान",
      maize: "मक्का",
      groundnut: "मूंगफली",
      tomato: "टमाटर",
      sugarcane: "गन्ना",
      cotton: "कपास",
      vegetables: "सब्जियां",
      other: "अन्य फसलें"
    },
    step4_title: "आपकी कितनी जमीन है?",
    step4_sub: "अपनी कुल जमीन का चयन करें।",
    land: {
      "1_acre": "1 एकड़",
      "2_acres": "2 एकड़",
      "3_acres": "3 एकड़",
      "5_acres": "5 एकड़",
      "10_plus_acres": "10+ एकड़",
      "other_custom": "अन्य"
    },
    step5_title: "अपने विवरण की समीक्षा करें",
    step5_sub: "खाता बनाने से पहले अपने विवरण जांचें।",
    name_summary: "नाम",
    location_summary: "स्थान",
    crops_summary: "फसलें",
    land_summary: "जमीन",
    edit: "बदलें",
    create_account_btn: "खाता बनाएं",
    creating_account: "खाता बनाया जा रहा है...",
    next: "आगे बढ़ें →",
    back: "पीछे"
  },
  te: {
    step: "దశ",
    of: "/",
    step1_title: "మీ పేరు ఏమిటి?",
    step1_sub: "మీ పూర్తి పేరును నమోదు చేయండి.",
    full_name_label: "పూర్తి పేరు",
    name_placeholder: "మీ పేరు రాయండి",
    step2_title: "మీ వ్యవసాయ భూమి ఎక్కడ ఉంది?",
    step2_sub: "ప్రస్తుత స్థానాన్ని ఉపయోగించండి లేదా ఎంచుకోండి.",
    use_live_location: "నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి",
    detecting_location: "స్థానం గుర్తిస్తోంది...",
    location_detected: "స్థానం గుర్తించబడింది",
    or_divider: "లేదా",
    state_label: "రాష్ట్రం",
    select_state: "రాష్ట్రం ఎంచుకోండి",
    district_label: "జిల్లా",
    select_district: "జిల్లా ఎంచుకోండి",
    village_label: "గ్రామం / ప్రాంతం",
    village_placeholder: "గ్రామం పేరు",
    step3_title: "మీరు ఏ పంటలు పండిస్తారు?",
    step3_sub: "ఒకటి లేదా అంతకంటే ఎక్కువ పంటలను ఎంచుకోండి.",
    crops: {
      paddy: "వరి",
      maize: "మొక్కజొన్న",
      groundnut: "వేరుశెనగ",
      tomato: "టమాట",
      sugarcane: "చెరకు",
      cotton: "పత్తి",
      vegetables: "కూరగాయలు",
      other: "ఇతర పంటలు"
    },
    step4_title: "మీ భూమి ఎంత?",
    step4_sub: "మీ మొత్తం భూమి పరిమాణాన్ని ఎంచుకోండి.",
    land: {
      "1_acre": "1 ఎకరం",
      "2_acres": "2 ఎకరాలు",
      "3_acres": "3 ఎకరాలు",
      "5_acres": "5 ఎకరాలు",
      "10_plus_acres": "10+ ఎకరాలు",
      "other_custom": "ఇతర"
    },
    step5_title: "మీ వివరాలను సమీక్షించండి",
    step5_sub: "ఖాతా సృష్టించే ముందు మీ సమాచారాన్ని తనిఖీ చేయండి.",
    name_summary: "పేరు",
    location_summary: "ప్రాంతం",
    crops_summary: "పంటలు",
    land_summary: "భూమి పరిమాణం",
    edit: "సవరించు",
    create_account_btn: "ఖాతా సృష్టించండి",
    creating_account: "ఖాతా సృష్టిస్తోంది...",
    next: "తదుపరి →",
    back: "వెనుకకు"
  },
  kn: {
    step: "ಹಂತ",
    of: "/",
    step1_title: "ನಿಮ್ಮ ಹೆಸರೇನು?",
    step1_sub: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
    full_name_label: "ಪೂರ್ಣ ಹೆಸರು",
    name_placeholder: "ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ",
    step2_title: "ನಿಮ್ಮ ಜಮೀನು ಎಲ್ಲಿದೆ?",
    step2_sub: "ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ.",
    use_live_location: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ",
    detecting_location: "ಸ್ಥಳ ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...",
    location_detected: "ಸ್ಥಳ ಪತ್ತೆಯಾಗಿದೆ",
    or_divider: "ಅಥವಾ",
    state_label: "ರಾಜ್ಯ",
    select_state: "ರಾಜ್ಯ ಆಯ್ಕೆಮಾಡಿ",
    district_label: "ಜಿಲ್ಲೆ",
    select_district: "ಜಿಲ್ಲೆ ಆಯ್ಕೆಮಾಡಿ",
    village_label: "ಗ್ರಾಮ / ಊರು",
    village_placeholder: "ಗ್ರಾಮದ ಹೆಸರು",
    step3_title: "ನೀವು ಯಾವ ಬೆಳೆ ಬೆಳೆಯುತ್ತೀರಿ?",
    step3_sub: "ಒಂದು ಅಥವಾ ಹೆಚ್ಚು ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    crops: {
      paddy: "ಭತ್ತ",
      maize: "ಮೆಕ್ಕೆಜೋಳ",
      groundnut: "ಕಡಲೆಕಾಯಿ",
      tomato: "ಟೊಮೆಟೊ",
      sugarcane: "ಕಬ್ಬು",
      cotton: "ಹತ್ತಿ",
      vegetables: "ತರಕಾರಿಗಳು",
      other: "ಇತರ ಬೆಳೆಗಳು"
    },
    step4_title: "ನಿಮ್ಮ ಜಮೀನು ಎಷ್ಟು?",
    step4_sub: "ನಿಮ್ಮ ಒಟ್ಟು ಜಮೀನು ಆಯ್ಕೆಮಾಡಿ.",
    land: {
      "1_acre": "1 ಎಕರೆ",
      "2_acres": "2 ಎಕರೆ",
      "3_acres": "3 ಎಕರೆ",
      "5_acres": "5 ಎಕರೆ",
      "10_plus_acres": "10+ ಎಕರೆ",
      "other_custom": "ಇತರ"
    },
    step5_title: "ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
    step5_sub: "ಖಾತೆ ರಚಿಸುವ ಮೊದಲು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    name_summary: "ಹೆಸರು",
    location_summary: "ಸ್ಥಳ",
    crops_summary: "ಬೆಳೆಗಳು",
    land_summary: "ಜಮೀನಿನ ಗಾತ್ರ",
    edit: "ಬದಲಾಯಿಸಿ",
    create_account_btn: "ಖಾತೆ ರಚಿಸಿ",
    creating_account: "ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    next: "ಮುಂದೆ →",
    back: "ಹಿಂದೆ"
  },
  ml: {
    step: "ഘട്ടം",
    of: "/",
    step1_title: "നിങ്ങളുടെ പേരെന്താണ്?",
    step1_sub: "നിങ്ങളുടെ പൂർണ്ണ പേര് നൽകുക.",
    full_name_label: "പൂർണ്ണ പേര്",
    name_placeholder: "പേര് നൽകുക",
    step2_title: "നിങ്ങളുടെ കൃഷിസ്ഥലം എവിടെയാണ്?",
    step2_sub: "നിലവിലെ സ്ഥലം ഉപയോഗിക്കുക അല്ലെങ്കിൽ തിരഞ്ഞെടുക്കുക.",
    use_live_location: "എന്റെ നിലവിലെ സ്ഥലം ഉപയോഗിക്കുക",
    detecting_location: "സ്ഥലം കണ്ടെത്തുന്നു...",
    location_detected: "സ്ഥലം കണ്ടെത്തി",
    or_divider: "അല്ലെങ്കിൽ",
    state_label: "സംസ്ഥാനം",
    select_state: "സംസ്ഥാനം തിരഞ്ഞെടുക്കുക",
    district_label: "ജില്ല",
    select_district: "ജില്ല തിരഞ്ഞെടുക്കുക",
    village_label: "ഗ്രാമം / നഗരം",
    village_placeholder: "ഗ്രാമത്തിന്റെ പേര്",
    step3_title: "നിങ്ങൾ എന്താണ് കൃഷി ചെയ്യുന്നത്?",
    step3_sub: "ഒന്നോ അതിലധികമോ വിളകൾ തിരഞ്ഞെടുക്കുക.",
    crops: {
      paddy: "നെല്ല്",
      maize: "ചോളം",
      groundnut: "നിലക്കടല",
      tomato: "തക്കാളി",
      sugarcane: "കരിമ്പ്",
      cotton: "പരുത്തി",
      vegetables: "പച്ചക്കറികൾ",
      other: "മറ്റു വിളകൾ"
    },
    step4_title: "നിങ്ങൾക്ക് എത്ര ഭൂമിയുണ്ട്?",
    step4_sub: "മൊത്തം ഭൂമിയുടെ വലിപ്പം തിരഞ്ഞെടുക്കുക.",
    land: {
      "1_acre": "1 ഏക്കർ",
      "2_acres": "2 ഏക്കർ",
      "3_acres": "3 ഏക്കർ",
      "5_acres": "5 ഏക്കർ",
      "10_plus_acres": "10+ ഏക്കർ",
      "other_custom": "മറ്റുള്ളവ"
    },
    step5_title: "വിവരങ്ങൾ പരിശോധിക്കുക",
    step5_sub: "അക്കൗണ്ട് സൃഷ്ടിക്കുന്നതിന് മുൻപ് വിവരങ്ങൾ ശരിയാണോ എന്ന് പരിശോധിക്കുക.",
    name_summary: "പേര്",
    location_summary: "സ്ഥലം",
    crops_summary: "വിളകൾ",
    land_summary: "ഭൂമിയുടെ വലിപ്പം",
    edit: "മാറ്റുക",
    create_account_btn: "അക്കൗണ്ട് സൃഷ്ടിക്കുക",
    creating_account: "അക്കൗണ്ട് സൃഷ്ടിക്കുന്നു...",
    next: "അടുത്തത് →",
    back: "പിന്നോട്ട്"
  }
};

const CROPS_DATA = [
  { id: 'Paddy', key: 'paddy', emoji: '🌾', label: 'Paddy' },
  { id: 'Maize', key: 'maize', emoji: '🌽', label: 'Maize' },
  { id: 'Groundnut', key: 'groundnut', emoji: '🥜', label: 'Groundnut' },
  { id: 'Tomato', key: 'tomato', emoji: '🍅', label: 'Tomato' },
  { id: 'Sugarcane', key: 'sugarcane', emoji: '🎋', label: 'Sugarcane' },
  { id: 'Cotton', key: 'cotton', emoji: '☁️', label: 'Cotton' },
  { id: 'Vegetables', key: 'vegetables', emoji: '🥬', label: 'Vegetables' },
  { id: 'Other Crops', key: 'other', emoji: '➕', label: 'Other Crops' }
];

const LAND_DATA = [
  { id: '1 acre', key: '1_acre', label: '1 acre' },
  { id: '2 acres', key: '2_acres', label: '2 acres' },
  { id: '3 acres', key: '3_acres', label: '3 acres' },
  { id: '5 acres', key: '5_acres', label: '5 acres' },
  { id: '10+ acres', key: '10_plus_acres', label: '10+ acres' },
  { id: 'Other / Custom', key: 'other_custom', label: 'Other / Custom' }
];

export const FarmerRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserProfile, setGlobalSelection, setAuth } = useAppStore();
  const { currentLang, changeLanguage, languages } = useTranslation();

  const t = I18N[currentLang] || I18N['en'];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State - Pre-fill from existing Google user or route state
  const initialName = user?.name || location?.state?.googleUser?.name || '';
  const [fullName, setFullName] = useState(initialName);

  useEffect(() => {
    const incomingName = user?.name || location?.state?.googleUser?.name;
    if (incomingName && !fullName) {
      setFullName(incomingName);
    }
  }, [user?.name, location?.state]);
  const [state, setState] = useState(user?.state || 'Tamil Nadu');
  const [district, setDistrict] = useState(user?.district || 'Salem');
  const [village, setVillage] = useState(user?.village || '');
  const [selectedCrops, setSelectedCrops] = useState(
    user?.primaryCrop ? [user.primaryCrop] : ['Paddy', 'Tomato', 'Groundnut']
  );
  const [landSize, setLandSize] = useState(user?.landSize || '2 acres');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState('');

  const stateOptions = getStatesAndUTs();
  const districtOptions = getDistrictsByState(state);

  useEffect(() => {
    if (!districtOptions.includes(district)) {
      setDistrict(districtOptions[0] || '');
    }
  }, [state, districtOptions, district]);

  // Live Location Detection
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser/device.');
      return;
    }
    setGpsLoading(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          let stateFound = '';
          let districtFound = '';
          let localityFound = '';

          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.principalSubdivision) {
                // Match State
                const matchedState = stateOptions.find(
                  (s) => s.toLowerCase() === data.principalSubdivision.toLowerCase() ||
                         data.principalSubdivision.toLowerCase().includes(s.toLowerCase())
                );
                if (matchedState) {
                  stateFound = matchedState;
                  setState(matchedState);
                  
                  // Match District
                  const districts = getDistrictsByState(matchedState);
                  const cand = data.locality || data.city || '';
                  const matchedDist = districts.find(
                    (d) => cand.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(cand.toLowerCase())
                  );
                  if (matchedDist) {
                    districtFound = matchedDist;
                    setDistrict(matchedDist);
                  }
                }
              }
              localityFound = data.locality || data.city || data.localityInfo?.administrative?.[3]?.name || '';
              if (localityFound) {
                setVillage(localityFound);
              }
            }
          } catch (fetchErr) {
            console.warn('Geocoding notice:', fetchErr);
          }

          setGpsLoading(false);
          setGpsSuccess(true);
          setDetectedLocationName(
            districtFound && stateFound ? `${districtFound}, ${stateFound}` : 'Location identified'
          );
        } catch (e) {
          console.warn('Location detection notice:', e);
          setGpsLoading(false);
          setGpsSuccess(true);
        }
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsLoading(false);
        setErrorMsg('Unable to retrieve GPS location. Please select your State & District manually below.');
      },
      { timeout: 8000 }
    );
  };

  const toggleCrop = (cropId) => {
    setErrorMsg('');
    if (selectedCrops.includes(cropId)) {
      if (selectedCrops.length > 1) {
        setSelectedCrops(selectedCrops.filter(c => c !== cropId));
      }
    } else {
      setSelectedCrops([...selectedCrops, cropId]);
    }
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!fullName.trim()) {
        setErrorMsg(currentLang === 'ta' ? 'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்.' : 'Please enter your full name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!state || !district) {
        setErrorMsg(currentLang === 'ta' ? 'தயவுசெய்து மாநிலம் & மாவட்டத்தை தேர்வு செய்யவும்.' : 'Please select your State and District.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedCrops.length === 0) {
        setErrorMsg(currentLang === 'ta' ? 'குறைந்தது ஒரு பயிரையாவது தேர்வு செய்யவும்.' : 'Please select at least one crop.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!landSize) {
        setErrorMsg(currentLang === 'ta' ? 'தயவுசெய்து நில அளவை தேர்வு செய்யவும்.' : 'Please select your land size.');
        return;
      }
      setStep(5);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      navigate('/login');
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const primaryCrop = selectedCrops[0] || 'Paddy';

      // 1. If not authenticated yet, create session
      if (!user) {
        const generatedEmail = `${fullName.toLowerCase().replace(/\s+/g, '')}_${Date.now()}@agrimitra.ai`;
        const res = await authApi.signUp({
          email: generatedEmail,
          password: 'farmer_user_pass',
          farmerName: fullName.trim()
        });
        if (res.user) {
          setAuth(true, {
            ...res.user,
            name: fullName.trim()
          });
        }
      }

      // 2. Save profile data to Firestore & Store
      const profileData = {
        name: fullName.trim() || user?.name || 'Farmer',
        phone: user?.phone || '',
        state: state,
        district: district,
        village: village.trim() || district,
        primaryCrop: primaryCrop,
        crops: selectedCrops,
        landSize: landSize,
        season: 'Kharif 2025',
        soilType: 'Clay Loam',
        irrigationType: 'Drip & Canal',
        preferredLanguage: currentLang,
        role: 'farmer',
        authMode: user?.authMode || 'direct',
        onboardingCompleted: true
      };

      setGlobalSelection(state, district);
      await updateUserProfile(profileData);

      if (user?.password && (user?.phone || user?.email)) {
        try {
          const directUsers = JSON.parse(localStorage.getItem('agrimitra_direct_users') || '[]');
          const cleanPhone = (user.phone || '').replace(/\D/g, '');
          const existingIdx = directUsers.findIndex(
            (u) => (cleanPhone && (u.phone?.includes(cleanPhone.slice(-10)) || u.email?.includes(cleanPhone.slice(-10)))) ||
                   (user.id && u.id === user.id)
          );
          const directRecord = {
            id: user.id || user.uid,
            name: profileData.name,
            phone: user.phone,
            email: user.email || (cleanPhone ? `${cleanPhone}@agrimitra.ai` : undefined),
            password: user.password,
            ...profileData,
            updatedAt: new Date().toISOString()
          };
          if (existingIdx >= 0) {
            directUsers[existingIdx] = { ...directUsers[existingIdx], ...directRecord };
          } else {
            directUsers.push(directRecord);
          }
          localStorage.setItem('agrimitra_direct_users', JSON.stringify(directUsers));
        } catch (e) {
          console.warn('Failed to sync direct user credentials:', e);
        }
      }

      setLoading(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Registration save error:', err);
      setLoading(false);
      setErrorMsg('Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white font-sans select-none flex flex-col">
      {/* FULL MOBILE SCREEN CONTAINER */}
      <div className="flex-1 w-full max-w-[480px] mx-auto flex flex-col p-5">
        
        {/* COMPACT TOP BAR: Step Indicator + Language Selector */}
        <div className="pb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-extrabold text-gray-800">
              {t.step} {step} {t.of} 5
            </span>

            {/* Compact Language Selector */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-gray-600" />
              <select
                value={currentLang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-[11.5px] font-bold text-gray-700 outline-none cursor-pointer appearance-none pr-2"
              >
                {languages?.map((l) => (
                  <option key={l.code} value={l.code}>{l.nativeName || l.name}</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 text-gray-400 -ml-1.5 pointer-events-none" />
            </div>
          </div>

          {/* SLIM 5-STEP PROGRESS BAR */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#15803D] rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* ERROR ALERT */}
        {errorMsg && (
          <div className="mb-2.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* ================= STEP 1: NAME ================= */}
        {step === 1 && (
          <div className="space-y-3.5 py-1 animate-fade-in flex flex-col h-full">
            <div className="w-full rounded-2xl overflow-hidden mb-2 shrink-0 flex justify-center bg-transparent">
              <img src="/images/reg_image_1.jpeg" alt="Farmer Welcome" className="w-full h-auto object-contain max-h-[35vh]" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">
                {t.step1_title}
              </h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                {t.step1_sub}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11.5px] font-bold text-gray-700 block">
                {t.full_name_label}
              </label>
              <div className="flex items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-[#15803D] focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <input
                  type="text"
                  autoFocus
                  placeholder={t.name_placeholder}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrorMsg(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                  className="w-full bg-transparent border-none outline-none text-[15px] font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
                />
                {fullName.trim().length > 0 && (
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#15803D] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Next Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleNext}
                className="w-full h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.98] text-white font-bold text-[14.5px] shadow-xs transition border-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{t.next}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LOCATION ================= */}
        {step === 2 && (
          <div className="space-y-2.5 py-1 animate-fade-in flex flex-col h-full">
            <div className="w-full rounded-2xl overflow-hidden mb-2 shrink-0 flex justify-center bg-transparent">
              <img src="/images/reg_image_2.jpeg" alt="Location Map" className="w-full h-auto object-contain max-h-[35vh]" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">
                {t.step2_title}
              </h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                {t.step2_sub}
              </p>
            </div>

            {/* Live Location Button */}
            <button
              type="button"
              onClick={handleLiveLocation}
              disabled={gpsLoading}
              className={`w-full h-10 rounded-xl border-none text-white font-bold text-[12.5px] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-[0.98] ${
                gpsSuccess ? 'bg-[#15803D]' : 'bg-[#15803D] hover:bg-[#166534]'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>
                {gpsSuccess 
                  ? `✓ ${t.location_detected} ${detectedLocationName ? `(${detectedLocationName})` : ''}` 
                  : gpsLoading ? t.detecting_location : `📍 ${t.use_live_location}`}
              </span>
            </button>

            <div className="flex items-center gap-2 px-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.or_divider}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Manual Dependent Dropdowns */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-0.5">
                  {t.state_label}
                </label>
                <div className="relative">
                  <select
                    value={state}
                    onChange={(e) => { setState(e.target.value); setErrorMsg(''); }}
                    className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-bold text-gray-800 outline-none focus:bg-white focus:border-[#15803D] appearance-none cursor-pointer"
                  >
                    {stateOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-0.5">
                  {t.district_label}
                </label>
                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => { setDistrict(e.target.value); setErrorMsg(''); }}
                    className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-bold text-gray-800 outline-none focus:bg-white focus:border-[#15803D] appearance-none cursor-pointer"
                  >
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-0.5">
                  {t.village_label}
                </label>
                <input
                  type="text"
                  placeholder={t.village_placeholder}
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#15803D]"
                />
              </div>
            </div>

            {/* Bottom Back | Next Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-bold text-[13.5px] transition cursor-pointer"
              >
                ← {t.back}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.98] text-white font-bold text-[14.5px] shadow-xs transition border-none cursor-pointer"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CROPS ================= */}
        {step === 3 && (
          <div className="space-y-2.5 py-1 animate-fade-in flex flex-col h-full">
            <div className="w-full rounded-2xl overflow-hidden mb-2 shrink-0 flex justify-center bg-transparent">
              <img src="/images/reg_image_3.jpeg" alt="Crops" className="w-full h-auto object-contain max-h-[35vh]" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">
                {t.step3_title}
              </h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                {t.step3_sub}
              </p>
            </div>

            {/* 2-Column Compact Crop Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {CROPS_DATA.map((crop) => {
                const isSelected = selectedCrops.includes(crop.id);
                const cropName = t.crops[crop.key] || crop.label;

                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => toggleCrop(crop.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-[#E8F5E9] border-[#15803D] text-[#1B5E20]' 
                        : 'bg-gray-50/70 hover:bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="text-xl">{crop.emoji}</span>
                    <span className="text-[12.5px] font-bold flex-1 leading-tight truncate">
                      {cropName}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#15803D] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Back | Next Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-bold text-[13.5px] transition cursor-pointer"
              >
                ← {t.back}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.98] text-white font-bold text-[14.5px] shadow-xs transition border-none cursor-pointer"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: LAND SIZE ================= */}
        {step === 4 && (
          <div className="space-y-2.5 py-1 animate-fade-in flex flex-col h-full">
            <div className="w-full rounded-2xl overflow-hidden mb-2 shrink-0 flex justify-center bg-transparent">
              <img src="/images/reg_image_4.jpeg" alt="Land Size" className="w-full h-auto object-contain max-h-[35vh]" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">
                {t.step4_title}
              </h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                {t.step4_sub}
              </p>
            </div>

            {/* 2-Column Compact Land Size Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {LAND_DATA.map((item) => {
                const isSelected = landSize === item.id;
                const landLabel = t.land[item.key] || item.label;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setLandSize(item.id); setErrorMsg(''); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-[#E8F5E9] border-[#15803D] text-[#1B5E20]' 
                        : 'bg-gray-50/70 hover:bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="text-xl">🚜</span>
                    <span className="text-[13px] font-bold flex-1 leading-tight">
                      {landLabel}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#15803D] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Back | Next Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-bold text-[13.5px] transition cursor-pointer"
              >
                ← {t.back}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.98] text-white font-bold text-[14.5px] shadow-xs transition border-none cursor-pointer"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW & CREATE ACCOUNT ================= */}
        {step === 5 && (
          <div className="space-y-2.5 py-1 animate-fade-in flex flex-col h-full">
            <div className="w-full rounded-2xl overflow-hidden mb-1 shrink-0 flex justify-center bg-transparent">
              <img src="/images/reg_image_5.jpeg" alt="Review & Confirm" className="w-full h-auto object-contain max-h-[22vh]" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">
                {t.step5_title}
              </h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                {t.step5_sub}
              </p>
            </div>

            {/* Compact Review Summary Card */}
            <div className="bg-gray-50/90 border border-gray-200 rounded-2xl p-3 space-y-2 text-[12px]">
              
              {/* Name Row */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <span>👤</span> {t.name_summary}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{fullName || 'Farmer'}</span>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-[#15803D] hover:underline font-bold text-[11px] p-0 border-none bg-transparent cursor-pointer"
                  >
                    {t.edit}
                  </button>
                </div>
              </div>

              {/* Location Row */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <span>📍</span> {t.location_summary}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{district}, {state}</span>
                  <button 
                    type="button" 
                    onClick={() => setStep(2)} 
                    className="text-[#15803D] hover:underline font-bold text-[11px] p-0 border-none bg-transparent cursor-pointer"
                  >
                    {t.edit}
                  </button>
                </div>
              </div>

              {/* Crops Row */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1.5 shrink-0">
                  <span>🌽</span> {t.crops_summary}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-right truncate max-w-[150px]">
                    {selectedCrops.join(', ')}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setStep(3)} 
                    className="text-[#15803D] hover:underline font-bold text-[11px] p-0 border-none bg-transparent cursor-pointer shrink-0"
                  >
                    {t.edit}
                  </button>
                </div>
              </div>

              {/* Land Size Row */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <span>🌾</span> {t.land_summary}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{landSize}</span>
                  <button 
                    type="button" 
                    onClick={() => setStep(4)} 
                    className="text-[#15803D] hover:underline font-bold text-[11px] p-0 border-none bg-transparent cursor-pointer"
                  >
                    {t.edit}
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Create Account Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.98] text-white font-bold text-[14.5px] shadow-sm transition border-none cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t.create_account_btn}</span>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FarmerRegistration;
