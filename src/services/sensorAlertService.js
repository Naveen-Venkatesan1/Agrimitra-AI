let dbModule = null;
let authModule = null;

const getFirebase = async () => {
  if (!dbModule) {
    dbModule = await import('../config/firebase.js');
    authModule = await import('firebase/auth');
  }
  return {
    db: dbModule.db,
    doc: dbModule.doc,
    onSnapshot: dbModule.onSnapshot,
    auth: dbModule.auth,
    signInAnonymously: authModule.signInAnonymously
  };
};

/**
 * CONFIGURABLE SENSOR SAFETY THRESHOLDS
 */
export const FIRE_ALERT_THRESHOLD = 40; // °C
export const SENSOR_STALE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * STATE TRANSITION TRACKING
 * Prevents duplicate alerts on consecutive identical states.
 */
let lastIrDetected = null;
let lastTempHigh = null;
let activeUnsubscribe = null;

let serviceConfig = {
  addAlert: null,
  setSensorData: null,
  getLanguage: null,
  getTranslation: null
};

const translate = (lang, key, fallback) => {
  if (typeof serviceConfig.getTranslation === 'function') {
    return serviceConfig.getTranslation(lang, key, fallback);
  }
  return fallback;
};

/**
 * Configure external handlers (e.g. from useAppStore) to avoid circular imports.
 */
export const configureSensorAlertService = (config = {}) => {
  serviceConfig = { ...serviceConfig, ...config };
};

/**
 * Reset state transition tracking (e.g. for testing or session reset)
 */
export const resetAlertTransitions = () => {
  lastIrDetected = null;
  lastTempHigh = null;
};

/**
 * Get current state transition tracking flags
 */
export const getAlertTransitionState = () => ({
  lastIrDetected,
  lastTempHigh
});

/**
 * Safely parse any timestamp input into a valid Date object or null.
 */
