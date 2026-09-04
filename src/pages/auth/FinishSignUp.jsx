import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkIsEmailSignInLink, completeEmailSignInLink } from '../../config/firebase';
import { profileApi } from '../../services/api/profile';
import { useAppStore } from '../../store/useAppStore';
import { LogoIcon } from '../../components/ui/Logo';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const FinishSignUp = () => {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [needEmailPrompt, setNeedEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const processEmailSignIn = async (emailToUse) => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (!checkIsEmailSignInLink(window.location.href)) {
        setErrorMsg('Invalid or expired login link. Please request a new login link.');
        setLoading(false);
        return;
      }

      const { user, error } = await completeEmailSignInLink(emailToUse, window.location.href);

      if (error) {
        setErrorMsg(error || 'Sign in link completion failed. Please try again.');
        setLoading(false);
        return;
      }

      if (user) {
        setSuccessMsg('Authentication successful! Loading your AgriMitra profile...');
        
        // Fetch or create profile
        const res = await profileApi.getProfile(user.uid).catch(() => ({ profile: null }));
        const profile = (res && res.profile) || {};

        const userObj = {
          id: user.uid,
          name: user.displayName || emailToUse.split('@')[0] || 'Farmer User',
          email: user.email || emailToUse,
          avatar: user.photoURL || '',
          ...profile
        };

        setAuth(true, userObj);
        setLoading(false);

        const target = profile.onboardingCompleted ? '/dashboard' : '/onboarding';
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 1000);
      } else {
        setErrorMsg('Sign in link completion failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error("Finish sign up link completion error:", err);
      setErrorMsg(err.message || 'Failed to complete sign-in with email link.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let savedEmail = window.localStorage.getItem('emailForSignIn');
    if (!savedEmail) {
      // User opened link on a different device or cleared storage
      setNeedEmailPrompt(true);
      setLoading(false);
    } else {
      processEmailSignIn(savedEmail);
    }
  }, []);

  const handleManualEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setNeedEmailPrompt(false);
    processEmailSignIn(emailInput);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F1F5F1] p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-[#E3E9E3] rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <LogoIcon className="w-20 h-20" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#0F1F11]">
            Completing Email Login 🌿
          </h2>
          <p className="text-xs text-gray-500">
            AgriMitra AI Secure Passwordless Email Link Authentication
          </p>
        </div>

        {loading && (
          <div className="space-y-4 py-6">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-[#1B5E33] rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-[#1B5E33]">
              Verifying link and authenticating session...
            </p>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-xs text-left font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700 text-xs text-left font-medium">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sign-in Link Error</span>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {needEmailPrompt && (
          <form onSubmit={handleManualEmailSubmit} className="space-y-4 pt-2 text-left">
            <p className="text-xs font-semibold text-gray-700">
              You opened this link on a different browser or device. Please confirm your email address to complete sign-in:
            </p>
            <input
              type="email"
              placeholder="Enter your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B5E33]"
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-[#1B5E33] hover:bg-[#154f2a] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md"
            >
              Confirm Email & Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {errorMsg && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
          >
            Return to Login Page
          </button>
        )}
      </div>
    </div>
  );
};

export default FinishSignUp;
