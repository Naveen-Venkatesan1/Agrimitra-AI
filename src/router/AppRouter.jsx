import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/Dashboard';

// Lazy-loaded secondary pages
const Signup = lazy(() => import('../pages/auth/Signup'));
const Onboarding = lazy(() => import('../pages/auth/Onboarding'));
const FinishSignUp = lazy(() => import('../pages/auth/FinishSignUp'));
const Profile = lazy(() => import('../pages/Profile'));
const Alerts = lazy(() => import('../pages/Alerts'));
const Settings = lazy(() => import('../pages/Settings'));
const CropIntelligence = lazy(() => import('../pages/crop-intelligence/CropIntelligence'));
const CropIntelligenceReport = lazy(() => import('../pages/crop-intelligence/CropIntelligenceReport'));
const CropDetection = lazy(() => import('../pages/crop-intelligence/CropDetection'));
const DiseaseDetection = lazy(() => import('../pages/crop-intelligence/DiseaseDetection'));
const HealthRiskScore = lazy(() => import('../pages/crop-intelligence/HealthRiskScore'));
import AIAssistant from '../pages/support/AIAssistant';
const SupportCenter = lazy(() => import('../pages/support/SupportCenter'));
const StateProblemSolving = lazy(() => import('../pages/support/StateProblemSolving'));
const AnalyticsHub = lazy(() => import('../pages/analytics/AnalyticsHub'));
const Weather = lazy(() => import('../pages/Weather'));
const SmartIrrigation = lazy(() => import('../pages/SmartIrrigation'));
const GovernmentSchemes = lazy(() => import('../pages/GovernmentSchemes'));
const MarketIntelligence = lazy(() => import('../pages/MarketIntelligence'));

import { useAppStore } from '../store/useAppStore';

const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold text-gray-500">Loading module...</span>
  </div>
);

const checkIsOnboarded = (user) => {
  if (!user) return false;
  return Boolean(
    user.onboardingCompleted === true ||
    user.primaryCrop ||
    (Array.isArray(user.crops) && user.crops.length > 0) ||
    (user.state && user.district)
  );
};

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
  if (user && !checkIsOnboarded(user)) {
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
    return <Navigate to={checkIsOnboarded(user) ? "/dashboard" : "/onboarding"} replace />;
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

  if (user && checkIsOnboarded(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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

            {/* Agro Monitoring Routes */}
            <Route path="/analytics" element={<AnalyticsHub />} />
            <Route path="/analytics/*" element={<AnalyticsHub />} />

            {/* Weather, Smart Irrigation & Government Schemes */}
            <Route path="/weather" element={<Weather />} />
            <Route path="/irrigation" element={<SmartIrrigation />} />
            <Route path="/government-schemes" element={<GovernmentSchemes />} />
            <Route path="/market-intelligence" element={<MarketIntelligence />} />

            {/* Core Modules */}

            <Route path="/profile" element={<Profile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
