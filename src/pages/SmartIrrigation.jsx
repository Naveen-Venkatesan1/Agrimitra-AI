import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Bell,
  Clock,
  Droplets,
  CloudRain,
  Sparkles,
  Sprout,
  Info
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { requestNotificationPermissionAndGetToken } from '../config/firebase';
import {
  parseTimeToMinutes,
  evaluateIrrigationConditions
} from '../services/smartIrrigationDecision';

const convert12hTo24h = (time12h) => {
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '06:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3] ? match[3].toUpperCase() : 'AM';
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const convert24hTo12h = (time24) => {
  if (!time24) return '12:00 PM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
};

export const SmartIrrigation = () => {
  const {
    authLoading,
    addAlert,
    user,
    selectedState,
    selectedDistrict,
    updateUserProfile,
    weather,
    fetchLiveWeather,
    sensorData
  } = useAppStore();

  const { t, currentLang } = useTranslation();

  // Local UI States
  const [schedules, setSchedules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingTimeRaw, setEditingTimeRaw] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newHour, setNewHour] = useState('06');
  const [newMin, setNewMin] = useState('00');
  const [newAmPm, setNewAmPm] = useState('AM');
  const [masterToggleState, setMasterToggleState] = useState(user?.irrigationSchedule?.enabled ?? true);
  const [addError, setAddError] = useState('');
  
  const [scheduledAlert, setScheduledAlert] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Fetch live weather if not available in store
  useEffect(() => {
    if (!weather && fetchLiveWeather) {
      const d = selectedDistrict || user?.district || 'Chennai';
      const s = selectedState || user?.state || 'Tamil Nadu';
      const c = user?.primaryCrop || user?.crop || 'Paddy';
      fetchLiveWeather(d, s, c).catch(console.warn);
    }
  }, [weather, selectedDistrict, selectedState, user, fetchLiveWeather]);

  // Synchronize schedules on mount / user profile change
  useEffect(() => {
    const times = user?.irrigationSchedule?.times || [];
    const disabledTimes = user?.irrigationSchedule?.disabledTimes || [];

    if (times.length === 0 && disabledTimes.length === 0) {
      // Seed default fallback schedule as requested in spec
      if (user?.id && !user?.irrigationSchedule) {
        updateUserProfile({
          irrigationSchedule: {
            enabled: true,
            times: ['06:00 AM', '12:00 PM', '06:00 PM'],
            disabledTimes: [],
            history: []
          }
        }).catch(console.warn);
      }
    } else {
      const merged = [
        ...times.map((t, idx) => ({ id: `en-${idx}-${t}`, time: t, enabled: true })),
        ...disabledTimes.map((t, idx) => ({ id: `dis-${idx}-${t}`, time: t, enabled: false }))
      ];
      merged.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
      setSchedules(merged);
    }
    
    if (user?.irrigationSchedule?.enabled !== undefined) {
      setMasterToggleState(user.irrigationSchedule.enabled);
    }
  }, [user]);

  const locationName = `${selectedDistrict || user?.district || 'Chennai'}, ${selectedState || user?.state || 'Tamil Nadu'}`;

  // Evaluate REAL farm and environment conditions
  const userCrop = user?.primaryCrop || user?.crop || null;
  const history = user?.irrigationSchedule?.history || [];

  const decisionResult = evaluateIrrigationConditions({
    weather,
    sensorData,
    userCrop,
    schedules,
    history
  });

  // Central schedule saver helper
  const saveSchedulesToFirestore = async (updatedSchedules, masterEnabled = null) => {
    const times = updatedSchedules.filter(s => s.enabled).map(s => s.time);
    const disabledTimes = updatedSchedules.filter(s => !s.enabled).map(s => s.time);
    const isMasterEnabled = masterEnabled !== null ? masterEnabled : masterToggleState;

    try {
      const scheduleUpdate = {
        irrigationSchedule: {
          enabled: isMasterEnabled,
          times,
          disabledTimes,
          history: user?.irrigationSchedule?.history || []
        },
        languageCode: currentLang || 'en'
      };

      await updateUserProfile(scheduleUpdate);
      
      setScheduledAlert(true);
      setTimeout(() => setScheduledAlert(false), 3000);

      // Async FCM request so we don't block the UI update
      if (user?.id) {
        requestNotificationPermissionAndGetToken(user.id).catch(console.warn);
      }
    } catch (saveErr) {
      console.error("Failed to save schedule update to Firestore:", saveErr);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditingTimeRaw(convert12hTo24h(item.time));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTimeRaw('');
  };

  const handleSaveEdit = async (id) => {
    if (!editingTimeRaw) return;
    const formatted12h = convert24hTo12h(editingTimeRaw);
    
    const updated = schedules.map(s => s.id === id ? { ...s, time: formatted12h } : s);
    updated.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    setSchedules(updated);
    setEditingId(null);
    await saveSchedulesToFirestore(updated);
  };

  const handleDeleteSchedule = async (id) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    await saveSchedulesToFirestore(updated);
  };

  const handleToggleSchedule = async (id) => {
    const updated = schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setSchedules(updated);
    await saveSchedulesToFirestore(updated);
  };

  const handleAddSchedule = async () => {
    setAddError('');
    if (schedules.length >= 3) {
      setAddError(t('irrigation_limit_reached', 'Limit reached (max 3 schedules).'));
      return;
    }

    const formatted12h = `${newHour}:${newMin} ${newAmPm}`;

    if (schedules.some(s => s.time === formatted12h)) {
      setAddError(`${formatted12h} is already in your schedule.`);
      return;
    }

    const newItem = {
      id: `new-${Date.now()}`,
      time: formatted12h,
      enabled: true
    };

    const updated = [...schedules, newItem];
    updated.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    setSchedules(updated);
    setIsAdding(false);
    await saveSchedulesToFirestore(updated);
  };

  const handleMasterToggle = async (val) => {
    setMasterToggleState(val);
    await saveSchedulesToFirestore(schedules, val);
  };

  // Farmer Smart Decision Actions
  const handleSkipWatering = async () => {
    const newEntry = {
      id: `skip-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reason: decisionResult.decision === 'SKIP_RAIN' ? 'Rain Expected' : 'Soil Moisture Sufficient',
      nextScheduled: decisionResult.nextScheduled?.time || null
    };
    const updatedHistory = [newEntry, ...history];

    try {
      await updateUserProfile({
        irrigationSchedule: {
          ...user?.irrigationSchedule,
          history: updatedHistory
        }
      });

      const nextText = decisionResult.nextScheduled
        ? `${t('irrigation_next_recommended', 'Next recommended watering')}: ${decisionResult.nextScheduled.time}`
        : t('irrigation_next_review_tomorrow', "Review at tomorrow's scheduled watering.");

      if (addAlert) {
        addAlert({
          title: t('irrigation_skipped_banner', 'Watering skipped based on live farm conditions.'),
          message: nextText,
          titleKey: 'irrigation_skipped_banner',
          type: 'Smart Irrigation',
          category: 'irrigation',
          severity: 'info',
          timestamp: new Date().toISOString()
        });
      }

      setActionFeedback({
        type: 'skip',
        message: `${t('irrigation_skipped_banner', 'Watering skipped based on live farm conditions.')} ${nextText}`
      });
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err) {
      console.warn('Error recording skip action:', err);
    }
  };

  const handleContinueWatering = () => {
    setActionFeedback({
      type: 'continue',
      message: t('irrigation_rec_normal_desc', 'Conditions are favorable. Maintain regular watering schedule.')
    });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  if (authLoading || !user) {
    return (
      <div className="space-y-6 w-full animate-pulse pb-12 text-gray-700 max-w-full">
        <div className="h-20 bg-gray-200 rounded-2xl w-full max-w-md"></div>
        <div className="h-80 bg-gray-200 rounded-3xl max-w-3xl mx-auto"></div>
      </div>
    );
  }

  const isMaxReached = schedules.length >= 3;

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-lg mx-auto px-4 pb-20 pt-2 animate-fade-in text-gray-800 overflow-x-hidden">
      
      {/* 1. PAGE HEADER */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
            <Droplets className="w-2.5 h-2.5" />
          </span>
          <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
            Phase 1 • {locationName}
          </span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {t('smart_irrigation', 'Smart Irrigation')}
        </h1>
        <p className="text-xs font-medium text-gray-500 mt-1 leading-snug">
          {t('irrigation_page_subtitle', 'Automated AI water management & sensor monitoring')}
        </p>
      </div>

      {/* Dynamic Action Feedbacks */}
      {scheduledAlert && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-fade-in-down w-full min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="min-w-0 flex-1 break-words">{t('irrigation_synced', 'Irrigation schedules updated and synchronized with notifications successfully.')}</span>
        </div>
      )}

      {actionFeedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-fade-in-down w-full min-w-0 ${
          actionFeedback.type === 'skip'
            ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : 'bg-blue-50 border border-blue-200 text-blue-900'
        }`}>
          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${actionFeedback.type === 'skip' ? 'text-amber-600' : 'text-blue-600'}`} />
          <span className="min-w-0 flex-1 break-words">{actionFeedback.message}</span>
        </div>
      )}

      {/* 3. SMART DECISION SUPPORT CARD (REFERENCE DESIGN) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-5 space-y-4 w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                Smart Irrigation<br />Decision Support
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Live Farm & Weather Conditions
              </p>
            </div>
          </div>
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Real-time
          </span>
        </div>

        {/* 3 Condition Cards Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
          {/* Card 1: Crop */}
          <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 flex-shrink-0">
              <Sprout className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 block mb-0.5 truncate w-full">
              {t('irrigation_crop_label', 'Crop')}
            </span>
            <span className="text-xs sm:text-sm font-black text-gray-900 block truncate w-full">
              {decisionResult.crop || 'Paddy'}
            </span>
          </div>

          {/* Card 2: Rain Probability */}
          <div className="bg-blue-50/40 border border-blue-100/60 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 flex-shrink-0">
              <CloudRain className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 block mb-0.5 truncate w-full">
              {t('irrigation_rain_prob_label', 'Rain Probability')}
            </span>
            <span className="text-xs sm:text-sm font-black text-gray-900 block truncate w-full">
              {decisionResult.weatherData.rainProbability != null ? `${decisionResult.weatherData.rainProbability}%` : '--'}
            </span>
            <span className="text-[10px] font-semibold text-gray-400 block truncate w-full">
              {decisionResult.weatherData.temperature != null ? `${decisionResult.weatherData.temperature}°C` : ''}
            </span>
          </div>

          {/* Card 3: Soil Moisture */}
          <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-1 flex-shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 block mb-0.5 truncate w-full">
              {t('irrigation_soil_moisture_label', 'Soil Moisture')}
            </span>
            <span className="text-xs sm:text-sm font-black text-gray-900 block truncate w-full">
              {decisionResult.soilData.hasLiveSoil ? `${decisionResult.soilData.soilMoisture}%` : '--'}
            </span>
            <span className="mt-0.5 block w-full">
              {decisionResult.soilData.hasLiveSoil ? (
                <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                  decisionResult.soilData.isSoilLow 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : decisionResult.soilData.isSoilSufficient 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-teal-100 text-teal-700'
                }`}>
                  {decisionResult.soilData.isSoilLow 
                    ? t('irrigation_soil_low', 'Low')
                    : decisionResult.soilData.isSoilSufficient 
                      ? t('irrigation_soil_sufficient', 'Sufficient')
                      : t('irrigation_soil_moderate', 'Moderate')}
                </span>
              ) : (
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-100 text-gray-400">
                  {t('irrigation_soil_offline', 'Offline')}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Dynamic Recommendation Box (Pale Cream Card) */}
        <div className="bg-[#FEF9EE] border border-amber-200/70 rounded-2xl p-4 sm:p-4.5 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CloudRain className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-extrabold text-[#7A3E00] leading-tight">
                {t(decisionResult.titleKey)}
              </h3>
              <p className="text-xs font-medium text-[#7A3E00]/90 mt-1 leading-relaxed">
                {t(decisionResult.descKey)}
              </p>
            </div>
          </div>

          {/* Next Recommended Reschedule Time */}
          {decisionResult.nextScheduled && (
            <div className="pt-3 border-t border-amber-200/60 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs min-w-0 flex-1">
                <span className="text-gray-700 font-medium block">
                  {t('irrigation_next_recommended', 'Next recommended watering')}:
                </span>
                <span className="text-sm font-extrabold text-gray-900 block mt-0.5">
                  {decisionResult.nextScheduled.time} {decisionResult.nextScheduled.isTomorrow ? '(Tomorrow)' : '(Today)'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {decisionResult.canSkip && (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSkipWatering}
                className="w-full py-2.5 sm:py-3 bg-[#D97706] hover:bg-[#B45309] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer"
              >
                {t('irrigation_action_skip', 'Skip This Watering')}
              </button>
              <button
                onClick={handleContinueWatering}
                className="w-full py-2.5 sm:py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-bold rounded-xl transition shadow-2xs flex items-center justify-center cursor-pointer"
              >
                {t('irrigation_action_continue', 'Continue Watering')}
              </button>
            </div>
          )}
        </div>

        {/* Real Water-Saving Insight (Soft Ice Blue Card) */}
        {decisionResult.waterSaving?.showInsight && (
          <div className="bg-[#F3F7FB] border border-blue-100/70 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-blue-500 flex items-center justify-center shadow-xs flex-shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
            <div className="text-xs min-w-0 flex-1">
              <span className="font-extrabold text-gray-900 block">
                {t('irrigation_water_saving_title', 'Water-Saving Activity')}
              </span>
              <span className="font-medium text-gray-600 block mt-0.5 leading-relaxed">
                {t('irrigation_water_saving_desc', '{count} irrigation schedule(s) were skipped this week based on real weather conditions.').replace('{count}', decisionResult.waterSaving.weeklyCount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. WATERING SCHEDULE CARD (REFERENCE DESIGN SCREENSHOT 2) */}
      <div className="bg-gradient-to-b from-emerald-50/50 via-white to-white rounded-3xl border border-emerald-100/60 shadow-xl shadow-gray-200/40 p-5 space-y-4 w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
              Watering<br />Schedule
            </h2>
          </div>

          <div className="bg-gray-100/90 px-3 py-1.5 rounded-full border border-gray-200/60 flex-shrink-0">
            <span className="text-xs font-black text-gray-700">
              <span className="text-amber-500">{schedules.length}</span> / 3 slots
            </span>
          </div>
        </div>

        {/* Schedule Slot Cards List */}
        <div className="space-y-3 pt-1">
          {schedules.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-white border border-gray-100 shadow-xs rounded-2xl flex items-center justify-between transition-all ${
                !item.enabled ? 'opacity-70 grayscale-[20%]' : ''
              }`}
            >
              {editingId === item.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="time"
                    value={editingTimeRaw}
                    onChange={(e) => setEditingTimeRaw(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 flex-1 focus:outline-none"
                  />
                  <button onClick={() => handleSaveEdit(item.id)} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">{t('save', 'Save')}</button>
                  <button onClick={handleCancelEdit} className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl">{t('cancel', 'Cancel')}</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{item.time.split(' ')[0]}</span>
                      <span className="text-xs sm:text-sm font-black text-gray-900">{item.time.split(' ')[1]}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">
                        {t('daily', 'DAILY')}
                      </span>
                      {!item.enabled && (
                        <span className="text-[10px] font-extrabold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider ml-1.5">
                          {t('paused', 'PAUSED')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Switch */}
                    <button
                      onClick={() => handleToggleSchedule(item.id)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                        item.enabled ? 'bg-[#10B981]' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={item.enabled}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out ${
                          item.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Inline Add Schedule Form */}
          {isAdding ? (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xs flex-1 justify-center">
                  <Clock className="w-4 h-4 text-emerald-500 hidden sm:block" />
                  <div className="flex items-center">
                    <select
                      value={newHour}
                      onChange={(e) => { setNewHour(e.target.value); setAddError(''); }}
                      className="bg-transparent text-base font-black text-gray-800 focus:outline-none cursor-pointer appearance-none text-center w-8"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="text-base font-black text-gray-400 mx-1">:</span>
                    <select
                      value={newMin}
                      onChange={(e) => { setNewMin(e.target.value); setAddError(''); }}
                      className="bg-transparent text-base font-black text-gray-800 focus:outline-none cursor-pointer appearance-none text-center w-8"
                    >
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={newAmPm}
                    onChange={(e) => { setNewAmPm(e.target.value); setAddError(''); }}
                    className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none cursor-pointer text-emerald-700 ml-2"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddSchedule}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    {t('add_time', 'Add Time')}
                  </button>
                  <button
                    onClick={() => { setIsAdding(false); setAddError(''); }}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                </div>
              </div>
              {addError && (
                <div className="text-rose-600 text-xs font-bold px-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" /> {addError}
                </div>
              )}
            </div>
          ) : (
            !isMaxReached && (
              <button
                onClick={() => {
                  let defaultHour = '06';
                  let defaultAmPm = 'AM';
                  const existingTimes = schedules.map(s => s.time);
                  if (existingTimes.includes('06:00 AM') && !existingTimes.includes('06:00 PM')) {
                    defaultHour = '06'; defaultAmPm = 'PM';
                  } else if (!existingTimes.includes('08:00 AM')) {
                    defaultHour = '08'; defaultAmPm = 'AM';
                  } else {
                    defaultHour = '09'; defaultAmPm = 'AM';
                  }
                  setNewHour(defaultHour);
                  setNewMin('00');
                  setNewAmPm(defaultAmPm);
                  setAddError('');
                  setIsAdding(true);
                }}
                className="w-full py-3.5 border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-500 hover:text-emerald-700 text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" /> {t('add_new_watering_time', 'Add new watering time')}
              </button>
            )
          )}

          {/* Maximum Limit Warning inside Schedule Card */}
          {isMaxReached && !isAdding && (
            <div className="bg-[#FEF8ED] border border-amber-200/50 rounded-2xl p-3.5 text-center text-xs font-bold text-[#B45309]">
              {t('max_limit_schedules', 'Maximum limit of 3 daily watering schedules reached.')}
            </div>
          )}
        </div>

        {/* Master Notifications Banner inside Schedule Card */}
        <div className="bg-[#0E1726] rounded-2xl p-4 flex items-center justify-between text-white shadow-md mt-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                {t('notifications_active', 'Notifications are Active')}
              </span>
              <span className="text-[11px] text-gray-300 font-medium block mt-0.5 leading-snug">
                {t('notifications_desc', "You'll receive farm condition based watering reminders.")}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleMasterToggle(!masterToggleState)}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
              masterToggleState ? 'bg-[#10B981]' : 'bg-gray-600'
            }`}
            role="switch"
            aria-checked={masterToggleState}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                masterToggleState ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartIrrigation;
