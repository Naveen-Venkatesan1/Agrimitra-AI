import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import PlaceholderPage from '../pages/PlaceholderPage';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Onboarding from '../pages/auth/Onboarding';
import FinishSignUp from '../pages/auth/FinishSignUp';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import SatelliteMap from '../pages/SatelliteMap';
import Alerts from '../pages/Alerts';
import Settings from '../pages/Settings';
import CropIntelligence from '../pages/crop-intelligence/CropIntelligence';
import CropIntelligenceReport from '../pages/crop-intelligence/CropIntelligenceReport';
import CropDetection from '../pages/crop-intelligence/CropDetection';
import DiseaseDetection from '../pages/crop-intelligence/DiseaseDetection';
import HealthRiskScore from '../pages/crop-intelligence/HealthRiskScore';
import AIAssistant from '../pages/support/AIAssistant';
import SupportCenter from '../pages/support/SupportCenter';
import StateProblemSolving from '../pages/support/StateProblemSolving';
import AnalyticsHub from '../pages/analytics/AnalyticsHub';
import FinancialViability from '../pages/analytics/FinancialViability';
import CropWaterStress from '../pages/analytics/CropWaterStress';
import SoilNutrientMapping from '../pages/analytics/SoilNutrientMapping';
import Weather from '../pages/Weather';
import SmartIrrigation from '../pages/SmartIrrigation';
import GovernmentSchemes from '../pages/GovernmentSchemes';
import MarketIntelligence from '../pages/MarketIntelligence';

import { useAppStore } from '../store/useAppStore';

const ProtectedRoute = () => {
  const { isAuthenticated, authLoading, user } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-gray-500">Restoring farm session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force onboarding if incomplete
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppLayout />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, authLoading, user } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-gray-500">Restoring farm session...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.onboardingCompleted ? "/dashboard" : "/onboarding"} replace />;
  }

  return children;
};

const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, authLoading, user } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-gray-500">Restoring farm session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/finishSignUp" element={<PublicRoute><FinishSignUp /></PublicRoute>} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

        {/* Authenticated Protected Routes under Shared AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Crop Intelligence Routes */}
          <Route path="/crop-intelligence" element={<CropIntelligence />} />
          <Route path="/crop-intelligence/report" element={<CropIntelligenceReport />} />
          <Route path="/crop-intelligence/recommendation" element={<CropIntelligenceReport />} />
          <Route path="/crop-intelligence/detection" element={<CropDetection />} />
          <Route path="/crop-intelligence/disease" element={<DiseaseDetection />} />
          <Route path="/crop-intelligence/health-risk" element={<HealthRiskScore />} />

          {/* Support Layer Routes */}
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/support" element={<SupportCenter />} />
          <Route path="/support/state-problem-solving" element={<StateProblemSolving />} />

          {/* Analytical Hub Routes */}
          <Route path="/analytics" element={<AnalyticsHub />} />
          <Route path="/analytics/soil-nutrients" element={<SoilNutrientMapping />} />
          <Route path="/analytics/financial" element={<FinancialViability />} />
          <Route path="/analytics/satellite-map" element={<SatelliteMap />} />
          <Route path="/analytics/water-stress" element={<CropWaterStress />} />

          {/* Weather, Smart Irrigation & Government Schemes */}
          <Route path="/weather" element={<Weather />} />
          <Route path="/irrigation" element={<SmartIrrigation />} />
          <Route path="/government-schemes" element={<GovernmentSchemes />} />
          <Route path="/market-intelligence" element={<MarketIntelligence />} />

          {/* Core Modules */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/satellite-map" element={<Navigate to="/analytics/satellite-map" replace />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
