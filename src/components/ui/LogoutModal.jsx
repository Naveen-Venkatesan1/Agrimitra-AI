import React, { useState } from 'react';
import { LogOut, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { logoutFirebase } from '../../config/firebase';

export const LogoutModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logoutAppStore } = useAppStore();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // 1. Firebase auth sign out
      await logoutFirebase();

      sessionStorage.clear();

      if (logoutAppStore) logoutAppStore();

      // Show Toast Notification before redirecting
      setToastMessage({
        type: 'success',
        text: t('logout_success_toast') || 'You have been logged out successfully.'
      });

      setTimeout(() => {
        onClose();
        navigate('/login', { replace: true });
      }, 600);
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
      setToastMessage({
        type: 'error',
        text: t('logout_error_toast') || 'Unable to log out. Please try again.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Container */}
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 overflow-hidden transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
            <LogOut className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            disabled={loggingOut}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 id="logout-title" className="text-lg font-black text-agri-dark dark:text-white">
            {t('logout_confirm_title') || 'Logout Confirmation'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
            {t('logout_confirm_message') || 'Are you sure you want to log out?'}
          </p>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={loggingOut}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            {t('logout_cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Logging out...' : (t('logout') || 'Logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
