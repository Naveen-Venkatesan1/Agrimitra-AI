export const getMarketPrices = async ({ state = "Tamil Nadu", district = "Thanjavur", commodity = "Tomato" }) => {
  try {
    const response = await fetch(`/api/market?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&commodity=${encodeURIComponent(commodity)}`);
    if (!response.ok) {
      throw new Error(`Market API returned status ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      return { success: true, data: data.records };
    } else {
      throw new Error(data.error || "Unknown API error");
    }
  } catch (error) {
    console.warn("Market API proxy error, returning empty list:", error.message);
    // Since we can't fabricate data, we return an empty array or the error so the UI handles it honestly.
    return { success: false, error: error.message, data: [] };
  }
};
