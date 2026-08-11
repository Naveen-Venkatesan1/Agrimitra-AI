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

// Authentication Helpers
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null, code: null };
  } catch (error) {
    console.error("Firebase Google Auth Error:", error);
    if (error.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null, code: 'redirecting' };
      } catch (redirectError) {
        return { user: null, error: redirectError.message, code: redirectError.code };
      }
    }
    return { user: null, error: error.message, code: error.code };
  }
};

export const checkGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return { user: result.user, error: null };
    }
    return { user: null, error: null };
  } catch (error) {
    console.error("Firebase Redirect Auth Error:", error);
    return { user: null, error: error.message, code: error.code };
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
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
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

export const sendPhoneOTP = async (phoneNumber, containerId = 'recaptcha-container') => {
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
