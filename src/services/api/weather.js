/**
 * Open-Meteo Live Weather & 7-Day Forecast Service for AGRIMITRA AI
 * Free, open-source meteorological API requiring zero API keys
 * Endpoint: https://api.open-meteo.com/v1/forecast
 * Geocoding: https://geocoding-api.open-meteo.com/v1/search
 */

import { getLocationCoordinates } from '../../data/indiaLocations';

/**
 * Map standard WMO weather codes to human-readable agricultural conditions
 */
const mapWmoCode = (code) => {
  if (code === 0) return { condition: "Clear Sky / Sunny", iconName: "Sun", isRainy: false };
  if ([1, 2, 3].includes(code)) return { condition: "Partly Cloudy", iconName: "CloudSun", isRainy: false };
  if ([45, 48].includes(code)) return { condition: "Misty / Foggy", iconName: "CloudSun", isRainy: false };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Light Drizzle Showers", iconName: "CloudRain", isRainy: true };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: "Moderate to Heavy Rain", iconName: "CloudRain", isRainy: true };
  if ([80, 81, 82].includes(code)) return { condition: "Rain Showers", iconName: "CloudRain", isRainy: true };
  if ([95, 96, 99].includes(code)) return { condition: "Scattered Thunderstorms", iconName: "CloudRain", isRainy: true };
  return { condition: "Clear / Fair", iconName: "Sun", isRainy: false };
};

const generateAgriInsights = (currentData, dailyData, wmoInfo, districtName, userCrop) => {
  const temp = Math.round(currentData?.temperature_2m || 30);
  const windSpeed = Math.round(currentData?.wind_speed_10m || 12);
  const rainProb = dailyData?.precipitation_probability_max?.[0] || 0;
  
  let summary = `Today in ${districtName}, expect ${wmoInfo.condition.toLowerCase()} conditions with a temperature around ${temp}Â°C. `;
  
  const recommendations = [];
  const alerts = [];

  // Weather Alerts with configurable thresholds
  if (temp >= 38) {
    alerts.push({ type: 'Heat Wave', severity: 'high', message: 'Extreme temperatures detected. Ensure adequate hydration for crops and livestock.' });
    summary += 'A heat wave is active, increasing heat stress on crops. ';
  }
  if (windSpeed >= 25) {
    alerts.push({ type: 'Strong Wind', severity: 'warning', message: 'High wind speeds can cause physical damage to tall crops and affect spraying.' });
  }
  if (rainProb >= 60) {
    alerts.push({ type: 'Heavy Rain Warning', severity: 'warning', message: 'Expected heavy rainfall could lead to surface runoff.' });
  }
  if (wmoInfo.condition.includes('Thunderstorm') || wmoInfo.condition.includes('Heavy Rain')) {
    alerts.push({ type: 'Severe Weather', severity: 'high', message: 'Severe weather risk. Halt field operations and seek shelter.' });
  }

  // Base Agricultural Recommendations based on Weather
  if (temp > 38) {
    recommendations.push({ title: 'Irrigation', action: 'Increase Frequency', icon: 'Droplets', color: 'text-blue-500', bg: 'bg-blue-50', text: 'Irrigate during early morning or late evening to minimize evaporation.' });
  } else if (rainProb > 70) {
    recommendations.push({ title: 'Irrigation', action: 'Pause', icon: 'Droplets', color: 'text-blue-500', bg: 'bg-blue-50', text: 'Pause scheduled irrigation to prevent waterlogging.' });
  } else {
    recommendations.push({ title: 'Irrigation', action: 'Standard Schedule', icon: 'Droplets', color: 'text-blue-500', bg: 'bg-blue-50', text: 'Maintain regular irrigation based on soil moisture sensors.' });
  }

  if (windSpeed > 25) {
    recommendations.push({ title: 'Pesticide', action: 'Delay Spraying', icon: 'Bug', color: 'text-red-500', bg: 'bg-red-50', text: 'Avoid spraying pesticides; high winds will cause excessive drift.' });
  } else if (rainProb > 50) {
    recommendations.push({ title: 'Pesticide', action: 'Delay Spraying', icon: 'Bug', color: 'text-red-500', bg: 'bg-red-50', text: 'Rain may wash away applied chemicals. Wait for clear weather.' });
  } else {
    recommendations.push({ title: 'Pesticide', action: 'Ideal Conditions', icon: 'Bug', color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'Good conditions for foliar sprays if pest thresholds are met.' });
  }

  if (rainProb > 60) {
    recommendations.push({ title: 'Fertilizer', action: 'Delay Application', icon: 'Layers', color: 'text-amber-500', bg: 'bg-amber-50', text: 'Avoid soil fertilizers to prevent nutrient leaching from runoff.' });
  } else {
    recommendations.push({ title: 'Fertilizer', action: 'Apply as Needed', icon: 'Layers', color: 'text-amber-500', bg: 'bg-amber-50', text: 'Optimal conditions for soil and basal fertilizer application.' });
  }

  if (alerts.length === 0) {
    summary += 'Favorable weather for standard farming activities. ';
  }

  let suitabilityScore = 100;
  if (temp > 35) suitabilityScore -= (temp - 35) * 2;
  if (temp < 15) suitabilityScore -= (15 - temp) * 2;
  if (windSpeed > 20) suitabilityScore -= (windSpeed - 20);
  if (rainProb > 80) suitabilityScore -= 10;
  
  suitabilityScore = Math.max(0, Math.min(100, Math.round(suitabilityScore)));
  let suitabilityCategory = "Excellent";
  if (suitabilityScore < 40) suitabilityCategory = "Poor";
  else if (suitabilityScore < 60) suitabilityCategory = "Moderate";
  else if (suitabilityScore < 80) suitabilityCategory = "Good";

  // Strict Dynamic Crop-Specific Advice
  const cropLower = (userCrop || "").toLowerCase();
  const cropAdviceArray = [];
  
  if (cropLower.includes('paddy')) {
    if (rainProb > 70) cropAdviceArray.push('Delay irrigation if heavy rain is expected.');
    else if (temp > 35) cropAdviceArray.push('Maintain standing water to protect paddy from heat stress.');
    else cropAdviceArray.push('Ideal weather for paddy growth. Monitor water levels.');
  } else if (cropLower.includes('cotton')) {
    if (windSpeed > 20) cropAdviceArray.push('Delay pesticide spraying if wind speed is high.');
    else if (rainProb > 50) cropAdviceArray.push('Rain expected. Delay defoliation or boll opening activities.');
    else cropAdviceArray.push('Favorable weather for cotton picking and spraying.');
  } else if (cropLower.includes('sugarcane')) {
    if (rainProb < 30) cropAdviceArray.push('Irrigation recommended due to low rainfall probability.');
    else if (windSpeed > 30) cropAdviceArray.push('Risk of lodging due to high winds.');
    else cropAdviceArray.push('Good conditions for sugarcane maturation and tillering.');
  } else {
    // Generic fallback for other crops
    if (rainProb > 50) cropAdviceArray.push(`High rain probability. Delay fertilizer application for ${userCrop}.`);
    else if (temp > 35) cropAdviceArray.push(`High temperatures require increased irrigation frequency for ${userCrop}.`);
    else if (windSpeed > 25) cropAdviceArray.push(`Delay pesticide spraying for ${userCrop} due to strong winds.`);
    else cropAdviceArray.push(`Current weather is highly suitable for standard ${userCrop} farming activities.`);
  }

  return { 
    aiSummary: summary, 
    recommendations, 
    alerts,
    suitabilityScore,
    suitabilityCategory,
    cropAdvice: cropAdviceArray.join(' ')
  };
};

