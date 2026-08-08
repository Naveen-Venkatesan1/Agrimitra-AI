import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { useTranslation } from '../../hooks/useTranslation';
import { authApi } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

export const Signup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAuth } = useAppStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const targetEmail = email || `${fullName.toLowerCase().replace(/\s+/g, '')}@agrimitra.ai`;
    const res = await authApi.signUp({ email: targetEmail, password, farmerName: fullName });

    if (res.success) {
      setAuth(true, { 
        name: fullName, 
        email: targetEmail,
        onboardingCompleted: false // New signups always need onboarding
      });
      setLoading(false);
      // Router handles navigation to /onboarding
    } else {
      setErrorMsg(res.error || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F9F7] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <Logo variant="full" className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-agri-dark">{t('signup_title')} 🌱</h2>
          <p className="text-xs text-gray-500 mt-1">{t('signup_subtitle')}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('full_name')}</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('full_name')}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@agrimitra.ai"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agri-primary hover:bg-agri-dark text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? t('loading') : t('register_btn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600">
          <span>{t('already_have_account')} </span>
          <Link to="/login" className="font-bold text-agri-primary hover:underline">
            {t('login_here')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
