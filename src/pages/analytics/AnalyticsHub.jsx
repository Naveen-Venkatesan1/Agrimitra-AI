import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  RotateCw,
  Thermometer,
  Droplets,
  Radio,
  Box,
  Sprout,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { db, doc, onSnapshot, auth } from '../../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { formatAppDateTime, parseValidDate } from '../../utils/dateUtils';
import { evaluateSensorData } from '../../services/sensorAlertService';

const WaveBaseline = ({ color = "#22C55E" }) => (
  <div className="w-full overflow-hidden leading-none mt-2 -mb-1">
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-6">
      <path
        d="M0,0 C150,90 350,-40 500,40 C650,120 900,-20 1200,30 L1200,120 L0,120 Z"
        fill={`${color}15`}
      />
      <path
        d="M0,40 C150,90 350,0 500,50 C650,100 900,10 1200,45"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const AnalyticsHub = () => {
  const navigate = useNavigate();
  const { user, selectedDistrict, selectedState, alerts } = useAppStore();
  const { t } = useTranslation();

  // User-provided land text from store state
  const landText = user?.landText || user?.landSize || user?.farmName || (user?.district ? `${user.district} Farm` : null);

  // Pure live sensor state initialized without sample/hardcoded values
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    distance_cm: null,
    ir_detected: null,
    soil_moisture_percent: null,
    timestamp: null
  });

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    const initRealtimeListener = async () => {
      if (auth && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Firebase anonymous authentication notice:", e);
        }
      }

      try {
        if (db) {
          const sensorDocRef = doc(db, 'sensor_readings', 'latest');
          unsubscribe = onSnapshot(
            sensorDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const updateTime = parseValidDate(data.timestamp);

                setSensorData({
                  temperature: data.temperature ?? null,
                  humidity: data.humidity ?? null,
                  distance_cm: data.distance_cm ?? null,
                  ir_detected: data.ir_detected ?? null,
                  soil_moisture_percent: data.soil_moisture_percent ?? null,
                  timestamp: updateTime
                });
                setLastUpdatedTime(updateTime);
                setIsLiveConnected(true);

                // Real-time sensor alert evaluation
                evaluateSensorData(data);
              } else {
                setIsLiveConnected(false);
              }
            },
            (err) => {
              console.warn("Firestore live sensor subscription error:", err);
              setIsLiveConnected(false);
            }
          );
        }
      } catch (e) {
        console.warn("Firestore sensor listener init error:", e);
        setIsLiveConnected(false);
      }
    };

    initRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdatedTime(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const formattedDateTime = lastUpdatedTime ? formatAppDateTime(lastUpdatedTime) : null;

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans select-none pb-24 px-3 pt-1">
      {/* 1. Top Field Status Banner Card */}
      <div className="w-full bg-[#0D5C2E] text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
              <Leaf className="w-5.5 h-5.5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>{t('field_status_healthy', 'Field Status: Healthy')}</span>
                {landText && (
                  <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-md">
                    {landText}
                  </span>
                )}
              </h1>
              <p className="text-xs text-emerald-200 font-medium mt-0.5">
                {isLiveConnected ? t('all_systems_normal', 'All systems normal') : t('connecting_sensors', 'Connecting to live sensors...')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white text-[#0D5C2E] px-3 py-1 rounded-full text-[11px] font-bold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isLiveConnected ? t('status_live', 'Live') : t('status_connecting', 'Connecting')}</span>
          </div>
        </div>

        {/* Bottom Timestamp & Refresh Row */}
        <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
          <div>
            <div className="font-semibold text-emerald-200/90 text-[10px] uppercase tracking-wider">
              {t('last_update', 'Last Update')}
            </div>
            <div className="font-bold text-white text-[12px] mt-0.5">
              {formattedDateTime || t('awaiting_data', 'Awaiting Firestore update...')}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            aria-label="Refresh readings"
          >
            <RotateCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Section Heading */}
      <h2 className="text-[15px] font-extrabold text-gray-900 px-0.5 pt-1">
        {t('live_sensor_readings', 'Live Sensor Readings')}
      </h2>

      {/* 3. 2-Column Live Sensor Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Card 1: Temperature */}
        <div className="bg-[#F7FCF8] border border-emerald-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-3">
              <Thermometer className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('temperature_label', 'Temperature')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
              {sensorData.temperature != null ? sensorData.temperature : '--'}
              {sensorData.temperature != null && <span className="text-sm font-bold text-gray-600">°C</span>}
            </div>
            <div className="mt-2.5">
              <span className="inline-block bg-emerald-100/90 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {sensorData.temperature != null ? (sensorData.temperature > 35 ? t('status_high', 'High') : t('status_normal', 'Normal')) : t('awaiting_data', 'Awaiting Data')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#22C55E" />
        </div>

        {/* Card 2: Humidity */}
        <div className="bg-[#F0F7FF] border border-blue-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3">
              <Droplets className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('humidity_label', 'Humidity')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
              {sensorData.humidity != null ? sensorData.humidity : '--'}
              {sensorData.humidity != null && <span className="text-sm font-bold text-gray-600">%</span>}
            </div>
            <div className="mt-2.5">
              <span className="inline-block bg-emerald-100/90 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {sensorData.humidity != null ? t('status_normal', 'Normal') : t('awaiting_data', 'Awaiting Data')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#3B82F6" />
        </div>

        {/* Card 3: Distance */}
        <div className="bg-[#FFFBF2] border border-amber-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-amber-100/80 text-amber-600 flex items-center justify-center mb-3">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('proximity_range', 'Proximity Range')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
              {sensorData.distance_cm != null ? sensorData.distance_cm : '--'}
              {sensorData.distance_cm != null && <span className="text-sm font-bold text-gray-600">cm</span>}
            </div>
            <div className="mt-2.5">
              <span className="inline-block bg-emerald-100/90 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {sensorData.distance_cm != null ? t('status_clear', 'Field Clear') : t('awaiting_data', 'Awaiting Data')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#F59E0B" />
        </div>

        {/* Card 4: Object Detected */}
        <div className="bg-[#F0FDFA] border border-teal-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-teal-100/80 text-teal-600 flex items-center justify-center mb-3">
              <Box className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('status_detected', 'Object Detected')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {sensorData.ir_detected != null ? (sensorData.ir_detected ? 'True' : 'False') : '--'}
            </div>
            <div className="mt-2.5">
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  sensorData.ir_detected != null
                    ? sensorData.ir_detected
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100/90 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {sensorData.ir_detected != null
                  ? sensorData.ir_detected
                    ? t('status_detected', 'Object Detected')
                    : t('status_clear', 'Field Clear')
                  : t('awaiting_data', 'Awaiting Data')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#14B8A6" />
        </div>

        {/* Card 5: Soil Moisture */}
        <div className="bg-[#F7FCF8] border border-emerald-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-3">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('irrigation_soil_moisture_label', 'Soil Moisture')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
              {sensorData.soil_moisture_percent != null ? sensorData.soil_moisture_percent : '--'}
              {sensorData.soil_moisture_percent != null && <span className="text-sm font-bold text-gray-600">%</span>}
            </div>
            <div className="mt-2.5">
              <span className="inline-block bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {sensorData.soil_moisture_percent != null ? t('irrigation_soil_moderate', 'Moderate') : t('awaiting_data', 'Awaiting Data')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#22C55E" />
        </div>

        {/* Card 6: System Status */}
        <div className="bg-[#FAF5FF] border border-purple-100/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <div className="w-10 h-10 rounded-full bg-purple-100/80 text-purple-600 flex items-center justify-center mb-3">
              <Wifi className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-700">{t('system_status', 'System Status')}</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {isLiveConnected ? t('status_online', 'Online') : t('status_connecting', 'Connecting')}
            </div>
            <div className="mt-2.5">
              <span className="inline-block bg-emerald-100/90 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {isLiveConnected ? t('status_connected', 'Connected') : t('awaiting_data', 'Waiting...')}
              </span>
            </div>
          </div>
          <WaveBaseline color="#A855F7" />
        </div>
      </div>

      {/* 4. Bottom Alerts Card */}
      {(() => {
        const activeSensorAlert = alerts?.find(a => a.unread && (a.category === 'object' || a.category === 'fire' || a.type?.includes('Object') || a.type?.includes('Fire')));
        return (
          <button
            onClick={() => navigate('/alerts')}
            className={`w-full border rounded-2xl p-4 flex items-center justify-between shadow-xs active:scale-98 transition text-left cursor-pointer ${
              activeSensorAlert ? 'bg-red-50/80 border-red-200' : 'bg-[#FFFDF5] border-amber-100/90'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                activeSensorAlert ? 'bg-red-100 text-red-600' : 'bg-amber-100/80 text-amber-500'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${activeSensorAlert ? 'text-red-600 fill-red-500/20' : 'text-amber-500 fill-amber-500/20'}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{t('alerts_notifications', 'Alerts')}</h3>
                {activeSensorAlert ? (
                  <p className="text-xs text-red-600 flex items-center gap-1.5 mt-0.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="truncate max-w-[220px]">{t(activeSensorAlert.titleKey, activeSensorAlert.title)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t('no_active_alerts', 'No active alerts')}</span>
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        );
      })()}
    </div>
  );
};

export default AnalyticsHub;
