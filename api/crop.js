export default async function handler(req, res) {
  const { action, ...params } = req.query;
  const apiKey = process.env.DATAGOV_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing API Key" });
  }

  const endpoints = {
    mandi: "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
    production: "https://api.data.gov.in/resource/354b84f8-952c-473d-8e43-ef88390b1419",
    principal: "https://api.data.gov.in/resource/e16c75b6-7ee6-4ade-8e1f-2cd3043ff4c9",
    stock: "https://api.data.gov.in/resource/71a6e7c1-840a-4b96-b3de-85b42d76de9f",
    fertilizer: "https://api.data.gov.in/resource/e35f49b1-5e26-4e56-9d32-2d04a6b2c8a7"
  };

  const baseUrl = endpoints[action];
  if (!baseUrl) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const url = new URL(baseUrl);
  url.searchParams.append("api-key", apiKey);
  url.searchParams.append("format", "json");
  url.searchParams.append("limit", params.limit || "15");
  
  if (params.state) url.searchParams.append("filters[state]", params.state);
  if (params.state_name) url.searchParams.append("filters[state_name]", params.state_name);
  if (params.crop) url.searchParams.append("filters[crop]", params.crop);
  if (params.commodity) url.searchParams.append("filters[commodity]", params.commodity);
  if (params.district) url.searchParams.append("filters[district]", params.district);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