export const parseSensorTimestamp = (rawTimestamp) => {
  if (!rawTimestamp) return null;

  if (rawTimestamp instanceof Date) {
    return isNaN(rawTimestamp.getTime()) ? null : rawTimestamp;
  }

  if (typeof rawTimestamp.toDate === 'function') {
    try {
      const d = rawTimestamp.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }

  const seconds = rawTimestamp?.seconds ?? rawTimestamp?._seconds;
  if (typeof seconds === 'number') {
    const d = new Date(seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof rawTimestamp === 'number') {
    const millis = rawTimestamp < 1e11 ? rawTimestamp * 1000 : rawTimestamp;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof rawTimestamp === 'string') {
    const d = new Date(rawTimestamp);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Validates timestamp freshness to prevent generating alerts from stale sensor data.
 */
export const isSensorDataFresh = (rawTimestamp, maxAgeMs = SENSOR_STALE_MAX_AGE_MS) => {
  const date = parseSensorTimestamp(rawTimestamp);
  if (!date) return false;

  // Must have a modern year
  if (date.getFullYear() < 2024) return false;

  const ageMs = Date.now() - date.getTime();
  // Reject future timestamps (> 5m clock drift) or older than maxAgeMs
  if (ageMs < -5 * 60 * 1000 || ageMs > maxAgeMs) {
    return false;
  }

  return true;
};

/**
 * Core alert evaluation logic:
 * Evaluates live Firestore reading against state transitions and thresholds.
 *
 * @param {Object} data - Raw sensor data from Firestore sensor_readings/latest
 * @param {string|null} overrideLang - Optional language code override
 * @param {Object} options - Optional config overrides (e.g. threshold, maxAgeMs, dispatch)
 */
export const evaluateSensorData = (data, overrideLang = null, options = {}) => {
  const alertsTriggered = [];

  if (!data || typeof data !== 'object') {
    return { handled: false, reason: 'no_data', alertsTriggered };
  }

  const maxAgeMs = options.maxAgeMs ?? SENSOR_STALE_MAX_AGE_MS;
  const isFresh = isSensorDataFresh(data.timestamp, maxAgeMs);

  // 1. STALE SENSOR PROTECTION
  if (!isFresh) {
    return { handled: false, reason: 'stale_or_missing_timestamp', alertsTriggered };
  }

  const lang = overrideLang || (typeof serviceConfig.getLanguage === 'function' ? serviceConfig.getLanguage() : 'en') || 'en';

  // 2. OBJECT DETECTION ALERT (ir_detected state transition)
  const isObjectDetected = data.ir_detected === true;

  if (isObjectDetected) {
    if (lastIrDetected !== true) {
      // Transition: false (or initial) -> true => TRIGGER ALERT
      lastIrDetected = true;

      const title = translate(lang, 'alert_object_detected_title', 'Object Detected');
      const message = translate(lang, 'alert_object_detected_message', 'An object has been detected by the farm sensor.');

      const alertItem = {
        title,
        message,
        titleKey: 'alert_object_detected_title',
        messageKey: 'alert_object_detected_message',
        type: 'Object Detection',
        category: 'object',
        severity: 'warning',
        timestamp: new Date().toISOString()
      };

      alertsTriggered.push(alertItem);
    }
    // true -> true: duplicate alert prevented
  } else if (data.ir_detected === false) {
    // Transition: true -> false => RESET state for next object appearance
    lastIrDetected = false;
  }

  // 3. HIGH TEMPERATURE / FIRE ALERT (temperature state transition)
  const rawTemp = data.temperature;
  const temp = typeof rawTemp === 'number'
    ? rawTemp
    : (rawTemp != null && !isNaN(Number(rawTemp)) ? Number(rawTemp) : null);

  const fireThreshold = options.threshold ?? FIRE_ALERT_THRESHOLD;
  const isTempHigh = temp != null && temp >= fireThreshold;

  if (isTempHigh) {
    if (lastTempHigh !== true) {
      // Transition: below threshold -> crossed threshold => TRIGGER ALERT
      lastTempHigh = true;

      const title = translate(lang, 'alert_fire_temp_title', 'High Temperature / Fire Alert');
      const message = translate(lang, 'alert_fire_temp_message', 'Temperature is critically high. Please check the farm area immediately.');

      const alertItem = {
        title,
        message,
        titleKey: 'alert_fire_temp_title',
        messageKey: 'alert_fire_temp_message',
        type: 'Fire Alert',
        category: 'fire',
        severity: 'danger',
        timestamp: new Date().toISOString()
      };

      alertsTriggered.push(alertItem);
    }
    // above -> above: duplicate alert prevented
  } else if (temp != null && temp < fireThreshold) {
    // Transition: above threshold -> below threshold => RESET state
    lastTempHigh = false;
  }

  // 4. DISPATCH ALERTS TO APP STORE
  if (alertsTriggered.length > 0 && options.dispatch !== false) {
    alertsTriggered.forEach((alert) => {
      try {
        if (typeof serviceConfig.addAlert === 'function') {
          serviceConfig.addAlert(alert);
        }
      } catch (err) {
        console.warn('Failed to dispatch sensor alert to store:', err);
      }
    });
  }

  return { handled: true, alertsTriggered };
};

/**
 * Initializes the global Firestore listener on sensor_readings/latest
 */
export const initSensorAlertListener = (onDataUpdated = null) => {
  if (activeUnsubscribe) {
    return activeUnsubscribe;
  }

  const setupListener = async () => {
    try {
      const { db, doc, onSnapshot, auth, signInAnonymously } = await getFirebase();

      if (auth && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('Firebase anonymous authentication notice:', e);
        }
      }

      if (db) {
        const sensorDocRef = doc(db, 'sensor_readings', 'latest');
        activeUnsubscribe = onSnapshot(
          sensorDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const updateTime = parseSensorTimestamp(data.timestamp);

              const formattedData = {
                temperature: data.temperature ?? null,
                humidity: data.humidity ?? null,
                distance_cm: data.distance_cm ?? null,
                ir_detected: data.ir_detected ?? null,
                soil_moisture_percent: data.soil_moisture_percent ?? null,
                timestamp: updateTime
              };

              // Update store sensor data
              if (typeof serviceConfig.setSensorData === 'function') {
                serviceConfig.setSensorData(formattedData, true);
              }

              // Evaluate live alert triggers
              evaluateSensorData(data);

              if (typeof onDataUpdated === 'function') {
                onDataUpdated(formattedData, true);
              }
            } else {
              if (typeof serviceConfig.setSensorData === 'function') {
                serviceConfig.setSensorData(null, false);
              }
              if (typeof onDataUpdated === 'function') {
                onDataUpdated(null, false);
              }
            }
          },
          (err) => {
            console.warn('Firestore sensor_readings/latest listener error:', err);
            if (typeof serviceConfig.setSensorData === 'function') {
              serviceConfig.setSensorData(null, false);
            }
          }
        );
      }
    } catch (e) {
      console.warn('Firestore sensor listener init error:', e);
    }
  };

  setupListener();

  return () => {
    stopSensorAlertListener();
  };
};

/**
 * Stops the Firestore listener
 */
export const stopSensorAlertListener = () => {
  if (activeUnsubscribe) {
    try {
      activeUnsubscribe();
    } catch {}
    activeUnsubscribe = null;
  }
};

export default {
  FIRE_ALERT_THRESHOLD,
  SENSOR_STALE_MAX_AGE_MS,
  configureSensorAlertService,
  resetAlertTransitions,
  getAlertTransitionState,
  parseSensorTimestamp,
  isSensorDataFresh,
  evaluateSensorData,
  initSensorAlertListener,
  stopSensorAlertListener
};
