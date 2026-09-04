/**
 * Farm Intelligence Engine
 * Correlates Weather, Satellite, and Crop contexts into safe, evidence-based agricultural signals.
 */

export const generateFarmIntelligence = (weatherContext, satelliteContext, cropContext) => {
  // 1. Initial State
  const farmStatus = {
    overallStatus: "normal",
    confidence: "weather_only",
    weather: weatherContext || null,
    satellite: {
      available: false,
      usable: false,
      status: "unavailable",
      cloudCover: null,
      acquisitionDate: null,
      ageDays: null,
      ndvi: null,
      ndwi: null
    },
    signals: [],
    limitations: []
  };

  if (!weatherContext) {
    farmStatus.limitations.push("Weather data unavailable. Intelligence is limited.");
  }

  let ageDays = null;

  // 2. Satellite Safety Gates
  if (satelliteContext && satelliteContext.available && satelliteContext.acquisitionDate) {
    farmStatus.satellite.available = true;
    farmStatus.satellite.cloudCover = satelliteContext.cloudCover;
    farmStatus.satellite.acquisitionDate = satelliteContext.acquisitionDate;
    
    // Calculate Age
    const ageMs = Date.now() - (satelliteContext.acquisitionDate * 1000);
    ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    farmStatus.satellite.ageDays = ageDays;

    // Cloud Gate
    if (satelliteContext.cloudCover > 50) {
      farmStatus.satellite.status = "cloud_obscured";
      farmStatus.limitations.push("Recent satellite imagery is obscured by clouds. Excluded from correlation.");
    } 
    // Freshness Gate
    else if (ageDays > 14) {
      farmStatus.satellite.status = "outdated";
      farmStatus.limitations.push("Satellite imagery is too old for acute correlation.");
    } 
    else {
      farmStatus.satellite.usable = true;
      farmStatus.satellite.status = "usable";
      farmStatus.satellite.ndvi = satelliteContext.ndvi;
      farmStatus.satellite.ndwi = satelliteContext.ndwi;
    }
  }

  // 3. Growth Stage Gate
  const hasCropStage = !!(cropContext && cropContext.growthStage);
  if (!hasCropStage) {
    farmStatus.limitations.push("Missing crop growth stage. Conservative interpretation applied.");
  }

  // 4. Confidence Evaluation
  if (farmStatus.satellite.usable && ageDays !== null && ageDays <= 4 && hasCropStage && weatherContext) {
    farmStatus.confidence = "moderate";
  } else if (farmStatus.satellite.usable && weatherContext) {
    farmStatus.confidence = "limited";
  } else if (weatherContext) {
    farmStatus.confidence = "weather_only";
  } else if (farmStatus.satellite.usable) {
    farmStatus.confidence = "satellite_only";
  } else {
    farmStatus.confidence = "insufficient_data";
  }

  // 5. Signal Generation (Correlations)
  const weatherRisk = weatherContext?.risk || {};
  
  if (farmStatus.satellite.usable && weatherContext) {
    
    // A. Moisture Stress Correlation
    if (weatherRisk.heat === 'High' && farmStatus.satellite.ndwi !== null && farmStatus.satellite.ndwi < 0.15) {
      farmStatus.signals.push({
        type: "moisture_stress",
        severity: "warning",
        message: "Weather and satellite data indicate possible moisture stress. Field inspection is recommended.",
        evidence: ["High weather heat risk", "Low satellite moisture index (NDWI)"]
      });
      farmStatus.overallStatus = "attention_needed";
    }

    // B. Rainfall / Surface Moisture Correlation
    if ((weatherRisk.rain === 'High' || (weatherContext.rainfall && weatherContext.rainfall > 10)) && farmStatus.satellite.ndwi !== null && farmStatus.satellite.ndwi > 0.3) {
      farmStatus.signals.push({
        type: "high_moisture",
        severity: "info",
        message: "Recent rainfall and satellite moisture indicators show increased surface/canopy moisture.",
        evidence: ["High rainfall/rain probability", "High satellite moisture index (NDWI)"]
      });
    }

    // C. Fungal / Disease Risk Correlation
    if (weatherRisk.fungal === 'High' && farmStatus.satellite.ndvi !== null && farmStatus.satellite.ndvi < 0.4) {
      farmStatus.signals.push({
        type: "disease_risk",
        severity: "warning",
        message: "Weather conditions may increase disease pressure, while the satellite image shows vegetation change. Field inspection is recommended.",
        evidence: ["High fungal weather conditions", "Low/declining vegetative health (NDVI)"]
      });
      farmStatus.overallStatus = "attention_needed";
    }
  }

  return farmStatus;
};
