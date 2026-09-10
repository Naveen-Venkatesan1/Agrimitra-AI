import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, profileApi, weatherApi, notificationApi } from '../services/api';
import { auth } from '../config/firebase';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { generateFarmIntelligence } from '../services/farmIntelligence';
import { initSensorAlertListener, configureSensorAlertService } from '../services/sensorAlertService';
import { getTranslation } from '../i18n';

let weatherAbortController = null;

const getSafeParsedProfile = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('agrimitra_user_profile');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const useAppStore = create(
  persist(
    (set, get) => ({
  // Authentication & User Profile State
  isAuthenticated: typeof window !== 'undefined' ? Boolean(localStorage.getItem('agrimitra_session')) : false,
  authLoading: true,
  user: getSafeParsedProfile(),
  languageCode: typeof window !== 'undefined' ? (localStorage.getItem('agrimitra_language') || 'en') : 'en',
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
    const supportedList = ['ta', 'en', 'te', 'ml', 'hi', 'kn', 'mr', 'gu', 'pa', 'bn', 'or', 'as', 'ur', 'kok'];
    const clean = String(code).trim().toLowerCase().split('-')[0];
    const validCode = supportedList.includes(clean) ? clean : (supportedList.includes(code) ? code : 'en');
    try {
      localStorage.setItem('agrimitra_language', validCode);
    } catch (e) {}
    
    set((state) => ({
      languageCode: validCode,
      user: state.user ? { ...state.user, languageCode: validCode } : state.user
    }));

    const user = get().user;
    if (user?.id) {
      await profileApi.updateProfile(user.id, { languageCode: validCode });
    }
  },

  _authListenerInitialized: false,
  _profileUnsubscribe: null,

  initAuthListener: () => {
    if (get()._authListenerInitialized) return;
    set({ _authListenerInitialized: true, authLoading: true });

    // Initial restoration hint from localStorage if session marker exists
    const cachedSession = localStorage.getItem('agrimitra_session');
    if (cachedSession) {
      const cachedData = getSafeParsedProfile();
      if (cachedData) {
        set({ 
          isAuthenticated: true, 
          user: cachedData,
          selectedState: cachedData.state || get().selectedState,
          selectedDistrict: cachedData.district || get().selectedDistrict
        });
      }
    }

    authApi.onSessionChange(async (firebaseUser) => {
      const currentUnsubscribe = get()._profileUnsubscribe;
      if (currentUnsubscribe) {
        currentUnsubscribe();
        set({ _profileUnsubscribe: null });
      }

      // CRITICAL: Await Firebase Auth persistence readiness before deciding session state
      await authApi.waitForAuthReady().catch(() => {});
      let activeFirebaseUser = auth?.currentUser || firebaseUser;

      // CRITICAL: Explicitly reject anonymous Firebase users - they must NEVER become active application users
      if (activeFirebaseUser && activeFirebaseUser.isAnonymous) {
        console.warn('Rejecting anonymous Firebase user during session restoration.');
        try {
          const { logoutFirebase } = await import('../config/firebase');
          await logoutFirebase();
        } catch (e) {}
        activeFirebaseUser = null;
      }

      if (activeFirebaseUser) {
        const currentUid = activeFirebaseUser.uid;

        // Verify cached profile: ONLY trust if UID matches current authenticated Firebase user
        const rawCached = getSafeParsedProfile();
        const isCacheMatching = Boolean(
          rawCached &&
          (rawCached.id === currentUid || rawCached.uid === currentUid) &&
          (!activeFirebaseUser.email || !rawCached.email || rawCached.email.toLowerCase() === activeFirebaseUser.email.toLowerCase())
        );

        if (!isCacheMatching && rawCached) {
          // Stale/foreign profile in storage: purge immediately to prevent state pollution
          localStorage.removeItem('agrimitra_user_profile');
        }

        const validCached = isCacheMatching ? rawCached : null;

        // Fetch user profile from Firestore using the exact Firebase UID
        let firestoreProfile = null;
        try {
          const res = await profileApi.getProfile(currentUid);
          if (res && res.profile) {
            firestoreProfile = res.profile;
          }
        } catch (err) {
          console.warn('Profile fetch during session restoration warning:', err);
        }

        // Determine correct authMode (preserve google if signed in via Google)
        const isGoogleUser = Boolean(
          activeFirebaseUser.providerData?.some((p) => p.providerId === 'google.com') ||
          validCached?.authMode === 'google'
        );

        // Base user details from verified Firebase Auth session
        const baseUser = {
          id: currentUid,
          uid: currentUid,
          name: activeFirebaseUser.displayName || validCached?.name || firestoreProfile?.name || (activeFirebaseUser.email ? activeFirebaseUser.email.split('@')[0] : 'Farmer'),
          email: activeFirebaseUser.email || validCached?.email || firestoreProfile?.email || '',
          avatar: activeFirebaseUser.photoURL || validCached?.avatar || firestoreProfile?.avatar || null,
          phone: activeFirebaseUser.phoneNumber || validCached?.phone || firestoreProfile?.phone || '',
          state: validCached?.state || firestoreProfile?.state || '',
          district: validCached?.district || firestoreProfile?.district || '',
          authMode: isGoogleUser ? 'google' : (validCached?.authMode || firestoreProfile?.authMode || 'firebase')
        };

        // Merge: baseUser, verified matching cached data, and Firestore profile
        const mergedUser = {
          ...baseUser,
          ...(validCached || {}),
          ...(firestoreProfile || {}),
          id: currentUid,
          uid: currentUid
        };

        // Comprehensive onboarding check:
        // True if onboardingCompleted flag is true, OR user has saved crop/location details
        const isOnboarded = Boolean(
          mergedUser.onboardingCompleted === true ||
          firestoreProfile?.onboardingCompleted === true ||
          validCached?.onboardingCompleted === true ||
          mergedUser.primaryCrop ||
          (Array.isArray(mergedUser.crops) && mergedUser.crops.length > 0) ||
          (mergedUser.state && mergedUser.district)
        );

        mergedUser.onboardingCompleted = isOnboarded;

        localStorage.setItem('agrimitra_session', 'active');
        localStorage.setItem('agrimitra_user_profile', JSON.stringify(mergedUser));

        // ATOMIC STATE UPDATE: Release authLoading only together with verified user & isAuthenticated
        set({
          isAuthenticated: true,
          user: mergedUser,
          selectedState: mergedUser.state || get().selectedState,
          selectedDistrict: mergedUser.district || get().selectedDistrict,
          authLoading: false
        });

        get().restoreLatestDiagnosisImage();

        // Subscribe to real-time profile changes
        const unsubscribe = profileApi.subscribeToProfile(currentUid, (liveData) => {
          if (liveData) {
            set((state) => {
              if (state.user && state.user.id !== currentUid) return {};
              const updatedUser = {
                ...state.user,
                ...liveData,
                id: currentUid,
                uid: currentUid,
                name: liveData.name || state.user?.name || baseUser.name,
                avatar: liveData.avatar || state.user?.avatar || baseUser.avatar,
                state: liveData.state || state.selectedState,
                district: liveData.district || state.selectedDistrict,
                onboardingCompleted: Boolean(
                  state.user?.onboardingCompleted ||
                  liveData.onboardingCompleted ||
                  liveData.primaryCrop ||
                  (liveData.state && liveData.district)
                )
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
        // No Firebase user authenticated
        // Check for local direct account (e.g. usr_direct_...)
        const rawCached = getSafeParsedProfile();
        const cachedSession = localStorage.getItem('agrimitra_session');

        if (cachedSession === 'active' && rawCached && (rawCached.id?.startsWith('usr_direct_') || rawCached.id?.startsWith('usr_demo_'))) {
          let isDirectValid = false;
          try {
            const directUsers = JSON.parse(localStorage.getItem('agrimitra_direct_users') || '[]');
            isDirectValid = directUsers.some((u) => u.id === rawCached.id);
          } catch (e) {}

          if (isDirectValid) {
            const isOnboarded = Boolean(
              rawCached.onboardingCompleted === true ||
              rawCached.primaryCrop ||
              (Array.isArray(rawCached.crops) && rawCached.crops.length > 0) ||
              (rawCached.state && rawCached.district)
            );
            rawCached.onboardingCompleted = isOnboarded;

            set({
              isAuthenticated: true,
              user: rawCached,
              selectedState: rawCached.state || get().selectedState,
              selectedDistrict: rawCached.district || get().selectedDistrict,
              authLoading: false
            });
            return;
          }
        }

        // Neither Firebase nor direct session exists -> confirmed unauthenticated
        localStorage.removeItem('agrimitra_session');
        localStorage.removeItem('agrimitra_user_profile');
        set({
          isAuthenticated: false,
          user: null,
          authLoading: false
        });
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
        const uid = userData.id || userData.uid;
        const isOnboarded = Boolean(
          userData.onboardingCompleted === true ||
          userData.primaryCrop ||
          (Array.isArray(userData.crops) && userData.crops.length > 0) ||
          (userData.state && userData.district)
        );
        const updatedUser = { 
          ...state.user, 
          ...userData,
          ...(uid ? { id: uid, uid: uid } : {}),
          onboardingCompleted: isOnboarded
        };
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
