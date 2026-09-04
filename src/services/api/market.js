const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const getStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/stats`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching overview stats:", error);
    return null;
  }
};

export const getCommodities = async ({ state = '', district = '', market = '' } = {}) => {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (market) params.append('market', market);
    
    const response = await fetch(`${API_BASE_URL}/api/market/commodities?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching commodities:", error);
    return [];
  }
};

export const getStates = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/states`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching states:", error);
    return [];
  }
};

export const getDistricts = async (state = '') => {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    
    const response = await fetch(`${API_BASE_URL}/api/market/districts?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching districts for ${state}:`, error);
    return [];
  }
};

export const getMarkets = async (state = '', district = '') => {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    
    const response = await fetch(`${API_BASE_URL}/api/market/markets?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching markets for ${state}, ${district}:`, error);
    return [];
  }
};

export const getVarieties = async ({ commodity = '', state = '', district = '', market = '' } = {}) => {
  try {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (market) params.append('market', market);
    
    const response = await fetch(`${API_BASE_URL}/api/market/varieties?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching varieties:", error);
    return [];
  }
};

export const getGrades = async ({ commodity = '', state = '', district = '', market = '' } = {}) => {
  try {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (market) params.append('market', market);
    
    const response = await fetch(`${API_BASE_URL}/api/market/grades?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching grades:", error);
    return [];
  }
};

export const getMarketPrices = async ({ 
  state = '', 
  district = '', 
  market = '', 
  commodity = '', 
  date = '', 
  variety = '', 
  grade = '', 
  page = 1, 
  limit = 50 
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (market) params.append('market', market);
    if (commodity) params.append('commodity', commodity);
    if (date) params.append('date', date);
    if (variety) params.append('variety', variety);
    if (grade) params.append('grade', grade);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/api/market/prices?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Market API returned status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching market prices:", error);
    return { 
      success: false, 
      error: error.message, 
      data: { records: [], total: 0, page: 1, limit: 50, total_pages: 0 } 
    };
  }
};

export const getMarketSummary = async ({ commodity = '', state = '', district = '' } = {}) => {
  try {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (district) params.append('district', district);

    const response = await fetch(`${API_BASE_URL}/api/market/summary?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Summary API returned status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching market summary:", error);
    return { success: false, error: error.message };
  }
};

export const syncMarketPrices = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/sync`, {
      method: "POST"
    });
    const data = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: data.detail?.message || "Failed to update prices.",
        timestamp: data.detail?.timestamp || "N/A"
      };
    }
    return { success: true, message: data.message, timestamp: data.timestamp };
  } catch (error) {
    console.error("Error syncing market prices:", error);
    return { success: false, error: "Official price source is temporarily unavailable. Showing the latest verified data." };
  }
};
