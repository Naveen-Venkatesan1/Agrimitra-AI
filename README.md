# Agrimitra AI

Agrimitra AI is an advanced, intelligent agricultural assistant platform designed for farmers in India. It provides real-time crop intelligence, satellite telemetry, disease diagnosis, weather forecasting, financial viability analytics, and smart irrigation recommendations.

## Features
- **Crop Intelligence:** Machine Learning models for disease prediction and crop health analysis.
- **Satellite Telemetry:** AgroMonitoring integration for NDVI, NDWI, and Field Air Quality.
- **Financial Analytics:** Live Mandi prices, crop yield statistics, and production viability modeling.
- **Smart Irrigation:** Soil moisture analysis and weather-responsive pump control simulations.
- **Government Schemes:** AI-matched eligibility engine for PM-KISAN, PMFBY, and more.
- **AI Assistant:** Context-aware multilingual chatbot powered by Google Gemini 1.5.

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand, React Router v6
- **Backend/API:** Vercel Serverless Functions (Node.js)
- **Database/Auth:** Firebase (Authentication, Firestore, Storage)
- **APIs:** Google Gemini, AgroMonitoring Sentinel Hub, Data.gov.in, Open-Meteo

---

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd agrimitra-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Setup
Agrimitra AI uses secure serverless API proxies to protect sensitive keys from the browser. 

Create a `.env.local` file in the root directory and copy the format from `.env.example`.


**Required Public Frontend Configuration:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

*(Do NOT commit your `.env.local` file to GitHub. It is safely ignored via `.gitignore`.)*

### 4. Local Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🛠️ Production Build

To build the project for production, run:
```bash
npm run build
```
This command compiles the React application via Vite and outputs the static assets into the `/dist` directory.

---

## ☁️ Vercel Deployment

Agrimitra AI is optimized for deployment on Vercel. 

1. Push your code to GitHub.
2. Go to your Vercel Dashboard and click **"Add New Project"**.
3. Import your GitHub repository.
4. **Framework Preset:** Vercel should automatically detect **Vite**.
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Environment Variables:** 
   In the Vercel deployment settings, expand the "Environment Variables" tab and add **ALL** the keys listed in your `.env.example` file.
   > ⚠️ **IMPORTANT:** Your Vercel Serverless Functions (`/api/*`) require `GEMINI_API_KEY`, `TELEMETRY_API_KEY`, and `DATAGOV_API_KEY` to function in production. Make sure these are added exactly as spelled.

8. Click **Deploy**.

## Security Notice
Secret API keys are processed securely via Vercel Serverless Functions located in the `/api` directory. They are never exposed to the client-side browser bundle. Firebase variables starting with `VITE_` are public configuration variables and are safe to expose (ensure your Firebase Security Rules are properly configured).
