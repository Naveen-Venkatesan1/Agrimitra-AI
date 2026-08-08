import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Hide BackButton on Home / Dashboard page and Auth routes
  const isHomePage = location.pathname === '/' || location.pathname === '/dashboard';
  const isAuthPage = ['/login', '/signup', '/onboarding'].includes(location.pathname);

  // Keyboard Navigation Listener (Alt + LeftArrow for Win/Linux, Cmd + [ for macOS)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isHomePage || isAuthPage) return;

      const isAltLeft = e.altKey && e.key === 'ArrowLeft';
      const isCmdBracket = (e.metaKey || e.ctrlKey) && e.key === '[';

      if (isAltLeft || isCmdBracket) {
        e.preventDefault();
        handleNavigateBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, isHomePage, isAuthPage]);

  const handleNavigateBack = () => {
    // Check if there is navigation history in the current session
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  if (isHomePage || isAuthPage) {
    return null;
  }

  return (
    <div className="relative z-10 py-2 mb-4 border-b border-gray-200/60 flex items-center justify-between">
      <button
        onClick={handleNavigateBack}
        aria-label={t('back') || 'Go back to previous page'}
        tabIndex={0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm hover:bg-agri-primary hover:text-white hover:border-agri-primary active:scale-95 focus:outline-none focus:ring-2 focus:ring-agri-primary/30 transition-all duration-200 shadow-xs cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 text-agri-primary group-hover:text-white transition-transform group-hover:-translate-x-1 duration-200" />
        <span>{t('back') || 'Back'}</span>
      </button>

      <span className="text-[10px] text-gray-400 font-semibold hidden sm:inline-block">
        Shortcut: <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-mono text-gray-600">Alt + ←</kbd>
      </span>
    </div>
  );
};

export default BackButton;
