// Real Soil & SoilGrids API Service

export const soilApi = {
  async getSoilData(lat = 10.7870, lon = 79.1378) {
    try {
      const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=phh2o&property=soc&property=nitrogen&depth=0-5cm&value=mean`;
      
      const response = await fetch(url).catch(() => null);
      let ph = null;
      let soc = null;
      let nitrogen = null;

      if (!response || !response.ok) {
        return { success: false, error: "SoilGrids API unavailable" };
      }

      const json = await response.json();
      const layers = json.properties?.layers || [];
      
      const phLayer = layers.find(l => l.name === 'phh2o');
      if (phLayer?.depths?.[0]?.values?.mean) {
        ph = (phLayer.depths[0].values.mean / 10).toFixed(1);
      }

      const socLayer = layers.find(l => l.name === 'soc');
      if (socLayer?.depths?.[0]?.values?.mean) {
        soc = (socLayer.depths[0].values.mean / 100).toFixed(2);
      }

      const nLayer = layers.find(l => l.name === 'nitrogen');
      if (nLayer?.depths?.[0]?.values?.mean) {
        nitrogen = Math.round(nLayer.depths[0].values.mean / 10);
      }

      if (ph === null || soc === null || nitrogen === null) {
          return { success: false, error: "Incomplete soil data from provider" };
      }

      // Call our AI Backend for Soil Prediction
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const aiResponse = await fetch(`${API_BASE_URL}/api/predict-soil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pH: Number(ph),
          EC: null,
          OC: Number(soc),
          N: Number(nitrogen),
          P: null,
          K: null
        })
      }).catch(() => null);
      
      let aiStatus = null;
      let aiRecommendation = null;
      
      if (aiResponse && aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiStatus = aiData.prediction || null;
        aiRecommendation = aiData.recommendations?.message || null;
      }

      return {
        success: true,
        data: {
          ph: Number(ph),
          nitrogen: Number(nitrogen),
          phosphorus: null,
          potassium: null,
          organicCarbon: Number(soc),
          texture: null,
          moisture: null,
          status: aiStatus,
          recommendation: aiRecommendation
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
};
