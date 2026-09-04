/**
 * weatherCropAnalysis.js
 * 
 * Farm Weather Intelligence Engine
 * Transforms raw weather data into crop-specific agricultural intelligence.
 */

/**
 * Main intelligence function.
 * @param {Object} params - The current weather parameters
 * @returns {Object} Intelligence payload containing risks and actions
 */
export const analyzeWeatherForCrop = ({
  location,
  crop,
  growthStage,
  temperature,
  humidity,
  rainProbability,
  rainfall,
  windSpeedStr, // e.g., "12 km/h"
  windDirection,
  forecast7Day
}) => {
  // 1. Data Normalization
  const temp = parseFloat(temperature) || 0;
  const hum = parseFloat(humidity) || 0;
  const rainProb = parseFloat(rainProbability) || 0;
  const rainAmt = parseFloat(rainfall) || 0;
  const windSpd = windSpeedStr ? parseFloat(windSpeedStr.replace(/[^0-9.]/g, '')) : 0;
  
  const hasCropInfo = !!crop;
  const activeCrop = crop || 'your crop';
  const stage = growthStage || '';
  const hasStageInfo = !!growthStage;

  // 2. Risk Calculation (Rule-based)
  let rainRisk = 'Low';
  if (rainProb > 70 || rainAmt > 20) rainRisk = 'High';
  else if (rainProb > 40 || rainAmt > 5) rainRisk = 'Moderate';

  let heatRisk = 'Low';
  if (temp > 38) heatRisk = 'High';
  else if (temp > 33) heatRisk = 'Moderate';

  let fungalRisk = 'Low';
  // High humidity + warm temps often favor fungal growth
  if (hum > 85 && temp > 20 && temp < 32) fungalRisk = 'High';
  else if (hum > 75) fungalRisk = 'Moderate';

  let windRisk = 'Low';
  if (windSpd > 40) windRisk = 'High';
  else if (windSpd > 25) windRisk = 'Moderate';

  // Overall Risk (Maximum individual risk)
  const riskLevels = [rainRisk, heatRisk, fungalRisk, windRisk];
  let overallRisk = 'Low';
  if (riskLevels.includes('High')) overallRisk = 'High';
  else if (riskLevels.includes('Moderate')) overallRisk = 'Moderate';

  // 3. Crop Impact & Action Generation
  const todayActions = [];
  const avoidActions = [];
  const monitorActions = [];
  
  let cropImpact = 'Low';
  if (overallRisk === 'High') cropImpact = 'High';
  else if (overallRisk === 'Moderate') cropImpact = 'Moderate';

  // Rain Logic
  if (rainRisk === 'High') {
    avoidActions.push('Avoid unnecessary irrigation to prevent waterlogging.');
    avoidActions.push('Do not apply fertilizers or pesticides today (high wash-off risk).');
    monitorActions.push('Check field drainage systems.');
  } else if (rainRisk === 'Moderate') {
    todayActions.push('Delay chemical spraying if rain clouds are forming.');
    monitorActions.push('Monitor soil moisture before irrigating.');
  } else {
    todayActions.push('Good conditions for scheduled irrigation if soil is dry.');
    todayActions.push('Favorable weather for chemical spraying if needed.');
  }

  // Heat Logic
  if (heatRisk === 'High') {
    avoidActions.push('Avoid transplanting or stressing the crop during peak afternoon heat.');
    monitorActions.push(`Monitor ${activeCrop} for signs of severe water stress or wilting.`);
    todayActions.push('Ensure adequate soil moisture is maintained.');
  } else if (heatRisk === 'Moderate') {
    monitorActions.push('Keep an eye on soil moisture evaporation rates.');
  }

  // Fungal Risk Logic
  if (fungalRisk === 'High') {
    monitorActions.push(`Conditions favor fungal growth. Actively scout ${activeCrop} for early signs of mildew or spots.`);
  } else if (fungalRisk === 'Moderate') {
    monitorActions.push(`Monitor ${activeCrop} for fungal symptoms due to high humidity.`);
  }

  // Wind Logic
  if (windRisk === 'High') {
    avoidActions.push('Strictly avoid chemical spraying (high risk of spray drift).');
    monitorActions.push('Check tall crops or weak structures for wind damage.');
  } else if (windRisk === 'Moderate') {
    avoidActions.push('Be cautious with spraying (moderate drift risk).');
  }

  // Generic fallback if no specific risks
  if (overallRisk === 'Low' && todayActions.length === 1 && hasCropInfo) {
    todayActions.push(`Excellent conditions for routine ${activeCrop} field operations.`);
  }

  // Append safe disclaimer for chemical use if mentioned
  const mentionsSpraying = [...todayActions, ...avoidActions].some(a => a.toLowerCase().includes('spray') || a.toLowerCase().includes('chemical') || a.toLowerCase().includes('pesticide') || a.toLowerCase().includes('fungicide'));
  if (mentionsSpraying) {
    monitorActions.push('Check product label and local agricultural guidance before any chemical application.');
  }

  if (!hasCropInfo) {
    monitorActions.push('Select your crop to get crop-specific weather advice.');
  } else if (!hasStageInfo) {
    monitorActions.push('Select your crop growth stage for more accurate advice.');
  }

  // 4. Seven-Day Farm Plan Generation
  const sevenDayAdvice = [];
  if (Array.isArray(forecast7Day) && forecast7Day.length > 0) {
    forecast7Day.forEach(day => {
      const maxT = parseFloat(day.high) || (day.temp ? parseFloat(day.temp) : 0) || 32;
      const dailyRainProb = parseFloat(day.rainProbability) || (day.rain ? parseFloat(day.rain) : 0) || (day.isRainy ? 80 : 10);
      
      let dailyImpact = 'Low';
      let dailyAction = `Standard ${activeCrop} maintenance`;
      
      if (dailyRainProb > 60) {
        dailyImpact = 'High';
        dailyAction = 'Avoid irrigation & spraying; check drainage';
      } else if (maxT > 38) {
        dailyImpact = 'High';
        dailyAction = 'Monitor for heat stress; irrigate if needed';
      } else if (dailyRainProb > 30) {
        dailyImpact = 'Moderate';
        dailyAction = 'Monitor weather before field operations';
      } else if (maxT > 34) {
        dailyImpact = 'Moderate';
        dailyAction = 'Check soil moisture';
      } else {
        dailyImpact = 'Low';
        dailyAction = 'Favorable for all field activities';
      }

      sevenDayAdvice.push({
        date: day.date || day.day, // 'Monday', '2024-05-12' etc.
        condition: day.condition,
        temperature: day.temp || (day.high != null ? `${day.high}° / ${day.low || day.high - 8}°` : '34° / 24°'),
        rainProbability: dailyRainProb,
        impact: dailyImpact,
        action: dailyAction,
        isRainy: day.isRainy,
        icon: day.icon // Persist UI icon ref if provided
      });
    });
  }

  return {
    isCropSpecific: hasCropInfo,
    crop: activeCrop,
    growthStage: stage,
    risk: {
      overall: overallRisk,
      rain: rainRisk,
      heat: heatRisk,
      fungal: fungalRisk,
      wind: windRisk,
    },
    impact: cropImpact,
    advice: {
      do: todayActions,
      avoid: avoidActions,
      monitor: monitorActions
    },
    plan7Day: sevenDayAdvice
  };
};