/**
 * Fetch real-time current weather & 7-day daily forecast from Open-Meteo
 */
const fetchLiveWeather = async (districtName = "Thanjavur", stateName = "Tamil Nadu", userCrop = "Paddy") => {
  let lat, lon, locName;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 8000);

  // Try geocoding first
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(districtName)}&admin1=${encodeURIComponent(stateName)}&country=India&count=1`;
    const geoRes = await fetch(geoUrl, { signal: abortController.signal });
    const geoData = await geoRes.json();
    if (geoData.results && geoData.results.length > 0) {
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
      locName = `${districtName}, ${stateName}`;
    } else {
      throw new Error('Geocoding found no results');
    }
  } catch (geoErr) {
    // Fallback to coordinates based on state/district mapping
    const coords = getLocationCoordinates(stateName, districtName);
    lat = coords.lat;
    lon = coords.lon;
    locName = coords.name;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    
    const response = await fetch(url, { signal: abortController.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`Open-Meteo returned status ${response.status}`);
    const data = await response.json();

    const currentWmo = mapWmoCode(data.current?.weather_code || 0);

    // Format daily forecast
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyForecast = (data.daily?.time || []).map((dateStr, idx) => {
      const dateObj = new Date(dateStr);
      const dayName = idx === 0 ? "Today" : daysOfWeek[dateObj.getDay()];
      const wmoInfo = mapWmoCode(data.daily.weather_code[idx] || 0);
      return {
        day: dayName,
        date: dateStr,
        temp: `${Math.round(data.daily.temperature_2m_max[idx])}Â° / ${Math.round(data.daily.temperature_2m_min[idx])}Â°`,
        condition: wmoInfo.condition,
        rain: `${data.daily.precipitation_probability_max[idx] || 0}%`,
        isRainy: wmoInfo.isRainy
      };
    });

    const insights = generateAgriInsights(data.current, data.daily, currentWmo, districtName, userCrop);

    const weatherSummary = {
      locationName: locName,
      temp: Math.round(data.current?.temperature_2m || 30),
      feelsLike: Math.round(data.current?.apparent_temperature || 32),
      condition: currentWmo.condition,
      humidity: Math.round(data.current?.relative_humidity_2m || 65),
      windSpeed: `${Math.round(data.current?.wind_speed_10m || 12)} km/h`,
      rainfall: `${data.current?.precipitation || 0} mm`,
      pressure: `${Math.round(data.current?.surface_pressure || 1012)} hPa`,
      high: Math.round(data.daily?.temperature_2m_max?.[0] || 33),
      low: Math.round(data.daily?.temperature_2m_min?.[0] || 24),
      rainProbabilityTomorrow: data.daily?.precipitation_probability_max?.[1] || 15,
      dailyForecast,
      aiSummary: insights.aiSummary,
      recommendations: insights.recommendations,
      alerts: insights.alerts,
      suitabilityScore: insights.suitabilityScore,
      suitabilityCategory: insights.suitabilityCategory,
      cropAdvice: insights.cropAdvice,
      source: "Open-Meteo Live API",
      timestamp: new Date().toLocaleTimeString()
    };

    return { weather: weatherSummary, error: null };
  } catch (error) {
    console.warn("Open-Meteo live fetch failed:", error.message);
    // Return explicit error for UI handling
    return {
      weather: null,
      error: "Failed to fetch live weather data. Please check your network connection and try again."
    };
  }
};

export const weatherApi = {
  fetchLiveWeather,
  mapWmoCode
};
