/**
 * Smart Irrigation Decision Engine
 * 
 * Evaluates REAL available farm/environmental data:
 * - Real Open-Meteo meteorological data (rain probability, precipitation, temperature)
 * - Real Firestore soil moisture from sensor_readings/latest (with stale data protection)
 * - Real authenticated user crop
 * - Real user configured irrigation schedule
 * - Real historical watering skip activity
 * 
 * STRICT: Zero mock data. Zero fake sensor values. Zero invented thresholds. Zero random times.
 */

import { isSensorDataFresh, parseSensorTimestamp } from './sensorAlertService.js';

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

/**
 * Calculates the next recommended watering time strictly from the user's REAL configured schedule.
 * If conditions indicate skipping, finds the next scheduled time.
 * If no future slot remains today, finds the earliest slot for tomorrow.
 * If no schedule is configured, returns null (never invents a random time).
 */
export const calculateNextScheduledWatering = (schedules = [], referenceDate = new Date()) => {
  const enabledSlots = (schedules || [])
    .filter((s) => s && s.enabled && s.time)
    .map((s) => ({
      ...s,
      minutes: parseTimeToMinutes(s.time)
    }))
    .sort((a, b) => a.minutes - b.minutes);

  if (enabledSlots.length === 0) {
    return null;
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  // 1. Check for next slot today
  const nextToday = enabledSlots.find((s) => s.minutes > currentMinutes);
  if (nextToday) {
    return {
      time: nextToday.time,
      isTomorrow: false
    };
  }

  // 2. Earliest slot tomorrow
  const earliestTomorrow = enabledSlots[0];
  return {
    time: earliestTomorrow.time,
    isTomorrow: true
  };
};

/**
 * Calculates water-saving activity strictly from real recorded skip history within the last 7 days.
 * If no real records exist, returns showInsight: false (zero fabricated statistics).
 */
export const calculateWaterSavingStats = (history = [], referenceDate = new Date()) => {
  if (!Array.isArray(history) || history.length === 0) {
    return { showInsight: false, weeklyCount: 0 };
  }

  const refTime = referenceDate.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const validWeeklySkips = history.filter((entry) => {
    if (!entry) return false;
    const t = entry.timestamp ? new Date(entry.timestamp).getTime() : null;
    if (!t || isNaN(t)) return false;
    const age = refTime - t;
    return age >= 0 && age <= sevenDaysMs;
  });

  if (validWeeklySkips.length === 0) {
    return { showInsight: false, weeklyCount: 0 };
  }

  return {
    showInsight: true,
    weeklyCount: validWeeklySkips.length
  };
};

/**
 * Evaluates live farm conditions and generates decision support recommendations.
 *
 * @param {Object} params
 * @param {Object|null} params.weather - Real Open-Meteo live weather data
 * @param {Object|null} params.sensorData - Real Firestore sensor readings
 * @param {string|null} params.userCrop - Real user primary crop name
 * @param {Array} params.schedules - Real user irrigation schedules
 * @param {Array} params.history - Real user skip history
 * @param {Date} params.referenceDate - Optional reference date (defaults to current Date)
 */
export const evaluateIrrigationConditions = ({
  weather = null,
  sensorData = null,
  userCrop = null,
  schedules = [],
  history = [],
  referenceDate = new Date()
} = {}) => {
  // 1. Real Weather Extraction
  const temp = typeof weather?.temp === 'number' ? weather.temp : null;
  
  let rainProb = null;
  if (weather?.rainProbabilityTomorrow != null) {
    rainProb = Number(weather.rainProbabilityTomorrow);
  } else if (weather?.dailyForecast?.[0]?.rain) {
    const parsed = parseInt(weather.dailyForecast[0].rain, 10);
    if (!isNaN(parsed)) rainProb = parsed;
  }

  let rainMm = 0;
  if (weather?.rainfall) {
    const parsed = parseFloat(String(weather.rainfall).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) rainMm = parsed;
  }

  const rainRisk = weather?.intelligence?.rainRisk || null;
  const isRainExpected = (rainProb != null && rainProb >= 60) || rainMm >= 5 || rainRisk === 'High';

  // 2. Real Soil Moisture Extraction (with stale data protection)
  const isSoilFresh = sensorData?.timestamp ? isSensorDataFresh(sensorData.timestamp) : false;
  const rawSM = sensorData?.soil_moisture_percent ?? null;
  const hasLiveSoil = isSoilFresh && rawSM != null && !isNaN(Number(rawSM));
  const soilMoisture = hasLiveSoil ? Number(rawSM) : null;

  // Reusing existing project thresholds from Weather.jsx: low < 35%, sufficient >= 40%
  const isSoilLow = hasLiveSoil && soilMoisture < 35;
  const isSoilSufficient = hasLiveSoil && soilMoisture >= 40;
  const isSoilModerate = hasLiveSoil && soilMoisture >= 35 && soilMoisture < 40;

  // 3. Real Crop Information
  const activeCrop = userCrop ? String(userCrop).trim() : null;

  // 4. Decision Synthesis
  let decision = 'STANDARD';
  let titleKey = 'irrigation_rec_normal_title';
  let descKey = 'irrigation_rec_normal_desc';
  let canSkip = false;
  let statusType = 'success'; // 'warning' | 'info' | 'danger' | 'success'

  if (isRainExpected) {
    // Condition: Rain is expected soon
    decision = 'SKIP_RAIN';
    titleKey = 'irrigation_rec_rain_title';
    descKey = 'irrigation_rec_rain_desc';
    canSkip = true;
    statusType = 'warning';
  } else if (hasLiveSoil && isSoilSufficient) {
    // Condition: Soil moisture is sufficient, extra watering can cause waterlogging
    decision = 'SKIP_MOISTURE';
    titleKey = 'irrigation_rec_soil_sufficient_title';
    descKey = 'irrigation_rec_soil_sufficient_desc';
    canSkip = true;
    statusType = 'info';
  } else if (hasLiveSoil && isSoilLow) {
    // Condition: Soil moisture is low, watering needed
    decision = 'WATER_RECOMMENDED';
    titleKey = 'irrigation_rec_soil_low_title';
    descKey = 'irrigation_rec_soil_low_desc';
    canSkip = false;
    statusType = 'danger';
  } else {
    // Standard schedule
    decision = 'STANDARD';
    titleKey = 'irrigation_rec_normal_title';
    descKey = 'irrigation_rec_normal_desc';
    canSkip = false;
    statusType = 'success';
  }

  // 5. Smart Reschedule Suggestion (Deterministic from existing schedules)
  const nextScheduled = calculateNextScheduledWatering(schedules, referenceDate);

  // 6. Water-Saving Activity (Real data only)
  const waterSaving = calculateWaterSavingStats(history, referenceDate);

  return {
    decision,
    titleKey,
    descKey,
    canSkip,
    statusType,
    crop: activeCrop,
    weatherData: {
      temperature: temp,
      rainProbability: rainProb,
      isRainExpected,
      rainfallMm: rainMm,
      condition: weather?.condition || null
    },
    soilData: {
      hasLiveSoil,
      soilMoisture,
      isSoilLow,
      isSoilSufficient,
      isSoilModerate,
      isStaleOrOffline: !hasLiveSoil
    },
    nextScheduled,
    waterSaving
  };
};

export default {
  parseTimeToMinutes,
  calculateNextScheduledWatering,
  calculateWaterSavingStats,
  evaluateIrrigationConditions
};
