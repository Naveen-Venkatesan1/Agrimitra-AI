import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, profileApi, weatherApi, notificationApi } from '../services/api';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { generateFarmIntelligence } from '../services/farmIntelligence';
import { initSensorAlertListener, configureSensorAlertService } from '../services/sensorAlertService';
import { getTranslation } from '../i18n';

let weatherAbortController = null;

export const useAppStore = create(
  persist(
    (set, get) => ({
  // Authentication & User Profile State
  isAuthenticated: typeof window !== 'undefined' ? Boolean(localStorage.getItem('agrimitra_session')) : false,
  authLoading: true,
  user: typeof window !== 'undefined' && localStorage.getItem('agrimitra_user_profile') ? JSON.parse(localStorage.getItem('agrimitra_user_profile') || 'null') : null,
  languageCode: typeof window !== 'undefined' ? (localStorage.getItem('agrimitra_language') || 'en') : 'en',
  setLanguageCode: (code) => {
    const validCode = ['ta', 'en', 'te', 'ml', 'hi'].includes(code) ? code : 'en';
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrimitra_language', validCode);
    }
    set((state) => ({
      languageCode: validCode,
      user: state.user ? { ...state.user, languageCode: validCode } : state.user
    }));
  },
  loading: false,
  error: null,
  latestDiagnosis: null,
  setLatestDiagnosis: (diagnosis) => set({ latestDiagnosis: diagnosis }),
  
  // Real-time Agro Monitoring Sensor Readings State
  sensorData: {
    temperature: null,
    humidity: null,
    distance_cm: null,
    ir_detected: null,
    soil_moisture_percent: null,
    timestamp: null
  },
  isSensorLiveConnected: false,
  setSensorData: (data, isConnected = true) => set({
    sensorData: data || {
      temperature: null,
      humidity: null,
      distance_cm: null,
      ir_detected: null,
      soil_moisture_percent: null,
      timestamp: null
    },
    isSensorLiveConnected: Boolean(isConnected)
  }),
  
  selectedState: 'Tamil Nadu',
  selectedDistrict: 'Thanjavur',
  selectedGraph: 'Rainfall Trend',
  farmBoundary: null,

  setSelectedState: (state) => {
    if (!state) return;
    const validDistricts = INDIA_LOCATIONS[state] || [];
    const currentDistrict = get().selectedDistrict;
    const newDistrict = validDistricts.includes(currentDistrict) ? currentDistrict : (validDistricts[0] || '');
    
    set((s) => ({
      selectedState: state,
      selectedDistrict: newDistrict,
      farmBoundary: null,
      user: s.user ? { ...s.user, state, district: newDistrict } : s.user
    }));

    get().fetchLiveWeather(newDistrict, state, get().user?.primaryCrop || 'Paddy');
  },

  setSelectedDistrict: (district) => {
    if (!district) return;
    set((s) => ({
      selectedDistrict: district,
      farmBoundary: null,
      user: s.user ? { ...s.user, district } : s.user
    }));

    get().fetchLiveWeather(district, get().selectedState, get().user?.primaryCrop || 'Paddy');
  },

  setSelectedGraph: (graph) => {
    if (!graph) return;
    set({ selectedGraph: graph });
  },

  setFarmBoundary: (boundary) => {
    set({ 
      farmBoundary: boundary
    });
  },

  setGlobalSelection: (state, district, graph) => {
    const currentState = state || get().selectedState;
    const validDistricts = INDIA_LOCATIONS[currentState] || [];
    const rawDistrict = district || get().selectedDistrict;
    const currentDistrict = validDistricts.includes(rawDistrict) ? rawDistrict : (validDistricts[0] || '');
    const currentGraph = graph || get().selectedGraph;
    
    set((s) => ({
      selectedState: currentState,
      selectedDistrict: currentDistrict,
      selectedGraph: currentGraph,
      user: s.user ? { ...s.user, state: currentState, district: currentDistrict } : s.user
    }));

    get().fetchLiveWeather(currentDistrict, currentState, get().user?.primaryCrop || 'Paddy');
  },

  setLatestDiagnosis: (diag) => set({ latestDiagnosis: diag }),

  clearCropIntelligenceSession: async () => {
    const uid = get().user?.id;
    const key = uid ? `${uid}_latest_leaf_image` : 'guest_latest_leaf_image';
    try {
      const { clearImageFromLocal } = await import('../utils/imageStore');
      if (clearImageFromLocal) {
        await clearImageFromLocal(key);
      }
    } catch (e) {
      console.warn('Image clear error:', e);
    }
    set({ latestDiagnosis: null });
  },

  restoreLatestDiagnosisImage: async () => {
    const diag = get().latestDiagnosis;
    if (!diag) return;
    const uid = get().user?.id;
    const key = uid ? `${uid}_latest_leaf_image` : 'guest_latest_leaf_image';
    try {
      const { getImageFromLocal } = await import('../utils/imageStore');
      const blob = await getImageFromLocal(key);
      if (blob) {
        const url = URL.createObjectURL(blob);
        set({
          latestDiagnosis: {
            ...diag,
            image: url,
            imageUrl: url
          }
        });
      }
    } catch (e) {
      console.warn('Failed to restore latest diagnosis image:', e);
    }
  },

  setLanguageCode: async (code) => {
    if (!code) return;
    try {
      localStorage.setItem('agrimitra_language', code);
    } catch (e) {}
    
    set((state) => ({
      languageCode: code,
      user: state.user ? { ...state.user, languageCode: code } : state.user
    }));

    const user = get().user;
    if (user?.id) {
      await profileApi.updateProfile(user.id, { languageCode: code });
    }
  },

  _profileUnsubscribe: null,

  initAuthListener: () => {
    // Initial restoration from localStorage to prevent flash on reload
    const cachedSession = localStorage.getItem('agrimitra_session');
    if (cachedSession) {
      const cachedProfile = localStorage.getItem('agrimitra_user_profile');
      let userData = null;
      try {
        userData = cachedProfile ? JSON.parse(cachedProfile) : null;
      } catch (e) {}
      set({ 
        isAuthenticated: true, 
        user: userData,
        selectedState: userData?.state || get().selectedState,
        selectedDistrict: userData?.district || get().selectedDistrict
      });
    } else {
      set({ isAuthenticated: false, user: null });
    }

    let isFirstLoad = true;
    authApi.onSessionChange(async (firebaseUser) => {
      const currentUnsubscribe = get()._profileUnsubscribe;
      if (currentUnsubscribe) {
        currentUnsubscribe();
        set({ _profileUnsubscribe: null });
      }

      if (firebaseUser) {
        // Fetch profile before releasing router to guarantee onboardingCompleted is known
        const res = await profileApi.getProfile(firebaseUser.uid).catch(() => ({ profile: null }));
        const profileData = (res && res.profile) || {};

        set({ isAuthenticated: true, authLoading: false });
        localStorage.setItem('agrimitra_session', 'active');
        
        const baseUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL || null,
          state: get().selectedState,
          district: get().selectedDistrict
        };
        
        set((state) => {
          const sameUser = state.user?.id === firebaseUser.uid ? state.user : {};
          const merged = { ...sameUser, ...baseUser, ...profileData };
          localStorage.setItem('agrimitra_user_profile', JSON.stringify(merged));
          return { user: merged };
        });
        
        get().restoreLatestDiagnosisImage();
        
        const unsubscribe = profileApi.subscribeToProfile(firebaseUser.uid, (liveData) => {
          if (liveData) {
            set((state) => {
              const updatedUser = { 
                ...state.user, 
                ...liveData, 
                name: liveData.name || baseUser.name || 'User', 
                avatar: liveData.avatar || baseUser.avatar,
                state: liveData.state || state.selectedState,
                district: liveData.district || state.selectedDistrict
              };
              localStorage.setItem('agrimitra_user_profile', JSON.stringify(updatedUser));
              return { 
                user: updatedUser,
                selectedState: liveData.state || state.selectedState,
                selectedDistrict: liveData.district || state.selectedDistrict
              };
            });
          }
        });
        
        set({ _profileUnsubscribe: unsubscribe });
      } else {
        const cached = localStorage.getItem('agrimitra_session');
        if (!cached) {
          set({ isAuthenticated: false, user: null });
        }
      }

      if (isFirstLoad) {
        isFirstLoad = false;
        set({ authLoading: false });
      }
    });

    notificationApi.subscribeNotifications(null, (notifications) => {
      set({ alerts: notifications });
    });

    // Configure and start real-time Firestore listener for Agro Monitoring sensor alerts
    configureSensorAlertService({
      addAlert: (alert) => get().addAlert(alert),
      getLanguage: () => get().languageCode || get().user?.languageCode || 'en',
      getTranslation: (lang, key, fallback) => getTranslation(lang, key, fallback),
      setSensorData: (data, connected) => set({ sensorData: data, isSensorLiveConnected: connected })
    });
    initSensorAlertListener();
  },

  setAuth: (isAuth, userData = null) => {
    if (isAuth && userData) {
      localStorage.setItem('agrimitra_session', 'active');
      set((state) => {
        const updatedUser = userData ? { ...userData } : state.user;
        localStorage.setItem('agrimitra_user_profile', JSON.stringify(updatedUser));
        return {
          isAuthenticated: true,
          user: updatedUser,
          selectedState: updatedUser?.state || state.selectedState,
          selectedDistrict: updatedUser?.district || state.selectedDistrict,
          authLoading: false
        };
      });
    } else {
      localStorage.removeItem('agrimitra_session');
      localStorage.removeItem('agrimitra_user_profile');
      set({
        isAuthenticated: false,
        user: null,
        authLoading: false
      });
    }
  },

  updateUserProfile: async (profileData) => {
    set({ loading: true, error: null });
    const user = get().user;
    const uid = user?.id || null;

    const res = await profileApi.updateProfile(uid, profileData);
    if (res.success) {
      set((state) => {
        const updated = { ...state.user, ...profileData, ...res.profile };
        localStorage.setItem('agrimitra_user_profile', JSON.stringify(updated));
        return {
          user: updated,
          selectedState: updated.state || state.selectedState,
          selectedDistrict: updated.district || state.selectedDistrict,
          loading: false
        };
      });
      await get().updateSmartContext(profileData);
    } else {
      set({ error: res.error, loading: false });
    }
  },

  logoutAppStore: async () => {
    try {
      const currentUnsubscribe = get()._profileUnsubscribe;
      if (currentUnsubscribe) {
        currentUnsubscribe();
        set({ _profileUnsubscribe: null });
      }
      const uid = get().user?.id;
      try {
        const { clearImageFromLocal } = await import('../utils/imageStore');
        if (uid) {
          await clearImageFromLocal(`${uid}_latest_leaf_image`);
        }
        await clearImageFromLocal('guest_latest_leaf_image');
      } catch (e) {
        console.warn('Failed to clear diagnosis images on logout:', e);
      }
      try {
        await authApi.logout();
      } catch (e) {
        console.warn('Firebase logout warning:', e);
      }
    } finally {
      try {
        localStorage.removeItem('agrimitra_session');
        localStorage.removeItem('agrimitra_user_profile');
        localStorage.removeItem('agrimitra-global-storage');
      } catch (e) {}
      set({ isAuthenticated: false, user: null, latestDiagnosis: null });
    }
  },

  alerts: [
    {
      id: 'alert-1',
      title: 'Moderate rain expected tomorrow',
      message: '75% rain probability in district. Consider pausing irrigation.',
      type: 'Weather Alert',
      category: 'weather',
      time: '2h ago',
      unread: true,
      severity: 'warning'
    },
    {
      id: 'alert-2',
      title: 'Leaf blast detected in nearby farms',
      message: 'Detected leaf blast within 10 km. Inspect your paddy fields.',
      type: 'Disease Alert',
      category: 'disease',
      time: '5h ago',
      unread: true,
      severity: 'danger'
    }
  ],

  addAlert: async (alertData) => {
    const res = await notificationApi.addNotification(alertData, get().user?.uid || null);
    if (res.success) {
      const enrichedItem = {
        ...res.item,
        titleKey: alertData.titleKey,
        messageKey: alertData.messageKey,
        type: alertData.type || res.item.type,
        category: alertData.category || res.item.category,
        severity: alertData.severity || res.item.severity
      };
      set((state) => ({
        alerts: [enrichedItem, ...state.alerts]
      }));
    }
  },

  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => a.id === id ? { ...a, unread: false } : a)
  })),

  clearAllAlerts: () => set({ alerts: [] }),

  irrigation: {
    soilMoisture: 46,
    moistureStatus: 'Good',
    waterLevel: 68,
    pumpStatus: 'ON',
    mode: 'Auto',
    scheduledTime: '6:00 AM',
    autoPauseRain: true
  },

  togglePump: () => set((state) => {
    const newStatus = state.irrigation.pumpStatus === 'ON' ? 'OFF' : 'ON';
    const newAlert = {
      id: `alert-irrigation-${Date.now()}`,
      title: `Irrigation pump manually turned ${newStatus}`,
      message: `System status changed to ${newStatus}`,
      type: 'Irrigation Alert',
      category: 'irrigation',
      time: 'Just now',
      unread: true,
      severity: newStatus === 'ON' ? 'info' : 'warning'
    };
    return {
      irrigation: { ...state.irrigation, pumpStatus: newStatus },
      alerts: [newAlert, ...state.alerts]
    };
  }),

  setIrrigationMode: (mode) => set((state) => ({
    irrigation: { ...state.irrigation, mode }
  })),

  setIrrigationSchedule: (scheduledTime) => set((state) => ({
    irrigation: { ...state.irrigation, scheduledTime }
  })),

  weather: null,
  weatherError: null,
  weatherFetching: false,

  fetchLiveWeather: async (district, state, crop, cropStage) => {
    // Abort any ongoing request
    if (weatherAbortController) {
      weatherAbortController.abort();
    }
    weatherAbortController = new AbortController();
    const signal = weatherAbortController.signal;

    set({ loading: true, weatherFetching: true, weatherError: null });
    
    const dName = district || get().selectedDistrict || 'Thanjavur';
    const sName = state || get().selectedState || 'Tamil Nadu';
    const cName = crop || get().user?.primaryCrop || get().user?.crop || null;
    const stage = cropStage || get().user?.cropStage || null;
    
    try {
      const res = await weatherApi.fetchLiveWeather(dName, sName, cName, stage, signal);
      
      // If we aborted, ignore this response
      if (signal.aborted) return;
      
      if (!res.error && res.weather) {
        set({ weather: res.weather, loading: false, weatherFetching: false, weatherError: null });
      } else {
        set({ loading: false, weatherFetching: false, weatherError: res.error || "Failed to fetch weather" });
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      set({ loading: false, weatherFetching: false, weatherError: error.message || "Failed to fetch weather" });
    }
  },

  setWeather: (weatherData) => set((state) => ({
    weather: { ...state.weather, ...weatherData }
  })),

  getSmartContext: () => {
    const user = get().user;
    const weather = get().weather;
    
    const cropContext = {
      type: user?.primaryCrop || user?.crop || null,
      growthStage: user?.cropStage || null
    };

    const farmIntelligence = generateFarmIntelligence(weather, null, cropContext);

    const stateName = get().selectedState || 'Tamil Nadu';
    const districtName = get().selectedDistrict || 'Thanjavur';
    const graphName = get().selectedGraph || 'Rainfall Trend';
    const seasonName = user?.season || 'Kharif 2024';

    return {
      state: stateName,
      district: districtName,
      graph: graphName,
      crop: cropContext.type,
      cropStage: cropContext.growthStage,
      season: seasonName,
      language: user?.language || 'English',
      temp: weather?.temp ?? null,
      humidity: weather?.humidity ?? null,
      weatherCondition: weather?.condition ?? null,
      rainProbability: weather?.rainProbabilityTomorrow ?? null,
      rainfall: weather?.rainfall ?? null,
      windSpeed: weather?.windSpeed ?? null,
      farmRisk: weather?.intelligence?.risk || null,
      farmAdvice: weather?.intelligence?.advice || null,
      locationName: `${districtName}, ${stateName}, India`,
      userProfile: user,
      latestDiagnosis: get().latestDiagnosis,
      farmIntelligence: farmIntelligence
    };
  },

  updateSmartContext: async (updates) => {
    const currentUser = get().user || {};
    const updatedUser = { ...currentUser, ...updates };
    
    const newState = updates.state || get().selectedState;
    const validDistricts = INDIA_LOCATIONS[newState] || [];
    const rawDistrict = updates.district || get().selectedDistrict;
    const newDistrict = validDistricts.includes(rawDistrict) ? rawDistrict : (validDistricts[0] || '');
    const newGraph = updates.graph || get().selectedGraph;

    const isLocationChanged = (updates.state && updates.state !== get().selectedState) || 
                              (updates.district && updates.district !== get().selectedDistrict);

    set({ 
      user: updatedUser, 
      selectedState: newState, 
      selectedDistrict: newDistrict, 
      selectedGraph: newGraph,
      ...(isLocationChanged ? {
        farmBoundary: null
      } : {})
    });

    await get().fetchLiveWeather(newDistrict, newState, updatedUser.primaryCrop || 'Paddy');
  }
    }),
    {
      name: 'agrimitra-global-storage',
      partialize: (state) => ({ 
        languageCode: state.languageCode,
        user: state.user, 
        weather: state.weather, 
        irrigation: state.irrigation,
        latestDiagnosis: state.latestDiagnosis,
        selectedState: state.selectedState,
        selectedDistrict: state.selectedDistrict,
        selectedGraph: state.selectedGraph,
        farmBoundary: state.farmBoundary
      }),
    }
  )
);
