# 🌱 AgriMitra AI (அக்ரிமித்ரா AI)

> AI-Powered Multilingual Smart Farming Assistant for Indian Farmers.

> **Track:** Smart Agriculture / Agriculture & Rural Development | **Project:** AgriMitra AI

AgriMitra AI is a multilingual AI-powered smart farming platform designed to help farmers **detect crop problems early, understand field conditions, make better irrigation decisions, access market intelligence, and communicate with an agricultural AI assistant in their own language.**

---

## 📌 Architecture Highlights

- **AI Farm Assistant:** Voice-first and text-based agricultural assistance powered by **Google Gemini**, with streaming responses and multilingual interaction.
- **Crop Intelligence:** AI-powered crop leaf and disease analysis using **Gemini Vision**, with treatment and recovery recommendations.
- **Smart Irrigation:** Weather- and crop-aware irrigation guidance with intelligent alerts.
- **Weather Intelligence:** Agricultural weather forecasting, location-based insights, and risk-aware recommendations using **Open-Meteo**.
- **Soil Intelligence:** Soil characterization and agricultural insights using **ISRIC SoilGrids**.
- **Market Intelligence:** Mandi, commodity, and agricultural market information using **Data.gov.in / AGMARKNET**.
- **Farmer Authentication:** Google, Email/Password, and Phone OTP authentication using **Firebase**.
- **Multilingual Experience:** English, Tamil, Hindi, Telugu, Malayalam, and Kannada.
- **Hardware-Ready Architecture:** Designed to support future **IoT / sensor-based field monitoring** such as soil moisture, temperature, humidity, and water-level sensing.

---

## 🧠 Core AI Workflow

```text
FaAgrimitra-AI/
│
├── api/                         # Vercel serverless functions
│   ├── crop.js
│   ├── gemini.js
│   └── market.js
│
├── backend/                     # FastAPI backend
│   ├── api/
│   │   ├── assistant/
│   │   ├── auth/
│   │   ├── crop_intelligence/
│   │   ├── market/
│   │   ├── notifications/
│   │   └── weather/
│   ├── models/
│   ├── data/
│   ├── requirements.txt
│   └── start_server.py
│
├── src/                         # React frontend
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── i18n/
│   ├── pages/
│   ├── services/
│   ├── store/
│   └── App.jsx
│
├── public/
├── package.json
├── vite.config.js
├── vercel.json
└── README.mdrmer
   ↓
AgriMitra AI Mobile/Web App
   ↓
Voice / Text / Image
   ↓
FastAPI Backend
   ↓
Google Gemini AI
   ↓
Agricultural Context
   ├── Crop Intelligence
   ├── Weather Intelligence
   ├── Soil Intelligence
   ├── Market Intelligence
   └── Irrigation Intelligence
   ↓
Farmer-Friendly Recommendation

Quick Start Guide
1. Clone Repository
git clone https://github.com/Naveen-Venkatesan1/Agrimitra-AI.git
cd Agrimitra-AI
2. Frontend Setup
npm install
npm run dev

Frontend:

http://localhost:5173
3. Backend Setup
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000

API Documentation:

http://127.0.0.1:8000/docs

------------------------------------------------------------------------------------------------------------------------------------------------------------------
Deployment
Frontend — Vercel
Framework: Vite
Root Directory: /
Build Command: npm run build
Install Command: npm install
Output Directory: dist
Backend — Render
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn api.main:app --host 0.0.0.0 --port $PORT

Architecture:

GitHub
 ├── Vercel → AgriMitra AI Frontend
 └── Render → FastAPI Backend
                  ↓
              Gemini / Firebase

