export default async function handler(req, res) {
  const { location, index } = req.query;
  const token = process.env.TELEMETRY_API_KEY;

  if (!token) {
    return res.status(500).json({ error: "Missing API Key" });
  }

  const AGROMONITORING_NDVI_URL = "https://api.agromonitoring.com/agro/1.0/image/search";
  const url = `${AGROMONITORING_NDVI_URL}?token=${token}&location=${encodeURIComponent(location)}&index=${encodeURIComponent(index)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
