export default async function handler(req, res) {
  const { state, district, commodity } = req.query;
  const token = process.env.DATAGOV_API_KEY;

  if (!token) {
    return res.status(500).json({ error: "Missing API Key for Market Data" });
  }

  // Data.gov.in API format for Mandi prices
  // https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
  const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${token}&format=json&limit=10&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[commodity]=${encodeURIComponent(commodity)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Map records to a cleaner format
    const records = (data.records || []).map(r => ({
      state: r.state,
      district: r.district,
      market: r.market,
      commodity: r.commodity,
      variety: r.variety,
      arrival_date: r.arrival_date,
      min_price: r.min_price,
      max_price: r.max_price,
      modal_price: r.modal_price
    }));

    res.status(200).json({ success: true, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
