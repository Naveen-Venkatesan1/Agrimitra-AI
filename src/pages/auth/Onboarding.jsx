import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Camera, 
  Upload, 
  Trash2, 
  Sprout, 
  Droplets, 
  Layers, 
  Compass, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Navigation,
  Calendar,
  Award
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { getStatesAndUTs, getDistrictsByState } from '../../data/indiaLocations';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, setGlobalSelection } = useAppStore();
  const { t, currentLang, changeLanguage, languages } = useTranslation();

  const [step, setStep] = useState(1); // Steps 1 to 4
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    landSize: user?.landSize || '2.5 Acres',
    primaryCrop: user?.primaryCrop || 'Paddy (Rice)',
    season: user?.season || 'Kharif 2024',
    soilType: user?.soilType || 'Clay Loam',
    irrigationType: user?.irrigationType || 'Drip',
    waterAvailability: user?.waterAvailability || 'Medium',
    farmingExperience: user?.farmingExperience || '5–10 years',
    state: user?.state || 'Tamil Nadu',
    district: user?.district || 'Thanjavur',
    village: user?.village || '',
    latitude: user?.latitude || null,
    longitude: user?.longitude || null,
    preferredLanguage: currentLang || 'en'
  });

  const stateOptions = getStatesAndUTs();
  const districtOptions = getDistrictsByState(formData.state);

  const cropOptions = [
    'Paddy (Rice)', 'Wheat', 'Cotton', 'Sugarcane', 'Maize (Corn)', 
    'Chickpea (Gram)', 'Groundnut', 'Soybean', 'Jute', 'Tea', 
    'Coffee', 'Rubber', 'Mustard', 'Onion', 'Potato', 'Tomato', 'Spices'
  ];

  const soilOptions = ['Clay Loam', 'Alluvial Soil', 'Black Cotton Soil', 'Red Soil', 'Sandy Loam'];
  const seasonOptions = ['Kharif 2024', 'Rabi 2024', 'Zaid 2024', 'Whole Year'];
  const landOptions = ['1.0 Acre', '2.5 Acres', '5.0 Acres', '10.0+ Acres'];
  const irrigationOptions = ['Drip', 'Sprinkler', 'Canal', 'Borewell', 'Rainfed', 'Other'];
  const waterOptions = ['Low', 'Medium', 'High'];
  const expOptions = ['Less than 5 years', '5–10 years', 'More than 10 years'];

  const languageOptions = (languages || []).map(l => ({
    value: l.code,
    label: l.nativeName ? `${l.nativeName} (${l.name})` : l.name
  }));

  const handleStateChange = (newState) => {
    const districts = getDistrictsByState(newState);
    setFormData(prev => ({
      ...prev,
      state: newState,
      district: districts[0] || ''
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your device.');
      return;
    }

    setGpsLoading(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        setGpsLoading(false);
        setGpsSuccess(true);
      },
      (err) => {
        console.warn('GPS detection error:', err);
        setGpsLoading(false);
        setErrorMsg('Unable to retrieve GPS position. You can select your State & District manually.');
      },
      { timeout: 8000 }
    );
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.name.trim()) {
        setErrorMsg('Please enter your full name to proceed.');
        return;
      }
      if (!formData.phone.trim()) {
        setErrorMsg('Please enter your mobile number.');
        return;
      }
    } else if (step === 2) {
      if (!formData.landSize || !formData.primaryCrop || !formData.soilType) {
        setErrorMsg('Please fill in your land size, primary crop, and soil type.');
        return;
      }
    } else if (step === 3) {
      if (!formData.state || !formData.district || !formData.preferredLanguage) {
        setErrorMsg('Please select your State, District, and Preferred Language.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleFinishOnboarding = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (formData.preferredLanguage) {
        changeLanguage(formData.preferredLanguage);
      }

      setGlobalSelection(formData.state, formData.district);
      await updateUserProfile({
        name: formData.name.trim() || 'Farmer',
        phone: formData.phone.trim(),
        avatar: formData.avatar,
        landSize: formData.landSize,
        primaryCrop: formData.primaryCrop,
        season: formData.season,
        soilType: formData.soilType,
        irrigationType: formData.irrigationType,
        waterAvailability: formData.waterAvailability,
        farmingExperience: formData.farmingExperience,
        state: formData.state,
        district: formData.district,
        village: formData.village.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        preferredLanguage: formData.preferredLanguage,
        onboardingCompleted: true
      });

      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setErrorMsg('Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center">
          <Logo variant="full" className="justify-center mb-3" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-agri-dark">Welcome to AgriMitra AI! 🌾</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto font-medium">
            Setup your smart farm profile to unlock precision AI crop disease models, weather forecasts, and irrigation schedules.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2.5">
            <span className={step >= 1 ? 'text-agri-primary font-extrabold' : ''}>1. About You</span>
            <span className={step >= 2 ? 'text-agri-primary font-extrabold' : ''}>2. Your Farm</span>
            <span className={step >= 3 ? 'text-agri-primary font-extrabold' : ''}>3. Location</span>
            <span className={step >= 4 ? 'text-agri-primary font-extrabold' : ''}>4. Summary</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className={`h-full bg-agri-primary transition-all duration-300 ${
              step === 1 ? 'w-1/4' : step === 2 ? 'w-2/4' : step === 3 ? 'w-3/4' : 'w-full'
            }`} />
          </div>
        </div>

        {/* Validation Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Card Container */}
        <Card hover={false} className="p-6 sm:p-8">
          
          {/* STEP 1: ABOUT YOU */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-3">
                <h3 className="text-base font-extrabold text-agri-dark flex items-center gap-2">
                  <User className="w-5 h-5 text-agri-primary" /> Step 1: About You
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Tell us your name, contact phone, and optionally add your farmer profile photo.</p>
              </div>

              {/* Circular Avatar Photo Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/60">
                <div className="relative w-24 h-24 rounded-full border-4 border-agri-primary/30 shadow-md overflow-hidden bg-emerald-100 flex items-center justify-center shrink-0">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-agri-primary">
                      {formData.name ? formData.name.substring(0, 2).toUpperCase() : 'DU'}
                    </span>
                  )}
                  <label htmlFor="onboarding-avatar-input" className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Change</span>
                  </label>
                  <input
                    id="onboarding-avatar-input"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-xs font-bold text-agri-dark">Profile Photo (Optional)</h4>
                  <p className="text-[11px] text-gray-500">Supports JPG, PNG, WEBP up to 10MB. Automatically used across your farm dashboard.</p>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <label
                      htmlFor="onboarding-avatar-btn-input"
                      className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-agri-dark shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-agri-primary" /> Select Photo
                    </label>
                    <input
                      id="onboarding-avatar-btn-input"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Phone Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: YOUR FARM */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-3">
                <h3 className="text-base font-extrabold text-agri-dark flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-agri-primary" /> Step 2: Your Farm Parameters
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Provide land size, crop, soil, and irrigation type to power AI yield and irrigation models.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">
                    Land Size <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.landSize}
                    onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {landOptions.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <SearchableSelect
                    label="Primary Crop *"
                    value={formData.primaryCrop}
                    onChange={(crop) => setFormData({ ...formData, primaryCrop: crop })}
                    options={cropOptions}
                    placeholder="Search Crop..."
                    icon={Sprout}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">Soil Type *</label>
                  <select
                    value={formData.soilType}
                    onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {soilOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">Current Season</label>
                  <select
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {seasonOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">Irrigation System</label>
                  <select
                    value={formData.irrigationType}
                    onChange={(e) => setFormData({ ...formData, irrigationType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {irrigationOptions.map(i => (
                      <option key={i} value={i}>{i} Irrigation</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">Water Availability</label>
                  <select
                    value={formData.waterAvailability}
                    onChange={(e) => setFormData({ ...formData, waterAvailability: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {waterOptions.map(w => (
                      <option key={w} value={w}>{w} Water Supply</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-agri-dark mb-1">Farming Experience</label>
                  <select
                    value={formData.farmingExperience}
                    onChange={(e) => setFormData({ ...formData, farmingExperience: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  >
                    {expOptions.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & PREFERENCES */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-agri-dark flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-agri-primary" /> Step 3: Location & Preferences
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Select your State, District, Village and preferred regional language.</p>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-agri-primary rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-emerald-200"
                >
                  <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>{gpsLoading ? 'Locating...' : gpsSuccess ? '✓ GPS Detected' : 'Detect My Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <SearchableSelect
                    label="State / UT *"
                    value={formData.state}
                    onChange={handleStateChange}
                    options={stateOptions}
                    placeholder="Search State..."
                    icon={MapPin}
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="District *"
                    value={formData.district}
                    onChange={(dist) => setFormData({ ...formData, district: dist })}
                    options={districtOptions}
                    placeholder="Search District..."
                    icon={MapPin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-dark mb-1">Village / Taluk (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Orathanadu"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-agri-dark focus:outline-none focus:ring-2 focus:ring-agri-primary/20"
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Preferred Language *"
                    value={formData.preferredLanguage}
                    onChange={(langCode) => setFormData({ ...formData, preferredLanguage: langCode })}
                    options={languageOptions}
                    placeholder="Search Language..."
                    icon={Globe}
                  />
                </div>
              </div>

              {gpsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>GPS coordinates saved ({formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}) for hyper-local satellite & weather sync.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMATION SUMMARY */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-3">
                <h3 className="text-base font-extrabold text-agri-dark flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-agri-primary" /> Step 4: Confirm Your Farm Setup
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Review your profile details before setting up your AgriMitra AI Dashboard.</p>
              </div>

              <div className="bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 rounded-2xl p-6 text-white space-y-4 shadow-xl border border-emerald-800/40">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-emerald-400 overflow-hidden bg-emerald-800 flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Farmer avatar" className="w-full h-full object-cover" />
                    ) : (
                      formData.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">{formData.name}</h4>
                    <p className="text-xs text-emerald-300 font-medium">{formData.phone || 'No mobile provided'} • {formData.village ? `${formData.village}, ` : ''}{formData.district}, {formData.state}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Farm Size</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{formData.landSize}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Primary Crop</span>
                    <span className="font-bold text-emerald-300 text-sm mt-0.5 block">{formData.primaryCrop}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Soil Type</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{formData.soilType}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Irrigation</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{formData.irrigationType}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Water Supply</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{formData.waterAvailability}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-[10px] text-gray-300 font-medium uppercase block">Language</span>
                    <span className="font-bold text-emerald-300 text-sm mt-0.5 block">{formData.preferredLanguage?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handlePrevStep}
                icon={ArrowLeft}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNextStep}
                icon={ArrowRight}
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={loading}
                onClick={handleFinishOnboarding}
                icon={ArrowRight}
                className="shadow-lg"
              >
                Setup My Farm Dashboard →
              </Button>
            )}
          </div>

        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
