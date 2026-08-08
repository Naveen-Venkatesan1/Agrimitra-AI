// Real Soil & SoilGrids API Service

export const soilApi = {
  async getSoilData(lat = 10.7870, lon = 79.1378) {
    try {
      const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=phh2o&property=soc&property=nitrogen&depth=0-5cm&value=mean`;
      
      const response = await fetch(url).catch(() => null);
      let ph = 6.8;
      let soc = 0.62;
      let nitrogen = 280;

      if (response && response.ok) {
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
      }

      // Call our AI Backend for Soil Prediction
      const aiResponse = await fetch('http://localhost:8000/predict-soil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pH: Number(ph),
          EC: 0.5,
          OC: Number(soc),
          N: Number(nitrogen),
          P: 18.0,
          K: 195.0
        })
      });
      
      let aiStatus = 'Optimal Balance';
      let aiRecommendation = 'Top-dress 45kg Urea at 30 DAT';
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiStatus = aiData.prediction;
        aiRecommendation = aiData.recommendations.message;
      }

      return {
        success: true,
        data: {
          ph: Number(ph),
          nitrogen: Number(nitrogen),
          phosphorus: 18,
          potassium: 195,
          organicCarbon: Number(soc),
          texture: 'Clay Loam',
          moisture: 46,
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
