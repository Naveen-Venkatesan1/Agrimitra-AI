import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// AGRIMITRA AI Production Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Analytics (only works in browser environments)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Helper to format Firebase Auth error messages
export const formatFirebaseAuthError = (errorOrCode) => {
  const code = typeof errorOrCode === 'string' ? errorOrCode : (errorOrCode?.code || '');
  const msg = typeof errorOrCode === 'string' ? '' : (errorOrCode?.message || '');
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return `Domain unauthorized ("${currentHostname}"). Please add "${currentHostname}" to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`;
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return `Google Sign-In is disabled in Firebase Console. Please enable Google under Authentication > Sign-in method in Firebase Console.`;
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid' || msg.includes('api-key')) {
    return `Invalid Firebase API Key. Please verify VITE_FIREBASE_API_KEY in your .env.local file.`;
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return `Google Sign-In popup was blocked by your browser. Please allow popups or use redirect.`;
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return `Google Sign-In was cancelled. Click "Login with Google" again to retry.`;
  }
  if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
    return `Network connection failed while connecting to Google. Please check your internet connection.`;
  }
  if (code === 'auth/internal-error' || msg.includes('internal-error')) {
    return `Firebase Authentication internal error. Please verify Google Cloud / Firebase project settings.`;
  }
  if (code === 'auth/cancelled-popup-request') {
    return `Google Sign-In was interrupted by a new request. Please retry.`;
  }
  return msg || code || 'An unexpected authentication error occurred. Please try again.';
};

// Authentication Helpers (In-App Popup Flow)
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      return { user: result.user, error: null, code: null };
    }
    return { user: null, error: "No user credential returned from Google Sign-In.", code: null };
  } catch (error) {
    console.error("Firebase Google Popup Auth Error:", error);
    return { user: null, error: formatFirebaseAuthError(error), code: error.code };
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Firebase Email Login Error:", error);
    return { user: null, error: error.message };
  }
};

export const registerWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await sendEmailVerification(result.user).catch(() => {});
    }
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Firebase Signup Error:", error);
    return { user: null, error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    console.error("Firebase Reset Password Error:", error);
    return { success: false, error: error.message };
  }
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('agrimitra_session');
    localStorage.removeItem('agrimitra_user_profile');
    return { success: true };
  } catch (error) {
    console.error("Firebase Logout Error:", error);
    return { success: false, error: error.message };
  }
};

// Email Link Authentication Helpers
export const sendEmailSignInLink = async (email) => {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/finishSignUp`,
      handleCodeInApp: true
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('emailForSignIn', email);
    return { success: true, error: null };
  } catch (error) {
    console.error("Firebase Send Email Link Error:", error);
    return { success: false, error: error.message };
  }
};

export const checkIsEmailSignInLink = (url) => {
  try {
    return isSignInWithEmailLink(auth, url || window.location.href);
  } catch (error) {
    return false;
  }
};

export const completeEmailSignInLink = async (email, url) => {
  try {
    const result = await signInWithEmailLink(auth, email, url || window.location.href);
    localStorage.removeItem('emailForSignIn');
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Firebase Complete Email Link Error:", error);
    return { user: null, error: error.message };
  }
};

// Phone OTP Authentication Helpers
export const setupRecaptcha = (containerId = 'send-otp-btn') => {
  try {
    const targetId = document.getElementById(containerId)
      ? containerId
      : (document.getElementById('send-otp-btn') ? 'send-otp-btn' : 'recaptcha-container');

    const targetEl = document.getElementById(targetId);

    if (window.recaptchaVerifier) {
      const currentEl = window.recaptchaVerifier._element;
      if (!currentEl || (targetEl && currentEl !== targetEl)) {
        try {
          if (typeof window.recaptchaVerifier.clear === 'function') {
            window.recaptchaVerifier.clear();
          }
        } catch (_) {}
        window.recaptchaVerifier = null;
      }
    }

    if (!window.recaptchaVerifier && targetEl) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, targetId, {
        size: 'invisible',
        callback: () => {}
      });
    }
    return window.recaptchaVerifier;
  } catch (error) {
    console.error("Firebase Recaptcha Setup Error:", error);
    return null;
  }
};

export const sendPhoneOTP = async (phoneNumber, containerId = 'send-otp-btn') => {
  try {
    const appVerifier = setupRecaptcha(containerId);
    if (!appVerifier) {
      return { confirmationResult: null, error: "Failed to initialize Recaptcha verifier." };
    }
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '')}`;
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    return { confirmationResult, error: null };
  } catch (error) {
    console.error("Firebase Send Phone OTP Error:", error);
    return { confirmationResult: null, error: error.message };
  }
};

export const verifyPhoneOTP = async (confirmationResult, otpCode) => {
  try {
    const activeConfirm = confirmationResult || window.confirmationResult;
    if (!activeConfirm) {
      return { user: null, error: "No active OTP request found. Please resend OTP." };
    }
    const result = await activeConfirm.confirm(otpCode);
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Firebase Verify Phone OTP Error:", error);
    return { user: null, error: error.message };
  }
};

// File Upload Helper for Firebase Storage
export const uploadFileToStorage = async (file, folderPath = 'documents') => {
  try {
    const filename = `${Date.now()}_${file.name || 'file.png'}`;
    const storageRef = ref(storage, `${folderPath}/${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    return { success: false, error: error.message, url: null };
  }
};

// Initialize Firebase Messaging client safely
let messagingClient = null;
try {
  messagingClient = getMessaging(app);
} catch (err) {
  console.warn("FCM client initialization bypassed/failed (possibly non-browser or disabled):", err);
}

export const messaging = messagingClient;

export const requestNotificationPermissionAndGetToken = async (uid) => {
  if (!messaging) {
    console.warn("FCM messaging is not initialized.");
    return null;
  }
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Notification permission was denied.");
      return null;
    }

    // Register service worker if not already registered
    let registration = null;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase Service Worker registered successfully:', registration);
    }

    // Retrieve FCM token
    const tokenOptions = {
      serviceWorkerRegistration: registration
    };
    
    if (import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      tokenOptions.vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    }

    const token = await getToken(messaging, tokenOptions);

    if (token && uid) {
      // Save FCM token to Firestore
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { fcmToken: token }, { merge: true });
      console.log('FCM registration token successfully saved to user document:', token);
    }
    return token;
  } catch (error) {
    console.error("Error during permission request or token retrieval: ", error);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  if (messaging) {
    return onMessage(messaging, callback);
  }
  return () => {};
};

export {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
};
