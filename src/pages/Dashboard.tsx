import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Droplets,
  Wind,
  MapPin,
  ArrowRight,
  Menu,
  Bell,
  Globe,
  Home,
  Sprout,
  Bot,
  ShoppingBag,
  Grid2X2,
  User,
  Settings,
  LogOut,
} from 'lucide-react';

import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { soilApi } from '../services/api/soil';
import { getLocationCoordinates } from '../data/indiaLocations';
import { getWeatherConditionAsset } from '../services/api/weatherLocationService';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  /*
   * IMPORTANT:
   * Backend / API / Store logic is intentionally preserved.
   */
  const {
    user,
    irrigation,
    weather,
    alerts,
    selectedState,
    selectedDistrict,
    logoutAppStore,
  } = useAppStore();

  const {
    currentLang,
    changeLanguage,
    languages,
    t,
  } = useTranslation();

  const [soilHealthData, setSoilHealthData] = useState({
    score: '85%',
    status: 'Good',
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /* ============================================================
     EXISTING BACKEND SOIL LOGIC — PRESERVED
     ============================================================ */

  useEffect(() => {
    let isMounted = true;

    const fetchSoilData = async () => {
      try {
        const coords = getLocationCoordinates(
          selectedState,
          selectedDistrict
        );

        const res = await soilApi.getSoilData(
          coords.lat,
          coords.lon
        );

        if (isMounted && res.success && res.data) {
          let score = 65;

          if (res.data.organicCarbon > 1.0) {
            score += 15;
          } else if (res.data.organicCarbon > 0.5) {
            score += 5;
          }

          if (res.data.ph >= 6.0 && res.data.ph <= 7.5) {
            score += 10;
          }

          score = Math.min(95, score);

          let status = 'Good';

          if (score < 50) {
            status = 'Poor';
          } else if (score < 70) {
            status = 'Moderate';
          }

          setSoilHealthData({
            score: `${score}%`,
            status,
          });
        } else {
          setSoilHealthData({
            score: '85%',
            status: 'Good',
          });
        }
      } catch (err) {
        console.warn('Soil fetch failed', err);

        setSoilHealthData({
          score: '85%',
          status: 'Good',
        });
      }
    };

    fetchSoilData();

    return () => {
      isMounted = false;
    };
  }, [selectedState, selectedDistrict]);

  /* ============================================================
     EXISTING DYNAMIC STORE VALUES — PRESERVED
     ============================================================ */

  const currentTemp = (typeof weather?.temp === 'number' || typeof weather?.temp === 'string')
    ? String(weather.temp)
    : (typeof weather?.temperature === 'number' || typeof weather?.temperature === 'string')
      ? String(weather.temperature)
      : '29';

  const currentCondition = typeof weather?.condition === 'string'
    ? weather.condition
    : (typeof weather?.weatherCondition === 'string'
      ? weather.weatherCondition
      : (typeof weather?.condition?.text === 'string'
        ? weather.condition.text
        : 'Partly Cloudy'));

  const currentHumidity = (typeof weather?.humidity === 'number' || typeof weather?.humidity === 'string')
    ? String(weather.humidity)
    : '67%';

  const currentWind = (typeof weather?.windSpeed === 'string' || typeof weather?.windSpeed === 'number')
    ? String(weather.windSpeed)
    : (typeof weather?.wind === 'string' || typeof weather?.wind === 'number'
      ? String(weather.wind)
      : '9 km/h');

  const displayDistrict = typeof user?.district === 'string' && user.district.trim() !== ''
    ? user.district.trim()
    : (typeof selectedDistrict === 'string' && selectedDistrict.trim() !== ''
      ? selectedDistrict.trim()
      : 'Chennai');

  const displayState = typeof user?.state === 'string' && user.state.trim() !== ''
    ? user.state.trim()
    : (typeof selectedState === 'string' && selectedState.trim() !== ''
      ? selectedState.trim()
      : 'Tamil Nadu');

  const rawName = (
    typeof user?.name === 'string'
      ? user.name
      : (typeof user?.displayName === 'string'
        ? user.displayName
        : String(user?.name || user?.displayName || ''))
  ).trim();
  const fallbackName = typeof t === 'function' ? (t('default_farmer_name', 'Farmer') || 'Farmer') : 'Farmer';
  const userName = rawName || fallbackName;

  const nameParts = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
  const userFirstName = nameParts[0] || fallbackName;
  const userLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const userLandSize = typeof user?.landSize === 'string' || typeof user?.landSize === 'number'
    ? String(user.landSize)
    : '2.5 Acres';

  const userPrimaryCrop = typeof user?.primaryCrop === 'string'
    ? user.primaryCrop
    : (Array.isArray(user?.crops) && typeof user?.crops[0] === 'string'
      ? user.crops[0]
      : 'Paddy');

  const unreadCount = Array.isArray(alerts)
    ? alerts.filter((a: any) => a && a.unread).length
    : 0;

  const humidityStr =
    String(currentHumidity).includes('%')
      ? String(currentHumidity)
      : `${currentHumidity}%`;

  const windStr =
    String(currentWind).includes('km/h')
      ? String(currentWind)
      : `${currentWind} km/h`;

  /* ============================================================
     QUICK ACCESS ASSETS
     ============================================================ */

  const quickAccessItems = [
    {
      title: t('nav_crop', 'Crop'),
      path: '/crop-intelligence',
      img: '/dashboard-images/quick_access/crop_intelligence.png',
      scale: 'scale-[1.18]',
    },
    {
      title: t('nav_farm_ai', 'Farm AI'),
      path: '/ai-assistant',
      img: '/dashboard-images/quick_access/ai_assistant.png',
      scale: 'scale-[1.16]',
    },
    {
      title: t('nav_agro_monitoring', 'Agro Monitoring'),
      path: '/analytics',
      img: '/dashboard-images/quick_access/field_monitoring.png',
      scale: 'scale-[1.16]',
    },
    {
      title: t('nav_agri_prices', 'Agri Prices'),
      path: '/market-intelligence',
      img: '/dashboard-images/quick_access/market_prices.png',
      scale: 'scale-100',
    },
    {
      title: t('nav_govt_schemes', 'Govt Schemes'),
      path: '/government-schemes',
      img: '/dashboard-images/quick_access/government_schemes.png',
      scale: 'scale-[1.16]',
    },
    {
      title: t('nav_smart_irrigation', 'Smart Irrigation'),
      path: '/irrigation',
      img: '/dashboard-images/quick_access/smart_irrigation.png',
      scale: 'scale-[1.16]',
    },
    {
      title: t('nav_weather_meteorology', 'Weather'),
      path: '/weather',
      img: '/dashboard-images/quick_access/weather_update.png',
      scale: 'scale-100',
    },
  ];

  return (
    <div className={`w-full bg-[#F8FAF9] text-gray-900 font-sans select-none ${currentLang === 'ta' ? 'pb-24' : 'pb-2'}`}>

      {/* ==========================================================
          1. TOP APP HEADER BAR
         ========================================================== */}
      <header className="w-full min-w-full relative flex items-center justify-between px-3.5 pt-3.5 pb-2.5 bg-white sticky top-0 z-40 border-b border-gray-100/80 shrink-0">
        {/* Left: Menu */}
        <div className="flex items-center">
          <button
            onClick={() => window.dispatchEvent(new Event('open-sidebar'))}
            aria-label="Open menu"
            className="p-1 text-gray-800 hover:text-gray-900 active:scale-95 transition"
          >
            <Menu className="w-5.5 h-5.5" strokeWidth={2.2} />
          </button>
        </div>

        {/* Center/Left: AgriMitra AI Brand Text */}
        <div className="absolute left-[28%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none z-10 whitespace-nowrap">
          <span className="text-[20px] font-extrabold text-[#0D5C2E] tracking-tight">AgriMitra</span>
          <span className="text-[20px] font-extrabold text-[#10B981] ml-1"> AI</span>
        </div>

        {/* Right: Globe + Bell + Green NM Avatar */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLanguageModalOpen(true)}
            className="p-1 text-gray-700 hover:text-gray-900 active:scale-95 transition"
            aria-label="Select language"
          >
            <Globe className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className="relative p-1 text-gray-700 hover:text-gray-900 active:scale-95 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Green Profile Avatar button with Account Dropdown Menu */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-[#0D5C2E] text-white text-xs font-extrabold flex items-center justify-center shadow-xs hover:bg-[#094220] transition active:scale-95 cursor-pointer overflow-hidden"
              aria-label="Account Options Menu"
            >
              <Avatar user={user} className="w-full h-full text-xs font-extrabold" />
            </button>

            {/* Account Options Dropdown Card matching reference screenshot */}
            {isAccountMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Details Header */}
                <div className="pb-2.5 mb-2 border-b border-gray-100 px-1">
                  <p className="text-[13px] font-bold text-gray-900 truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {user?.email || t('no_email_provided', 'No email provided')}
                  </p>
                  <p className="text-[11px] text-[#0D5C2E] font-semibold truncate mt-1 flex items-center gap-1">
                    <span>Location: {displayDistrict}, {displayState}</span>
                  </p>
                </div>

                {/* Account Menu Options */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{t('nav_profile', 'My Profile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span>{t('nav_settings', 'Settings')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/alerts');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>{t('alerts_notifications', 'Notifications')}</span>
                  </button>

                  <div className="pt-1 my-1 border-t border-gray-100" />

                  <button
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logoutAppStore();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-red-600 hover:bg-red-50 transition active:scale-98 text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>{t('logout', 'Log Out')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==========================================================
          2. WELCOME CARD (EXACT ROUNDED CARD BORDER)
         ========================================================== */}
      <div className="px-4 mt-3">
        <div className="relative w-full h-[220px] rounded-[38px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100">
          
          {/* Welcome Background Image */}
          <img
            src="/dashboard-images/former22.webp"
            alt="Farmland with farmer"
            className="absolute inset-0 w-full h-full object-cover block rounded-[38px]"
            style={{
              objectPosition: 'center top',
              filter: 'brightness(1.08) contrast(1.06) saturate(1.05)',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/dashboard-images/farmer_hero_welcome.jpeg';
            }}
          />

          {/* Soft clear readability overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[38px]"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.05) 75%, transparent 100%)',
            }}
          />

          {/* Card Text Content */}
          <div className="relative z-10 p-5 flex flex-col justify-between h-full max-w-[65%]">
            <div>
              <div className="flex items-center gap-1.5 text-[#06381B] font-extrabold text-[15px] drop-shadow-xs">
                <span>{t('welcome_back', 'Welcome back')}</span>
                <span className="text-base">🌾</span>
              </div>
              
              <div className="mt-1 text-[#0A4D27] font-black tracking-tight leading-[1.04] text-[35px] drop-shadow-xs capitalize">
                {userFirstName}
                {userLastName && (
                  <>
                    <br />
                    {userLastName}
                  </>
                )}
              </div>
            </div>

            <div className={`text-[#06381B] font-extrabold text-[13.5px] drop-shadow-xs whitespace-pre-line ${currentLang === 'ta' ? 'leading-normal' : 'leading-snug'}`}>
              {t('smart_farming_tagline', 'Smart Farming,\nBetter Tomorrow.')}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          MAIN CONTENT AREA
         ========================================================== */}
      <main className="px-4 mt-4 flex flex-col gap-4">

        {/* ========================================================
            3. WEATHER CARD
           ======================================================== */}
        <section className="w-full bg-white rounded-[24px] border border-gray-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4">
          <div className="flex items-center justify-between">
            {/* Left: Weather Icon + Temp */}
            <div className="flex items-center gap-3">
              <img
                src={getWeatherConditionAsset(weather?.conditionKey, currentCondition)}
                alt="Weather"
                className="w-14 h-11 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/dashboard-images/weather_sun_cloud.png';
                }}
              />
              <div>
                <div className="font-black text-gray-900 text-[32px] leading-none">
                  {currentTemp}°C
                </div>
                <div className="text-gray-500 font-medium text-[11.5px] mt-1">
                  {currentCondition}
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-12 bg-gray-100 mx-2" />

            {/* Right Details */}
            <div className={`flex flex-col gap-1.5 text-[11px] ${currentLang === 'ta' ? 'translate-x-0' : '-translate-x-3 sm:-translate-x-3.5'}`}>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{t('humidity_label', 'Humidity')}: <strong className="text-gray-900">{humidityStr}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Wind className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t('wind_label', 'Wind')}: <strong className="text-gray-900">{windStr}</strong></span>
              </div>
              <div className="flex items-start gap-1.5 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="font-bold text-gray-900 leading-tight">
                  {displayDistrict},
                  <br />
                  {displayState}
                </div>
              </div>
            </div>
          </div>

          {/* 7 Day Forecast Subcard */}
          <div
            className={`mt-3.5 bg-[#F0FDF4] rounded-[16px] p-3 border border-emerald-100/60 ${
              currentLang === 'ta'
                ? 'flex flex-col gap-2.5'
                : 'flex items-center justify-between'
            }`}
          >
            <div className="w-full min-w-0">
              <div
                className={`font-extrabold text-[#0D5C2E] ${
                  currentLang === 'ta'
                    ? 'text-[13px] leading-snug break-normal'
                    : 'text-[13px]'
                }`}
              >
                {t('seven_day_forecast', '7 Day Forecast')}
              </div>
              <div
                className={`text-gray-500 font-medium ${
                  currentLang === 'ta'
                    ? 'text-[11px] leading-snug mt-0.5 break-normal'
                    : 'text-[10.5px]'
                }`}
              >
                {t('check_weather_updates', 'Check weather updates')}
              </div>
            </div>

            <button
              onClick={() => navigate('/weather')}
              className={`bg-[#0D5C2E] text-white font-bold text-[11px] rounded-full px-4 py-2 flex items-center gap-1.5 shadow-xs active:scale-95 transition shrink-0 cursor-pointer ${
                currentLang === 'ta' ? 'self-start' : ''
              }`}
            >
              <span className="leading-none">{t('view_forecast', 'View Forecast')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </section>

        {/* ========================================================
            4. QUICK ACCESS GRID (4x2)
           ======================================================== */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900">
              {t('quick_access', 'Quick Access')}
            </h2>

            <button
              onClick={() => navigate('/crop-intelligence')}
              className="flex items-center gap-1 text-[#0D5C2E] font-bold text-[12px] cursor-pointer"
            >
              {t('view_all', 'View All')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {quickAccessItems.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <button
                  onClick={() => navigate(item.path)}
                  className="w-full aspect-square rounded-[22px] overflow-hidden bg-transparent shadow-[0_4px_14px_rgba(0,0,0,0.08)] active:scale-95 transition-transform flex items-center justify-center"
                  aria-label={item.title}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className={`block w-full h-full object-cover transition-transform ${item.scale || 'scale-100'}`}
                  />
                </button>
                <span
                  className={`mt-1.5 font-bold text-gray-800 text-center ${
                    currentLang === 'ta'
                      ? 'text-[10px] leading-[1.2] break-normal max-w-full px-0.5'
                      : 'text-[11px] leading-tight'
                  }`}
                >
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </section>







      </main>



      {/* Language Selection Modal */}
      <Modal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        title="Select Language"
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {languages?.map((l: any) => (
              <button
                key={l.code}
                onClick={() => {
                  changeLanguage(l.code);
                  setIsLanguageModalOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                  currentLang === l.code
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.nativeName ? `${l.nativeName} (${l.name})` : l.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Dashboard;
