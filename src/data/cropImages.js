// src/data/cropImages.js

// High-quality, verified Unsplash source URLs for various crops.
// We use descriptive keywords and proper sizing parameters to ensure premium, consistent imagery.

const BASE_URL = "https://images.unsplash.com/photo-";
const PARAMS = "?q=80&w=800&auto=format&fit=crop";

export const CROP_IMAGE_MAP = {
  // Cereals
  "paddy(dhan)(common)": `${BASE_URL}1586227740502-99e5760829a4${PARAMS}`, // Paddy field
  "paddy": `${BASE_URL}1586227740502-99e5760829a4${PARAMS}`,
  "rice": `${BASE_URL}1586227740502-99e5760829a4${PARAMS}`,
  "wheat": `${BASE_URL}1574323347407-f5e1ad6d475b${PARAMS}`,
  "maize": `${BASE_URL}1595800539126-7243b811de25${PARAMS}`,
  "corn": `${BASE_URL}1595800539126-7243b811de25${PARAMS}`,
  
  // Vegetables
  "tomato": `${BASE_URL}1592841200221-a4bb895655a1${PARAMS}`,
  "onion": `${BASE_URL}1618512496248-a07ce5463f82${PARAMS}`,
  "potato": `${BASE_URL}1518977676601-b7fc496419ca${PARAMS}`,
  "carrot": `${BASE_URL}1598170845058-327c5950e976${PARAMS}`,
  "beetroot": `${BASE_URL}1590159496410-b99b50dbba07${PARAMS}`,
  "cabbage": `${BASE_URL}1595314777553-619623e1f2cc${PARAMS}`,
  "cauliflower": `${BASE_URL}1568019445831-28956d406456${PARAMS}`,
  "brinjal": `${BASE_URL}1602958742296-6d5f74577883${PARAMS}`,
  "eggplant": `${BASE_URL}1602958742296-6d5f74577883${PARAMS}`,
  "garlic": `${BASE_URL}1582260655866-e8cf48c3b77f${PARAMS}`,
  "ginger": `${BASE_URL}1595166291666-4c748c03504a${PARAMS}`,
  "chilli": `${BASE_URL}1588198751532-6a45ef9d5f75${PARAMS}`,
  "green chilli": `${BASE_URL}1588198751532-6a45ef9d5f75${PARAMS}`,
  "red chilli": `${BASE_URL}1598514981141-9bf544ef91a5${PARAMS}`,
  
  // Fruits
  "apple": `${BASE_URL}1567306305608-2c7c59b72d23${PARAMS}`,
  "banana": `${BASE_URL}1528825871115-3581a5387919${PARAMS}`,
  "mango": `${BASE_URL}1553279168-bc7af713f8c8${PARAMS}`,
  "coconut": `${BASE_URL}1526487140838-8c1d533fa122${PARAMS}`,
  "orange": `${BASE_URL}1550258859-5645391d9047${PARAMS}`,
  "grapes": `${BASE_URL}1596365313881-22e70e9a4056${PARAMS}`,
  "pomegranate": `${BASE_URL}1583095368305-64f3ce2379bd${PARAMS}`,
  
  // Cash Crops
  "sugarcane": `${BASE_URL}1562917730-a8ec6e8c8941${PARAMS}`,
  "cotton": `${BASE_URL}1591873117469-8fcbd3cecfce${PARAMS}`,
  "groundnut": `${BASE_URL}1625904581971-ce92186716bc${PARAMS}`,
  "peanut": `${BASE_URL}1625904581971-ce92186716bc${PARAMS}`,
  
  // Spices / Other
  "turmeric": `${BASE_URL}1615486511484-92e02b5c0108${PARAMS}`,
  "mustard": `${BASE_URL}1622384950074-b903e06385ed${PARAMS}`,
  
  // Fallbacks
  "vegetable_fallback": `${BASE_URL}1592417817098-8fd3d9eb14a5${PARAMS}`,
  "fruit_fallback": `${BASE_URL}1610832958506-aa56368176cf${PARAMS}`,
  "pulse_fallback": `${BASE_URL}1515549832467-8783363e19b6${PARAMS}`,
  "general_fallback": `${BASE_URL}1596199050105-6d5d32222916${PARAMS}`
};

export const getCropImage = (cropName) => {
  if (!cropName) return { url: CROP_IMAGE_MAP.general_fallback, isFallback: true };
  
  const normalized = cropName.toLowerCase().trim();
  
  // Exact match
  if (CROP_IMAGE_MAP[normalized]) {
    return { url: CROP_IMAGE_MAP[normalized], isFallback: false };
  }
  
  // Partial matches
  for (const [key, url] of Object.entries(CROP_IMAGE_MAP)) {
    if (normalized.includes(key) && !key.includes('fallback')) {
      return { url, isFallback: false };
    }
  }
  
  // Category fallbacks based on common crop names
  if (normalized.match(/(apple|banana|mango|orange|grape|fruit|melon|berry)/)) return { url: CROP_IMAGE_MAP.fruit_fallback, isFallback: true };
  if (normalized.match(/(tomato|onion|potato|carrot|cabbage|brinjal|gourd|bean|vegetable)/)) return { url: CROP_IMAGE_MAP.vegetable_fallback, isFallback: true };
  if (normalized.match(/(gram|dal|pulse|pea|bean)/)) return { url: CROP_IMAGE_MAP.pulse_fallback, isFallback: true };
  
  return { url: CROP_IMAGE_MAP.general_fallback, isFallback: true };
};
