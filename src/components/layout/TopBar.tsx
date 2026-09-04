import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Globe, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../ui/Modal';

import Avatar from '../ui/Avatar';

interface TopBarProps {
  onMenuClick: () => void;
  isCoreTab?: boolean;
}

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ta: 'தமிழ்',
  en: 'English',
  te: 'తెలుగు',
  ml: 'മലയാളം',
  hi: 'हिन्दी'
};

const getLanguageDisplayName = (codeOrName: string): string => {
  if (!codeOrName) return 'English';
  const val = String(codeOrName).toLowerCase().trim();
  if (val === 'ta' || val === 'tamil') return 'தமிழ்';
  if (val === 'en' || val === 'english') return 'English';
  if (val === 'te' || val === 'telugu') return 'తెలుగు';
  if (val === 'ml' || val === 'malayalam') return 'മലയാളം';
  if (val === 'hi' || val === 'hindi') return 'हिन्दी';
  return LANGUAGE_DISPLAY_NAMES[val] || codeOrName;
};

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, isCoreTab }) => {
  const { user, alerts, selectedState, selectedDistrict, logoutAppStore } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang, changeLanguage, languages, t } = useTranslation();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = alerts?.filter((a: any) => a.unread)?.length || 0;
  const isDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // On dashboard: transparent overlay so hero banner is seamless
  // On other pages: standard white sticky header
  if (isDashboard) {
    return (
      <>
        {/* Language Selection Modal */}
        <Modal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} title="Select Language">
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {languages?.map((l: any) => (
                <button
                  key={l.code}
                  onClick={() => {
                    changeLanguage(l.code);
                    setIsLanguageModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                    currentLang === l.code
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {l.nativeName ? `${l.nativeName} (${l.name})` : l.name}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <header className="w-full min-w-full relative sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3.5 h-[56px] flex items-center justify-between shadow-sm shrink-0 select-none">

        {/* Left: Menu */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition active:scale-95"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-gray-800" />
          </button>
        </div>

        {/* Center/Left: AgriMitra AI Brand Text */}
        <div className="absolute left-[28%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none z-10 whitespace-nowrap">
          <span className="text-[20px] font-extrabold text-[#0D5C2E] tracking-tight">AgriMitra</span>
          <span className="text-[20px] font-extrabold text-[#10B981] ml-1">AI</span>
        </div>

        {/* Right: Notifications + Language + Green NM Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/alerts')}
            className="relative p-2 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-100 transition active:scale-95"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4 text-gray-800" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsLanguageModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition active:scale-95 text-gray-800 font-bold text-[11.5px] shrink-0"
            aria-label="Change Language"
          >
            <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span className="whitespace-nowrap leading-none tracking-normal">
              {getLanguageDisplayName(currentLang)}
            </span>
            <span className="text-[8.5px] text-gray-400 shrink-0 select-none">▼</span>
          </button>

          {/* Profile Avatar with Account Dropdown Menu */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-[#0D5C2E] text-white text-xs font-extrabold flex items-center justify-center shadow-xs hover:bg-[#094220] transition active:scale-95 cursor-pointer ml-1 overflow-hidden"
              aria-label="Account Options Menu"
            >
              <Avatar user={user} className="w-full h-full text-xs font-extrabold" />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="pb-2.5 mb-2 border-b border-gray-100 px-1">
                  <p className="text-[13px] font-bold text-gray-900 truncate capitalize">
                    {user?.name || user?.displayName || t('default_farmer_name', 'Farmer')}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {user?.email || t('no_email_provided', 'No email provided')}
                  </p>
                  <p className="text-[11px] text-[#0D5C2E] font-semibold truncate mt-1">
                    Location: {user?.district || selectedDistrict}, {user?.state || selectedState}
                  </p>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{t('nav_profile', 'My Profile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span>{t('nav_settings', 'Settings')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/alerts');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-[#0D5C2E] transition active:scale-98 text-left cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>{t('alerts_notifications', 'Notifications')}</span>
                  </button>

                  <div className="pt-1 my-1 border-t border-gray-100" />

                  <button
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logoutAppStore();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-red-600 hover:bg-red-50 transition active:scale-98 text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>{t('logout', 'Log Out')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Language Selection Modal */}
      <Modal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} title="Select Language">
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {languages?.map((l: any) => (
              <button
                key={l.code}
                onClick={() => {
                  changeLanguage(l.code);
                  setIsLanguageModalOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                  currentLang === l.code
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.nativeName ? `${l.nativeName} (${l.name})` : l.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TopBar;
