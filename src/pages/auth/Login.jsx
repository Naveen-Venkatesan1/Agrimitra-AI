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
} from 'lucide-react';
import { Logo, LogoIcon } from '../../components/ui/Logo';
import { useAppStore } from '../../store/useAppStore';
import { loginWithGoogle, checkGoogleRedirectResult } from '../../config/firebase';
import { useTranslation } from '../../hooks/useTranslation';
import { authApi } from '../../services/api';

/* ─────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    Icon: Sprout,
    titleKey: 'feature_crop_intel_title',
    defaultTitle: 'AI Crop Intelligence',
    descKey: 'feature_crop_intel_desc',
    defaultDesc: 'Detect diseases, monitor health, and get smart recommendations',
  },
  {
    Icon: CloudSun,
    titleKey: 'feature_weather_title',
    defaultTitle: 'Weather & Alerts',
    descKey: 'feature_weather_desc',
    defaultDesc: 'Real-time weather updates and smart alerts',
  },
];

/* ─────────────────────────────────────────────────────────── */
export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();
  const { currentLang, changeLanguage, t, languages } = useTranslation();

  const [activeTab, setActiveTab]       = useState('mobile');
  const [phoneNumber, setPhoneNumber]   = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [loading, setLoading]           = useState(false);
  const [authError, setAuthError]       = useState('');
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [otpSent, setOtpSent]           = useState(false);
  const [otpCode, setOtpCode]           = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const { user, error } = await checkGoogleRedirectResult();
        if (error) {
          setAuthError(`Google Sign-In failed: ${error}`);
        } else if (user && user.email) {
          setLoading(true);
          const { profileApi } = await import('../../services/api/profile');
          const res = await profileApi.getProfile(user.uid).catch(() => ({ profile: null }));
          const profile = (res && res.profile) || {};
          setAuth(true, {
            id: user.uid,
            name: user.displayName || user.email.split('@')[0] || 'Farmer User',
            email: user.email,
            avatar: user.photoURL || '',
            ...profile
          });
          setLoading(false);
          const target = profile.onboardingCompleted ? '/dashboard' : '/onboarding';
          navigate(target, { replace: true });
        }
      } catch (e) {
        console.warn("Error handling Google redirect result:", e);
      }
    };
    handleRedirectResult();
  }, [setAuth, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    if ((activeTab === 'email' && email) || (activeTab === 'mobile' && phoneNumber)) {
      try {
        const targetEmail = email || `${phoneNumber.replace(/\D/g, '')}@agrimitra.ai`;
        const res = await authApi.login({ email: targetEmail, password });
        
        if (!res.success) {
          setAuthError(res.error || 'Login failed. Please check your credentials or create an account.');
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
        setAuthError('Authentication service unavailable. Please try again later.');
        setLoading(false);
        return;
      }
    } else {
      setAuthError('Please enter your email or mobile number.');
      setLoading(false);
      return;
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError('');

    try {
      const { user, error, code } = await loginWithGoogle();
      
      if (code === 'redirecting') {
        return;
      }

      if (error) {
        const errStr = (error || '').toString();
        const errCode = code || '';
        const isUnauthorized = errCode === 'auth/unauthorized-domain' || errStr.includes('unauthorized-domain');

        if (isUnauthorized) {
          const currentHostname = window.location.hostname;
          setAuthError(`Google Sign-In domain unauthorized ("${currentHostname}"). Please add "${currentHostname}" to Authorized Domains in Firebase Console.`);
          setLoading(false);
          return;
        } else if (errCode === 'auth/popup-closed-by-user' || errStr.includes('popup-closed-by-user')) {
          setAuthError('Google Sign-In popup was closed. Click Google again to retry.');
          setLoading(false);
          return;
        } else {
          setAuthError(`Google Sign-In failed: ${error}`);
          setLoading(false);
          return;
        }
      }

      if (user && user.email) {
        const { profileApi } = await import('../../services/api/profile');
        const res = await profileApi.getProfile(user.uid).catch(() => ({ profile: null }));
        const profile = (res && res.profile) || {};

        setAuth(true, {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0] || 'Farmer User',
          email: user.email,
          avatar: user.photoURL || '',
          ...profile
        });
        setLoading(false);
        const target = profile.onboardingCompleted ? '/dashboard' : '/onboarding';
        navigate(target, { replace: true });
        return;
      }
    } catch (err) {
      console.warn("Google Auth popup exception:", err);
      setAuthError('An unexpected error occurred during Google Sign-In.');
      setLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address to receive a login link.');
      return;
    }
    setLoading(true);
    setAuthError('');
    setEmailLinkSent(false);

    try {
      const res = await authApi.sendEmailSignInLink(email);
      setLoading(false);
      if (!res.success) {
        setAuthError(res.error || 'Failed to send email login link. Please try again.');
      } else {
        setEmailLinkSent(true);
      }
    } catch (err) {
      console.warn("Send email link error:", err);
      setAuthError(err.message || 'Failed to send email sign-in link.');
      setLoading(false);
    }
  };

  const handleSendPhoneOTP = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number for OTP login.');
      return;
    }
    setLoading(true);
    setAuthError('');

    try {
      const res = await authApi.sendPhoneOTP(phoneNumber, 'recaptcha-container');
      setLoading(false);
      if (res.error) {
        setAuthError(res.error || 'Failed to send OTP to mobile number. Please check format.');
      } else {
        setConfirmationResult(res.confirmationResult);
        setOtpSent(true);
      }
    } catch (err) {
      console.warn("Send phone OTP error:", err);
      setAuthError(err.message || 'Failed to send phone OTP.');
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setAuthError('Please enter the 6-digit OTP code received on your mobile phone.');
      return;
    }
    setLoading(true);
    setAuthError('');

    try {
      const res = await authApi.verifyPhoneOTP(confirmationResult, otpCode);
      if (res.error) {
        setAuthError(res.error || 'Invalid or expired OTP code. Please try again.');
        setLoading(false);
        return;
      }

      if (res.user) {
        const { profileApi } = await import('../../services/api/profile');
        const pRes = await profileApi.getProfile(res.user.uid).catch(() => ({ profile: null }));
        const profile = (pRes && pRes.profile) || {};

        setAuth(true, {
          id: res.user.uid,
          name: res.user.displayName || phoneNumber || 'Farmer User',
          phone: res.user.phoneNumber || phoneNumber,
          ...profile
        });
        setLoading(false);
        const target = profile.onboardingCompleted ? '/dashboard' : '/onboarding';
        navigate(target, { replace: true });
        return;
      }
    } catch (err) {
      console.warn("Verify phone OTP error:", err);
      setAuthError(err.message || 'Failed to verify phone OTP code.');
      setLoading(false);
    }
  };

  const quickLogin = () => { 
    if (activeTab === 'mobile' || !phoneNumber) {
      handleSendPhoneOTP();
    } else {
      setAuthError('This login method is currently unavailable. Please use Email or Google Sign-In.');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — full-bleed hero with dark-green overlay
      ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:block lg:w-[52%] relative min-h-screen overflow-hidden flex-shrink-0">

        {/* ── Hero image: farmer from behind, turban, tablet, drone overhead, green paddy fields
              Multiple URLs tried in priority order via onError fallback chain ── */}
        <img
          id="hero-img"
          src="/login-page.jpg"
          alt={t('login_bg_alt', 'Smart Farming Login Background')}
          className="absolute inset-0 w-[200%] h-full max-w-none object-cover object-left"
        />

        {/* Gradient Overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F1F11]/95 via-[#0F1F11]/70 to-transparent z-0" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 pt-12 pb-12">
          {/* Logo */}
          <div className="mb-[6vh]">
            <Logo variant="full" light={true} className="text-white" />
          </div>

          <div className="max-w-md mt-6">
            <h1 className="text-[40px] font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
              {t('hero_title_1', 'AI-Powered Intelligence')} <br/>
              <span className="text-[#68D391]">{t('hero_title_2', 'for a Smarter Tomorrow')}</span>
            </h1>
            <p className="text-[15px] text-emerald-100/90 mb-10 leading-[1.6]">
              {t('hero_subtitle', 'Empowering farmers with AI-driven insights, real-time data, and smart solutions for higher yield and sustainable farming.')}
            </p>

            {/* Features List */}
            <div className="space-y-6">
              {FEATURES.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="p-3 bg-[#112616] rounded-xl border border-emerald-500/20">
                    <feature.Icon className="w-[22px] h-[22px] text-[#68D391]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {t(feature.titleKey, feature.defaultTitle)}
                    </h3>
                    <p className="text-sm text-emerald-100/70 leading-relaxed">
                      {t(feature.descKey, feature.defaultDesc)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — light gray bg with centered login card
      ══════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{ backgroundColor: '#F1F5F1' }}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-end gap-2.5 px-10 pt-5 pb-2 flex-shrink-0">
          {/* Language */}
          <div
            className="flex items-center gap-1.5 cursor-pointer select-none transition-colors"
            style={{
              padding: '6px 12px',
              background: '#fff',
              border: '1px solid #E0E5E0',
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F7FAF7')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <Globe style={{ width: 14, height: 14, color: '#6B7280' }} />
            <select
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer appearance-none"
              style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}
            >
              {languages?.map((l) => (
                <option key={l.code} value={l.code}>{l.label || l.name}</option>
              ))}
            </select>
            <ChevronDown style={{ width: 12, height: 12, color: '#9CA3AF' }} />
          </div>

          {/* Need Help? */}
          <a
            href="tel:18001801551"
            className="flex items-center gap-1.5 no-underline transition-colors"
            style={{
              padding: '6px 14px',
              background: '#EEF7EE',
              border: '1px solid #C3DFC4',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1B5E33',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#DFF0DF')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#EEF7EE')}
          >
            <Headphones style={{ width: 14, height: 14 }} />
            <span>{t('need_help', 'Need Help?')}</span>
          </a>
        </div>

        {/* CENTER AREA */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full" style={{ maxWidth: 434 }}>

            {/* ══ LOGIN CARD ══ */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E3E9E3',
                borderRadius: 20,
                boxShadow: '0 8px 48px rgba(0,0,0,0.09)',
                padding: '38px 38px 34px',
              }}
            >
              {/* Logo avatar */}
              <div className="flex justify-center" style={{ marginBottom: 16 }}>
                <LogoIcon className="w-24 h-24" />
              </div>

              {/* Heading */}
              <div className="text-center" style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F1F11', letterSpacing: '-0.3px', margin: 0 }}>
                  {t('welcome_back_title', 'Welcome Back! 🌿')}
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 1.55, margin: '6px 0 0' }}>
                  {t('login_subtitle_1', 'Login to your AGRIMITRA AI account')}<br />
                  {t('login_subtitle_2', 'and continue your smart farming journey')}
                </p>
              </div>

              {/* ── TABS — underline style ── */}
              <div
                className="flex"
                style={{ borderBottom: '1.5px solid #E5E7EB', marginBottom: 20 }}
              >
                {['mobile', 'email'].map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      style={{
                        flex: 1,
                        paddingBottom: 10,
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 500,
                        color: active ? '#1B5E33' : '#9CA3AF',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: active ? '2.5px solid #1B5E33' : '2.5px solid transparent',
                        marginBottom: -1.5,
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                      }}
                    >
                      {tab === 'mobile' ? t('mobile_number', 'Mobile Number') : t('email', 'Email')}
                    </button>
                  );
                })}
              </div>

              {/* Invisible Recaptcha Container */}
              <div id="recaptcha-container"></div>

              {/* Email Link Sent Banner */}
              {emailLinkSent && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#065F46', fontWeight: 600, margin: 0 }}>
                    ✓ Passwordless login link sent to <strong>{email}</strong>! Please check your inbox and click the link to log in.
                  </p>
                </div>
              )}

              {/* ── FORM ── */}
              {otpSent ? (
                /* OTP Verification Form */
                <form onSubmit={handleVerifyPhoneOTP} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                      Enter 6-digit OTP code sent to <strong>+91 {phoneNumber}</strong>:
                    </p>
                  </div>
                  <div
                    className="flex items-center overflow-hidden"
                    style={{ border: '1.5px solid #D1D5DB', borderRadius: 12, background: '#F9FAFB' }}
                  >
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        flex: 1,
                        padding: '11px 14px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 14,
                        letterSpacing: '2px',
                        fontWeight: 700,
                        color: '#111827',
                        textAlign: 'center'
                      }}
                      required
                    />
                  </div>

                  {authError && (
                    <p style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 500 }}>{authError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full transition-all"
                    style={{
                      marginTop: 4,
                      padding: '12.5px 0',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      background: '#1B5E33',
                      border: 'none',
                      borderRadius: 12,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 14px rgba(27,94,51,0.32)',
                    }}
                  >
                    {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); setAuthError(''); }}
                    style={{ background: 'none', border: 'none', color: '#1B5E33', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
                  >
                    Change Mobile Number / Resend OTP
                  </button>
                </form>
              ) : (
                /* Standard Form with Email Link Option */
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

                  {/* Mobile / Email Input */}
                  {activeTab === 'mobile' ? (
                    <div
                      className="flex items-center overflow-hidden"
                      style={{ border: '1.5px solid #D1D5DB', borderRadius: 12, background: '#F9FAFB' }}
                    >
                      {/* Country code */}
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        style={{
                          padding: '10px 11px',
                          borderRight: '1.5px solid #D1D5DB',
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>🇮🇳</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginLeft: 3 }}>+91</span>
                        <ChevronDown style={{ width: 11, height: 11, color: '#9CA3AF', marginLeft: 2 }} />
                      </div>
                      <input
                        type="tel"
                        placeholder={t('enter_mobile', 'Enter your mobile number')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 13px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 13.5,
                          color: '#111827',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center overflow-hidden"
                      style={{ border: '1.5px solid #D1D5DB', borderRadius: 12, background: '#F9FAFB' }}
                    >
                      <input
                        type="email"
                        placeholder={t('enter_email', 'Enter your email address')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 13.5,
                          color: '#111827',
                        }}
                      />
                    </div>
                  )}

                  {/* Password Input */}
                  <div
                    className="flex items-center overflow-hidden"
                    style={{ border: '1.5px solid #D1D5DB', borderRadius: 12, background: '#F9FAFB' }}
                  >
                    <div className="flex items-center justify-center flex-shrink-0" style={{ padding: '0 12px' }}>
                      <Lock style={{ width: 16, height: 16, color: '#9CA3AF' }} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('enter_password', 'Enter your password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13.5,
                        color: '#111827',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        padding: '0 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {showPassword ? <Eye style={{ width: 17, height: 17 }} /> : <EyeOff style={{ width: 17, height: 17 }} />}
                    </button>
                  </div>

                  {/* Remember me + Forgot password */}
                  <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
                    <label className="flex items-center gap-2 cursor-pointer" style={{ userSelect: 'none' }}>
                      <div
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: rememberMe ? '#2E7D32' : '#fff',
                          border: rememberMe ? '1.5px solid #2E7D32' : '1.5px solid #D1D5DB',
                        }}
                      >
                        {rememberMe && <Check style={{ width: 10, height: 10, color: '#fff', strokeWidth: 3.5 }} />}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: '#4B5563' }}>{t('remember_me', 'Remember me')}</span>
                    </label>
                    <a
                      href="#forgot"
                      style={{ fontSize: 12.5, fontWeight: 600, color: '#1B5E33', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {t('forgot_password', 'Forgot Password?')}
                    </a>
                  </div>

                  {/* Error */}
                  {authError && (
                    <p style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 500 }}>{authError}</p>
                  )}

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full transition-all"
                    style={{
                      marginTop: 4,
                      padding: '12.5px 0',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      background: '#1B5E33',
                      border: 'none',
                      borderRadius: 12,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 14px rgba(27,94,51,0.32)',
                      letterSpacing: '0.1px',
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#154f2a'; }}
                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#1B5E33'; }}
                  >
                    {loading ? (
                      <>
                        <span
                          className="animate-spin rounded-full"
                          style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block' }}
                        />
                        <span>{t('logging_in', 'Logging in...')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('login_button', 'Login')}</span>
                        <ArrowRight style={{ width: 17, height: 17 }} />
                      </>
                    )}
                  </button>

                  {/* Send Email Link Secondary Option */}
                  {activeTab === 'email' && (
                    <button
                      type="button"
                      onClick={handleSendEmailLink}
                      disabled={loading}
                      style={{
                        background: '#EEF7EE',
                        border: '1px solid #C3DFC4',
                        color: '#1B5E33',
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: '9px 0',
                        borderRadius: 12,
                        cursor: 'pointer',
                        marginTop: 4,
                        transition: 'all 0.2s'
                      }}
                    >
                      Send Passwordless Login Link to Email
                    </button>
                  )}
                </form>
              )}

              {/* DIVIDER */}
              <div className="flex items-center gap-3" style={{ margin: '18px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {t('or_continue_with', 'or continue with')}
                </span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              {/* SOCIAL BUTTONS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    padding: '9px 6px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 12,
                    background: '#fff',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <svg style={{ width: 15, height: 15, flexShrink: 0 }} viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{t('login_google', 'Google')}</span>
                </button>

                {/* OTP */}
                <button
                  type="button"
                  onClick={quickLogin}
                  className="flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    padding: '9px 6px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 12,
                    background: '#fff',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <Phone style={{ width: 15, height: 15, flexShrink: 0, color: '#374151' }} />
                  <span>{t('login_otp', 'Login with OTP')}</span>
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={quickLogin}
                  className="flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    padding: '9px 6px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 12,
                    background: '#fff',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <svg style={{ width: 15, height: 15, flexShrink: 0, fill: '#1F2937' }} viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.07.08 2.15-.57 2.81-1.37z" />
                  </svg>
                  <span>{t('login_apple', 'Apple')}</span>
                </button>
              </div>

              {/* CREATE ACCOUNT */}
              <p className="text-center" style={{ fontSize: 13, color: '#4B5563', margin: '18px 0 0 0' }}>
                {t('new_to_agrimitra', 'New to AGRIMITRA AI? ')}
                <Link
                  to="/signup"
                  style={{ color: '#1B5E33', fontWeight: 700, textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {t('create_account', 'Create Account')}
                </Link>
              </p>
            </div>
            {/* ══ END CARD ══ */}

            {/* SECURITY BADGE */}
            <div className="text-center" style={{ marginTop: 18 }}>
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck style={{ width: 15, height: 15, color: '#2E7D32' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4B5563' }}>
                  {t('data_safe', 'Your data is safe and secure with us.')}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 3 }}>
                {t('respect_privacy', 'We respect your privacy and protect your information.')}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
