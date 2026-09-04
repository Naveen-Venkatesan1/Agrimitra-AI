import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sprout,
  CloudSun,
  Droplets,
  Users,
  Globe,
  Headphones,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Phone,
  Check,
  ChevronDown,
  ChevronRight,
  Leaf,
  Volume2,
  BookOpen,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { loginWithGoogle, formatFirebaseAuthError } from '../../config/firebase';
import { useTranslation } from '../../hooks/useTranslation';
import { authApi } from '../../services/api';

/* ─────────────────────────────────────────────────────────── */

export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();
  const { currentLang, changeLanguage, t, languages } = useTranslation();

  const [activeTab, setActiveTab] = useState('options');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [phoneStep, setPhoneStep] = useState('number'); // 'number' | 'otp' | 'create_password'
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedPhoneUser, setVerifiedPhoneUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    if (activeTab === 'email' && email) {
      try {
        const targetEmail = email.trim();
        const res = await authApi.login({ email: targetEmail, password });

        if (!res.success) {
          setAuthError(res.error || t('error_login_failed', 'Login failed. Please check your credentials or create an account.'));
          setLoading(false);
          return;
        }

        if (res.user) {
          setAuth(true, res.user);
          setLoading(false);
          const target = res.user.onboardingCompleted ? '/dashboard' : '/onboarding';
          navigate(target, { replace: true });
          return;
        }
      } catch (err) {
        console.warn("Direct Auth fallback:", err);
        setAuthError(t('error_auth_unavailable', 'Authentication service unavailable. Please try again later.'));
        setLoading(false);
        return;
      }
    } else {
      setAuthError(t('error_enter_email_or_mobile', 'Please enter your email or mobile number.'));
      setLoading(false);
      return;
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setGoogleLoading(true);
    setAuthError('');

    try {
      const authResult = await loginWithGoogle();
      const { user, error, code } = authResult || {};

      // STRICT GUARD: Must have a confirmed successful Google authentication result with a valid authenticated user.
      // Never treat popup cancellation, undefined/null user, rejected promise, auth error,
      // incomplete OAuth result, missing credential, or failed authentication as a valid new user.
      const isValidAuthenticatedUser = Boolean(
        authResult &&
        !error &&
        (!code || code === 'redirecting') &&
        user &&
        typeof user === 'object' &&
        !user.error &&
        typeof user.uid === 'string' &&
        user.uid.trim().length > 0 &&
        typeof user.email === 'string' &&
        user.email.includes('@')
      );

      // 2. GOOGLE AUTH FAILURE / CANCEL
      // If authentication does NOT successfully complete:
      // - Do NOT create a user or profile
      // - Do NOT write to Firestore, direct-user registry, local storage, or profile cache
      // - Do NOT redirect to /onboarding
      // - Stay on the Login page and show existing error message
      if (!isValidAuthenticatedUser) {
        // Guarantee no active session or partial auth state is retained
        setAuth(false);

        let displayError = '';
        if (error) {
          displayError = typeof error === 'string' ? error : formatFirebaseAuthError(error);
        } else if (code && code !== 'redirecting') {
          displayError = formatFirebaseAuthError(code);
        } else if (user && user.error) {
          displayError = typeof user.error === 'string' ? user.error : formatFirebaseAuthError(user.error);
        } else if (!user) {
          displayError = t('error_google_cancelled', 'Google Sign-In was cancelled. Click "Login with Google" again to retry.');
        } else if (!user.email) {
          displayError = t('error_google_no_email', 'No verified email returned from Google Sign-In.');
        } else {
          displayError = t('error_google_failed', 'Google authentication failed. Please try again.');
        }

        setAuthError(displayError);
        setLoading(false);
        setGoogleLoading(false);
        return;
      }

      // 1. GOOGLE AUTH SUCCESS CONFIRMED: Valid authenticated user verified
      const { profileApi } = await import('../../services/api/profile');

      // 5. ACCOUNT EXISTENCE CHECK
      // Use ONLY the application's existing authenticated-user/account data and existing frontend-accessible state/API result.
      let existingProfile = null;
      try {
        const res = await profileApi.getProfile(user.uid);
        if (res && res.profile) {
          const p = res.profile;
          const hasAccountData = Boolean(
            p.onboardingCompleted ||
            p.primaryCrop ||
            (Array.isArray(p.crops) && p.crops.length > 0) ||
            (p.state && p.district)
          );
          const matchesUser = Boolean(
            (p.id && p.id === user.uid) || 
            (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase())
          );
          if (hasAccountData && matchesUser) {
            existingProfile = p;
          }
        }
      } catch (e) {
        console.warn("Profile fetch error:", e);
      }

      // Secondary check: Existing direct users in application registry
      if (!existingProfile) {
        try {
          const directUsers = JSON.parse(localStorage.getItem('agrimitra_direct_users') || '[]');
          const matched = directUsers.find(
            (u) => (u.email && u.email.toLowerCase() === user.email.toLowerCase()) || u.id === user.uid
          );
          if (matched && (matched.onboardingCompleted || matched.primaryCrop || (matched.crops && matched.crops.length > 0) || (matched.state && matched.district))) {
            existingProfile = matched;
          }
        } catch (e) {
          console.warn("Direct users check error:", e);
        }
      }

      // Tertiary check: Cached active profile matching user
      if (!existingProfile) {
        try {
          const cached = JSON.parse(localStorage.getItem('agrimitra_user_profile') || 'null');
          if (
            cached &&
            ((cached.email && cached.email.toLowerCase() === user.email.toLowerCase()) || cached.id === user.uid) &&
            (cached.onboardingCompleted || cached.primaryCrop || (cached.crops && cached.crops.length > 0) || (cached.state && cached.district))
          ) {
            existingProfile = cached;
          }
        } catch (e) {
          console.warn("Cached profile check error:", e);
        }
      }

      if (existingProfile) {
        // 4. EXISTING GOOGLE ACCOUNT
        // Treat as existing user, sign in normally, redirect to existing post-login destination (/dashboard).
        // DO NOT send them to Create New Account, DO NOT show account creation screen.
        const existingUserObj = {
          id: user.uid,
          name: existingProfile.name || user.displayName || user.email.split('@')[0] || 'Farmer User',
          email: user.email,
          avatar: user.photoURL || existingProfile.avatar || '',
          ...existingProfile,
          onboardingCompleted: true
        };

        setAuth(true, existingUserObj);
        setLoading(false);
        setGoogleLoading(false);
        navigate('/dashboard', { replace: true });
        return;
      } else {
        // 5. NEW GOOGLE ACCOUNT
        // Genuinely new user with confirmed successful Google authentication.
        // Redirect to existing Create New Account/onboarding flow with real Google profile prefilled.
        // Do NOT automatically create the account before onboarding.
        const newGoogleUser = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || '',
          email: user.email,
          avatar: user.photoURL || '',
          authMode: 'google',
          onboardingCompleted: false
        };

        setAuth(true, newGoogleUser);
        setLoading(false);
        setGoogleLoading(false);
        navigate('/onboarding', { replace: true, state: { googleUser: newGoogleUser } });
        return;
      }
    } catch (err) {
      console.warn("Google Auth popup exception:", err);
      // Guarantee any session or partial auth state is completely cleared
      setAuth(false);
      setAuthError(formatFirebaseAuthError(err));
      setLoading(false);
      setGoogleLoading(false);
    }
  };

  const handleSendPhoneOTP = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;

    const cleanDigits = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setAuthError(t('error_invalid_phone', 'Please enter a valid 10-digit Indian mobile number.'));
      return;
    }

    setLoading(true);
    setAuthError('');
    setOtpSuccessMsg('');

    try {
      const res = await authApi.sendBackendPhoneOTP(cleanDigits);
      setLoading(false);
      if (!res.success || res.error) {
        setAuthError(res.error || t('error_failed_send_otp', 'Failed to send OTP to mobile number. Please check format.'));
      } else {
        setOtpSuccessMsg(res.message || t('otp_sent_success', 'OTP sent successfully'));
        setPhoneStep('otp');
      }
    } catch (err) {
      console.warn("Send phone OTP error:", err);
      setAuthError(err.message || t('error_failed_send_otp', 'Failed to send phone OTP.'));
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;

    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setAuthError(t('error_enter_otp', 'Please enter the 6-digit OTP code received on your mobile phone.'));
      return;
    }

    setLoading(true);
    setAuthError('');

    try {
      const res = await authApi.verifyPhoneOTP(confirmationResult, trimmedOtp);
      
      // FAILED / CANCELLED OTP: Stay on OTP screen, show error, zero account creation
      if (!res || res.error || !res.user) {
        setAuthError(res?.error || t('error_invalid_otp', 'Invalid or expired OTP code. Please try again.'));
        setLoading(false);
        return;
      }

      const fbUser = res.user;
      const isValidFirebaseUser = Boolean(
        fbUser &&
        typeof fbUser === 'object' &&
        typeof fbUser.uid === 'string' &&
        fbUser.uid.trim().length > 0
      );

      if (!isValidFirebaseUser) {
        setAuthError(t('error_invalid_otp', 'Invalid or expired OTP code. Please try again.'));
        setLoading(false);
        return;
      }

      // STEP 3 & 4: Check existing application account/profile
      const cleanDigits = (fbUser.phoneNumber || phoneNumber).replace(/\D/g, '').slice(-10);
      const { profileApi } = await import('../../services/api/profile');

      let existingUserFound = false;

      // 1. Check Firestore Profile
      try {
        const pRes = await profileApi.getProfile(fbUser.uid);
        if (pRes && pRes.profile) {
          const p = pRes.profile;
          const hasData = Boolean(
            p.onboardingCompleted ||
            p.primaryCrop ||
            (Array.isArray(p.crops) && p.crops.length > 0) ||
            (p.state && p.district)
          );
          if (hasData) {
            existingUserFound = true;
          }
        }
      } catch (err) {
        console.warn("Profile check error:", err);
      }

      // 2. Check local application direct users registry
      if (!existingUserFound) {
        try {
          const directUsers = JSON.parse(localStorage.getItem('agrimitra_direct_users') || '[]');
          const matched = directUsers.find((u) => {
            const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
            const uEmail = (u.email || '').toLowerCase();
            return (
              (cleanDigits && uPhone === cleanDigits) ||
              (cleanDigits && uEmail.includes(cleanDigits)) ||
              u.id === fbUser.uid
            );
          });
          if (matched && (matched.onboardingCompleted || matched.primaryCrop || (matched.crops && matched.crops.length > 0) || (matched.state && matched.district))) {
            existingUserFound = true;
          }
        } catch (err) {
          console.warn("Direct users check error:", err);
        }
      }

      // 3. Check cached user profile
      if (!existingUserFound) {
        try {
          const cachedProfile = JSON.parse(localStorage.getItem('agrimitra_user_profile') || 'null');
          if (cachedProfile) {
            const cPhone = (cachedProfile.phone || '').replace(/\D/g, '').slice(-10);
            if (
              ((cleanDigits && cPhone === cleanDigits) || cachedProfile.id === fbUser.uid) &&
              (cachedProfile.onboardingCompleted || cachedProfile.primaryCrop || (cachedProfile.state && cachedProfile.district))
            ) {
              existingUserFound = true;
            }
          }
        } catch (err) {
          console.warn("Cached profile check error:", err);
        }
      }

      // STEP 4 — EXISTING USER GUARD:
      // IF THE VERIFIED PHONE NUMBER ALREADY BELONGS TO AN EXISTING APPLICATION USER:
      // - Do NOT open "Create New Password"
      // - Do NOT open "Create New Account"
      // - Do NOT create another user/profile
      // - Do NOT duplicate the account
      // - Show real-app message: "An account already exists with this mobile number. Please login."
      // - Keep user in the login flow.
      if (existingUserFound) {
        setLoading(false);
        setPhoneStep('number');
        setOtpCode('');
        setConfirmationResult(null);
        setAuthError(t('user_already_exists_login', 'An account already exists with this mobile number. Please login.'));
        return;
      }

      // STEP 5 — NEW USER:
      // Successfully OTP-verified and no existing application account
      setVerifiedPhoneUser(fbUser);
      setPhoneStep('create_password');
      setLoading(false);
      setAuthError('');
    } catch (err) {
      console.warn("Verify phone OTP error:", err);
      setAuthError(err.message || t('error_invalid_otp', 'Failed to verify phone OTP code.'));
      setLoading(false);
    }
  };

  const handleCreatePasswordSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAuthError('');

    // GUARD: Must have verified phone user
    if (!verifiedPhoneUser) {
      setAuthError(t('error_auth_unavailable', 'Authentication session expired. Please verify your phone number again.'));
      setPhoneStep('number');
      return;
    }

    // Password validation: Min 6 chars
    if (!newPassword || newPassword.length < 6) {
      setAuthError(t('error_password_min_length', 'Password must be at least 6 characters long.'));
      return;
    }

    // Password validation: Match confirm password
    if (newPassword !== confirmPassword) {
      setAuthError(t('error_password_mismatch', 'Passwords do not match. Please verify.'));
      return;
    }

    // Both validations passed!
    // SCREEN B — CREATE NEW ACCOUNT
    // Redirect to the existing "Create New Account" / farmer registration flow (/onboarding).
    // Carry forward ONLY the real verified phone number and authenticated Firebase user state.
    const cleanDigits = (verifiedPhoneUser.phoneNumber || phoneNumber).replace(/\D/g, '').slice(-10);
    const formattedPhone = verifiedPhoneUser.phoneNumber || `+91${cleanDigits}`;

    const newPhoneUserObj = {
      id: verifiedPhoneUser.uid,
      uid: verifiedPhoneUser.uid,
      phone: formattedPhone,
      phoneNumber: formattedPhone,
      email: `${cleanDigits}@agrimitra.ai`,
      name: `Farmer ${cleanDigits.slice(-4)}`,
      authMode: 'phone',
      password: newPassword,
      onboardingCompleted: false
    };

    setAuth(true, newPhoneUserObj);
    navigate('/onboarding', {
      state: {
        phoneUser: newPhoneUserObj,
        verifiedPhone: formattedPhone,
        firebaseUid: verifiedPhoneUser.uid
      }
    });
  };

  const supportedLanguages = (languages || []).filter((l) => ['ta', 'en', 'te', 'ml', 'hi'].includes(l.code));

  return (
    <div
      className="relative min-h-screen w-full flex flex-col font-sans overflow-x-hidden bg-[#F6FAF5]"
    >
      {/* Background Decor */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/login-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div
        className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col flex-1"
        style={{
          paddingTop: 'env(safe-area-inset-top, 16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))'
        }}
      >

        {/* TOP ROW: Language Selector */}
        <div className="flex justify-end pt-2 pb-4 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm rounded-full px-3 py-1.5 cursor-pointer max-w-full">
            <Globe className="w-3.5 h-3.5 text-gray-700 shrink-0" />
            <select
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-[13px] font-semibold text-gray-800 outline-none cursor-pointer appearance-none px-1 max-w-[180px] truncate"
              aria-label={t('app_language', 'Application Language')}
            >
              {supportedLanguages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName ? `${l.nativeName} (${l.name})` : l.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          </div>
        </div>

        {/* Main centered container */}
        <div className="flex-1 flex flex-col justify-center py-2 shrink-0">

          {/* HERO LOGO & BRANDING */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] mb-3 flex items-center justify-center rounded-full bg-white shadow-md overflow-hidden border-[4px] border-[#328B45]/10 shrink-0">
              <img src="/new-logo.jpg" alt="AgriMitra Logo" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/logo.png'; }} />
            </div>

            <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight flex items-center leading-none text-center m-0 uppercase" style={{ color: '#1B5E20' }}>
              AGR<span className="text-[#328B45]">I</span>MITRA <span className="text-[#328B45] ml-1.5">AI</span>
            </h1>

            <div className="flex items-center gap-2 mt-2.5 w-full justify-center opacity-80 px-2 flex-wrap">
              <div className="w-1.5 h-1.5 rounded-full bg-[#328B45] shrink-0" />
              <div className="h-px bg-[#328B45] w-4 sm:w-8 shrink-0" />
              <p className="text-[11px] sm:text-[12px] font-medium text-[#1B5E20] m-0 uppercase tracking-widest text-center break-words">
                {t('smart_farming_tagline_single', 'Smart Farming, Better Tomorrow')}
              </p>
              <div className="h-px bg-[#328B45] w-4 sm:w-8 shrink-0" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#328B45] shrink-0" />
            </div>
          </div>

          {/* TRUST BADGES */}
          <div className="flex justify-between items-start mb-8 px-0 sm:px-1 gap-1 w-full shrink-0">
            {[
              { icon: <Leaf className="w-5 h-5 text-[#328B45]" />, label: t('trust_easy_to_use', 'Easy to Use') },
              { icon: <Sprout className="w-5 h-5 text-[#328B45]" />, label: t('trust_trustworthy_advice', 'Trustworthy\nAdvice') },
              { icon: <CloudSun className="w-5 h-5 text-[#328B45]" />, label: t('trust_stay_informed', 'Stay\nInformed') },
              { icon: <ShieldCheck className="w-5 h-5 text-[#328B45]" />, label: t('trust_secure_and_safe', 'Secure & Safe') },
            ].map((item, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center flex-1 min-w-0 shrink-0">
                  <div className="w-11 h-11 bg-[#F1F8F0] rounded-full flex items-center justify-center mb-2 z-10 border border-[#328B45]/10 shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-800 text-center leading-tight whitespace-pre-line break-words w-full px-0.5">
                    {item.label}
                  </span>
                </div>
                {idx < 3 && <div className="w-px h-8 bg-gray-200 mt-2 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          {/* LOGIN OPTIONS OR FORMS */}
          {activeTab === 'options' ? (
            <div className="flex flex-col gap-3 w-full shrink-0">
              {/* Visible Authentication Error Banner */}
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-start gap-2 shadow-xs animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="flex-1 leading-snug break-words">{authError}</span>
                  <button
                    type="button"
                    onClick={() => setAuthError('')}
                    className="text-red-400 hover:text-red-600 font-bold ml-1 text-sm bg-transparent border-none cursor-pointer p-0"
                    aria-label={t('close', 'Close')}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Phone Button */}
              <button
                onClick={() => {
                  setActiveTab('mobile');
                  setPhoneStep('number');
                  setPhoneNumber('');
                  setOtpCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setVerifiedPhoneUser(null);
                  setAuthError('');
                  setOtpSuccessMsg('');
                }}
                className="flex items-center p-2.5 sm:p-3 rounded-2xl transition-transform active:scale-[0.98] cursor-pointer border-none shadow-sm"
                style={{ background: '#2E7D32' }}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Phone className="w-5 h-5 text-[#2E7D32]" fill="currentColor" />
                </div>
                <div className="flex flex-col flex-1 min-w-0 items-start pl-3 justify-center text-left">
                  <span className="text-white font-bold text-[15px] sm:text-[16px] leading-tight break-words w-full">
                    {t('login_phone_title', 'Login with Phone Number')}
                  </span>
                  <span className="text-white/80 font-medium text-[11.5px] mt-0.5 leading-tight break-words w-full">
                    {t('login_phone_subtitle', 'We will send you an OTP')}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-white mr-1 opacity-90 shrink-0" />
              </button>

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`flex items-center p-2.5 sm:p-3 rounded-2xl transition-transform active:scale-[0.98] bg-white border border-gray-100 shadow-sm ${loading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100">
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0 items-start pl-3 justify-center text-left">
                  <span className="text-[#1B5E20] font-bold text-[15px] sm:text-[16px] leading-tight break-words w-full">
                    {googleLoading ? t('signing_in_google', 'Signing in with Google...') : t('login_google', 'Login with Google')}
                  </span>
                  {googleLoading && (
                    <span className="text-gray-500 font-medium text-[11.5px] mt-0.5 leading-tight break-words w-full">
                      {t('google_popup_hint', 'Please choose your Google account in popup')}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 mr-1 shrink-0" />
              </button>

              {/* Email Button */}
              <button
                onClick={() => setActiveTab('email')}
                className="flex items-center p-2.5 sm:p-3 rounded-2xl transition-transform active:scale-[0.98] bg-white cursor-pointer border border-gray-100 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-[#2E7D32] flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col flex-1 min-w-0 items-start pl-3 justify-center text-left">
                  <span className="text-[#1B5E20] font-bold text-[15px] sm:text-[16px] leading-tight break-words w-full">
                    {t('login_email_title', 'Login with Email')}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 mr-1 shrink-0" />
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-3 my-2 px-6 w-full">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                  {t('or_divider', 'OR')}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* SIGNUP CTA */}
              <button
                onClick={() => navigate('/signup')}
                className="flex items-center p-2.5 sm:p-3 rounded-2xl transition-transform active:scale-[0.98] cursor-pointer border border-[#328B45]/20 shadow-sm w-full"
                style={{ background: '#F1F8F0' }}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-green-50">
                  <Leaf className="w-4 h-4 text-[#2E7D32]" />
                </div>
                <div className="flex flex-col flex-1 min-w-0 items-start pl-3 justify-center text-left">
                  <span className="text-[#1B5E20] font-bold text-[15px] sm:text-[16px] leading-tight break-words w-full">
                    {t('new_to_agrimitra', 'New to AgriMitra AI?')}
                  </span>
                  <span className="text-gray-600 font-medium text-[11.5px] mt-0.5 leading-tight break-words w-full">
                    {t('create_account_cta', 'Create an account to get started')}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#2E7D32] mr-1 shrink-0" />
              </button>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-sm p-5 sm:p-6 rounded-[20px] shadow-lg border border-gray-100 w-full mb-4 shrink-0 relative overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'mobile') {
                    if (phoneStep === 'create_password') {
                      setPhoneStep('number');
                      setOtpCode('');
                      setVerifiedPhoneUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                      setAuthError('');
                      setOtpSuccessMsg('');
                    } else if (phoneStep === 'otp') {
                      setPhoneStep('number');
                      setOtpCode('');
                      setAuthError('');
                      setOtpSuccessMsg('');
                    } else {
                      setActiveTab('options');
                      setAuthError('');
                      setOtpSuccessMsg('');
                    }
                  } else {
                    setActiveTab('options');
                    setAuthError('');
                    setOtpSuccessMsg('');
                  }
                }}
                className="absolute top-4 left-4 text-[#2E7D32] font-bold text-xs flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer p-1"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" /> {t('back', 'Back')}
              </button>

              <div className="mt-8">
                {activeTab === 'mobile' ? (
                  phoneStep === 'create_password' ? (
                    /* SCREEN A — CREATE NEW PASSWORD */
                    <form onSubmit={handleCreatePasswordSubmit} className="flex flex-col gap-4 m-0">
                      <div className="text-center mb-1">
                        <h3 className="text-[17px] font-extrabold text-[#1B5E20] m-0">
                          {t('create_new_password', 'Create New Password')}
                        </h3>
                        <p className="text-[12px] text-gray-500 mt-1 m-0 leading-tight">
                          {t('create_password_subtitle', 'Set a secure password for your new AgriMitra account')}
                        </p>
                      </div>

                      {/* Verified Phone Badge */}
                      <div className="flex items-center justify-between bg-[#E8F5E9] border border-[#2E7D32]/20 rounded-xl px-3.5 py-2.5">
                        <span className="text-xs font-bold text-[#1B5E20]">
                          +91 {phoneNumber.replace(/\D/g, '').slice(-10)}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#2E7D32]/30 shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#2E7D32]" />
                          {t('phone_verified_badge', 'Mobile Verified ✓')}
                        </span>
                      </div>

                      {/* Password Field */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          {t('create_new_password', 'Create New Password')}
                        </label>
                        <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                          <div className="flex items-center justify-center pl-3.5 pr-2.5 h-full bg-gray-100 border-r-[1.5px] border-gray-200 shrink-0">
                            <Lock className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={t('enter_new_password', 'Enter new password (min. 6 characters)')}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (authError) setAuthError('');
                            }}
                            className="flex-1 px-3.5 bg-transparent border-none outline-none text-[14.5px] sm:text-[15px] font-semibold text-[#1B5E20] h-full w-full placeholder:text-gray-400 placeholder:font-normal min-w-0"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label={showNewPassword ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}
                            className="px-3.5 bg-transparent border-none cursor-pointer text-gray-400 h-full flex items-center justify-center hover:text-gray-600 shrink-0"
                          >
                            {showNewPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password Field */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          {t('confirm_password', 'Confirm new password')}
                        </label>
                        <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                          <div className="flex items-center justify-center pl-3.5 pr-2.5 h-full bg-gray-100 border-r-[1.5px] border-gray-200 shrink-0">
                            <Lock className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('confirm_password', 'Confirm new password')}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (authError) setAuthError('');
                            }}
                            className="flex-1 px-3.5 bg-transparent border-none outline-none text-[14.5px] sm:text-[15px] font-semibold text-[#1B5E20] h-full w-full placeholder:text-gray-400 placeholder:font-normal min-w-0"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}
                            className="px-3.5 bg-transparent border-none cursor-pointer text-gray-400 h-full flex items-center justify-center hover:text-gray-600 shrink-0"
                          >
                            {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="min-h-[20px] flex items-center justify-center">
                        {authError && <p className="text-xs text-red-600 font-semibold m-0 leading-tight text-center break-words">{authError}</p>}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full transition-transform active:scale-[0.98] text-white bg-[#2E7D32] border-none rounded-xl cursor-pointer shadow-md h-[52px] text-[15px] sm:text-[16px] font-bold px-3 text-center"
                      >
                        <span className="truncate">{t('continue_to_create_account', 'Continue to Create Account')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  ) : phoneStep === 'otp' ? (
                    /* STEP 2 — OTP SCREEN */
                    <form onSubmit={handleVerifyPhoneOTP} className="flex flex-col gap-4 m-0">
                      {otpSuccessMsg && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="flex-1 leading-snug">{otpSuccessMsg}</span>
                        </div>
                      )}

                      <div className="bg-[#F1F8F0] border border-[#328B45]/20 rounded-xl p-3 text-center">
                        <p className="text-xs text-[#1B5E20] font-medium m-0 leading-snug break-words">
                          {t('enter_otp_sent_to', 'Enter OTP sent to')} <strong className="font-bold">+91 {phoneNumber.replace(/\D/g, '').slice(-10)}</strong>
                        </p>
                      </div>

                      <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder={t('otp_placeholder', '6-digit code')}
                          value={otpCode}
                          onChange={(e) => {
                            setOtpCode(e.target.value.replace(/\D/g, ''));
                            if (authError) setAuthError('');
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-xl tracking-[0.2em] font-bold text-[#1B5E20] text-center h-full w-full"
                          required
                        />
                      </div>

                      <div className="min-h-[20px] flex items-center justify-center">
                        {authError && <p className="text-xs text-red-600 font-semibold m-0 leading-tight text-center break-words">{authError}</p>}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpCode.trim().length < 6}
                        className="flex items-center justify-center gap-2 w-full transition-transform active:scale-[0.98] text-white bg-[#2E7D32] border-none rounded-xl cursor-pointer shadow-md h-[52px] text-[16px] font-bold px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="truncate">{loading ? t('verifying', 'Verifying...') : t('verify_and_signin', 'Verify & Sign In')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPhoneStep('number'); setOtpCode(''); setAuthError(''); setOtpSuccessMsg(''); }}
                        className="bg-transparent border-none text-[#2E7D32] text-xs font-bold cursor-pointer mt-1 hover:underline text-center"
                      >
                        {t('change_number_resend', 'Change Number / Resend')}
                      </button>
                    </form>
                  ) : (
                    /* STEP 1 — ENTER MOBILE NUMBER */
                    <form onSubmit={handleSendPhoneOTP} className="flex flex-col gap-4 m-0">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          {t('login_phone_title', 'Login with Phone Number')}
                        </label>
                        <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                          <div className="flex items-center gap-1.5 px-3.5 border-r-[1.5px] border-gray-200 cursor-default select-none h-full bg-gray-100 shrink-0">
                            <span className="text-base">🇮🇳</span>
                            <span className="text-[14px] font-bold text-gray-700">+91</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder={t('enter_mobile', 'Enter mobile number')}
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value.replace(/\D/g, ''));
                              if (authError) setAuthError('');
                            }}
                            className="flex-1 px-3.5 bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-semibold text-[#1B5E20] h-full w-full placeholder:text-gray-400 placeholder:font-normal min-w-0"
                            required
                          />
                        </div>
                      </div>

                      <div className="min-h-[20px] flex items-center justify-center">
                        {authError && <p className="text-xs text-red-600 font-semibold m-0 leading-tight text-center break-words">{authError}</p>}
                      </div>

                      <button
                        id="send-otp-btn"
                        type="submit"
                        disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
                        className="flex items-center justify-center gap-2 w-full transition-transform active:scale-[0.98] text-white bg-[#2E7D32] border-none rounded-xl cursor-pointer shadow-md h-[52px] text-[16px] font-bold m-0 px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="truncate">{loading ? t('sending_otp', 'Sending OTP...') : t('send_otp_btn', 'Send OTP')}</span>
                      </button>
                    </form>
                  )
                ) : (
                  /* EMAIL LOGIN (EXISTING & UNCHANGED) */
                  <form onSubmit={handleLogin} className="flex flex-col gap-4 m-0">
                    <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                      <div className="flex items-center justify-center pl-3.5 pr-2.5 h-full bg-gray-100 border-r-[1.5px] border-gray-200 shrink-0">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        placeholder={t('enter_email', 'Enter email address')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (authError) setAuthError('');
                        }}
                        className="flex-1 px-3.5 bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-semibold text-[#1B5E20] h-full w-full placeholder:text-gray-400 placeholder:font-normal min-w-0"
                        required
                      />
                    </div>

                    <div className="flex items-center overflow-hidden border-[1.5px] border-gray-200 rounded-xl bg-gray-50 h-[52px] focus-within:border-[#2E7D32] focus-within:bg-white transition-colors">
                      <div className="flex items-center justify-center pl-3.5 pr-2.5 h-full bg-gray-100 border-r-[1.5px] border-gray-200 shrink-0">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('enter_password', 'Enter password')}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authError) setAuthError('');
                        }}
                        className="flex-1 px-3.5 bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-semibold text-[#1B5E20] h-full w-full placeholder:text-gray-400 placeholder:font-normal min-w-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}
                        className="px-3.5 bg-transparent border-none cursor-pointer text-gray-400 h-full flex items-center justify-center hover:text-gray-600 shrink-0"
                      >
                        {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="min-h-[20px] flex items-center justify-center">
                      {authError && <p className="text-xs text-red-600 font-semibold m-0 leading-tight text-center break-words">{authError}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="flex items-center justify-center gap-2 w-full transition-transform active:scale-[0.98] text-white bg-[#2E7D32] border-none rounded-xl cursor-pointer shadow-md h-[52px] text-[16px] font-bold m-0 px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="truncate">{loading ? t('logging_in', 'Logging in...') : t('continue_btn', 'Continue')}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-stretch mt-auto w-full pt-4 shrink-0 pb-1">
          <a href="tel:18001234567" className="flex flex-col items-center justify-center flex-1 min-w-0 text-center no-underline px-1">
            <div className="w-6.5 h-6.5 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-1.5 shadow-xs border border-[#2E7D32]/20 shrink-0">
              <Headphones className="w-3.5 h-3.5 text-[#1B5E20]" />
            </div>
            <span className="text-[10.5px] text-[#0A2E0D] font-extrabold mb-0.5 leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] break-words w-full">
              {t('need_help', 'Need Help?')}
            </span>
            <span className="text-[11px] font-black text-[#051F07] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">1800-123-4567</span>
          </a>
          <div className="w-px bg-gray-400/50 my-2 shrink-0" />
          <button className="flex flex-col items-center justify-center flex-1 min-w-0 text-center bg-transparent border-none cursor-pointer p-0 px-1">
            <div className="w-6.5 h-6.5 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-1.5 shadow-xs border border-[#2E7D32]/20 shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-[#1B5E20]" />
            </div>
            <span className="text-[10.5px] text-[#0A2E0D] font-extrabold mb-0.5 leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] break-words w-full">
              {t('listen_in', 'Listen in')}
            </span>
            <span className="text-[11px] font-black text-[#051F07] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] break-words w-full">
              {t('your_language', 'Your Language')}
            </span>
          </button>
          <div className="w-px bg-gray-400/50 my-2 shrink-0" />
          <button className="flex flex-col items-center justify-center flex-1 min-w-0 text-center bg-transparent border-none cursor-pointer p-0 px-1">
            <div className="w-6.5 h-6.5 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-1.5 shadow-xs border border-[#2E7D32]/20 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-[#1B5E20]" />
            </div>
            <span className="text-[10.5px] text-[#0A2E0D] font-extrabold mb-0.5 leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] break-words w-full">
              {t('learn_how_to_use', 'Learn How to Use')}
            </span>
            <span className="text-[11px] font-black text-[#051F07] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">AgriMitra AI</span>
          </button>
        </div>
      </div>
      {/* Invisible off-layout reCAPTCHA verifier fallback */}
      <div id="recaptcha-container" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} aria-hidden="true" />
    </div>
  );
};

export default Login;
