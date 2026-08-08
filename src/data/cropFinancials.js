export const CROP_FINANCIALS = {
  "Paddy (Rice)": {
    expectedYieldPerAcre: 18.5, // Quintals
    mspPerQuintal: 2183, // INR
    baselineCosts: { seed: 3000, fertilizer: 6500, irrigation: 2000, labor: 12000 }
  },
  "Wheat": {
    expectedYieldPerAcre: 15.0,
    mspPerQuintal: 2275,
    baselineCosts: { seed: 2500, fertilizer: 5500, irrigation: 1800, labor: 9500 }
  },
  "Maize (Corn)": {
    expectedYieldPerAcre: 22.0,
    mspPerQuintal: 2090,
    baselineCosts: { seed: 2200, fertilizer: 6000, irrigation: 1500, labor: 10000 }
  },
  "Cotton": {
    expectedYieldPerAcre: 8.5,
    mspPerQuintal: 6620,
    baselineCosts: { seed: 4000, fertilizer: 7000, irrigation: 2500, labor: 15000 }
  },
  "Groundnut": {
    expectedYieldPerAcre: 9.0,
    mspPerQuintal: 6377,
    baselineCosts: { seed: 5000, fertilizer: 4500, irrigation: 1200, labor: 11000 }
  },
  "Sugarcane": {
    expectedYieldPerAcre: 350.0,
    mspPerQuintal: 315,
    baselineCosts: { seed: 8000, fertilizer: 12000, irrigation: 4000, labor: 20000 }
  },
  "Tomato": {
    expectedYieldPerAcre: 120.0,
    mspPerQuintal: 1500, // Highly volatile, avg market rate
    baselineCosts: { seed: 6000, fertilizer: 15000, irrigation: 3000, labor: 25000 }
  },
  "Chilli": {
    expectedYieldPerAcre: 15.0, // Dry chilli
    mspPerQuintal: 18000, // Volatile
    baselineCosts: { seed: 5000, fertilizer: 10000, irrigation: 2500, labor: 22000 }
  },
  "Onion": {
    expectedYieldPerAcre: 85.0,
    mspPerQuintal: 2000,
    baselineCosts: { seed: 4000, fertilizer: 11000, irrigation: 2000, labor: 18000 }
  },
  "Potato": {
    expectedYieldPerAcre: 100.0,
    mspPerQuintal: 1400,
    baselineCosts: { seed: 15000, fertilizer: 12000, irrigation: 2500, labor: 14000 }
  }
};

export const getCropFinancials = (cropName) => {
  return CROP_FINANCIALS[cropName] || CROP_FINANCIALS["Paddy (Rice)"];
};
