import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Sprout,
  Bot,
  CloudSun,
  Droplets,
  Layers,
  BarChart3,
  Landmark,
  ShoppingBag,
  Users,
  MapPin,
  Bell,
  User,
  Settings,
  ChevronRight,
  LogOut,
  X
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

const navItems = [
  { key: 'nav_dashboard', defaultName: 'Dashboard', path: '/dashboard', icon: Home, exact: true },
  { key: 'nav_crop_intelligence', defaultName: 'Crop Intelligence', path: '/crop-intelligence', icon: Sprout, exact: false },
  { key: 'ask_ai_assistant', defaultName: 'AI Assistant', path: '/ai-assistant', icon: Bot, exact: false },
  { key: 'nav_weather', defaultName: 'Weather', path: '/weather', icon: CloudSun, exact: false },
  { key: 'nav_irrigation', defaultName: 'Smart Irrigation', path: '/irrigation', icon: Droplets, exact: false },
  { key: 'nav_analytics', defaultName: 'Analytics Hub', path: '/analytics', icon: BarChart3, exact: false },
  { key: 'nav_government_schemes', defaultName: 'Government Schemes', path: '/government-schemes', icon: Landmark, exact: false },
  { key: 'alerts_notifications', defaultName: 'Alerts & Notifications', path: '/alerts', icon: Bell, exact: false },
  { key: 'nav_profile', defaultName: 'My Profile', path: '/profile', icon: User, exact: false },
  { key: 'nav_settings', defaultName: 'Settings', path: '/settings', icon: Settings, exact: false },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logoutAppStore } = useAppStore();
  
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleLogout = async () => {
    await logoutAppStore();
  };
  
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-white border-r border-gray-100 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header & Logo */}
          <div className="flex items-center justify-between px-2 py-3 mb-4">
            <Logo variant="full" />
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1.5 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold tracking-tight transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0B4D2F] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon 
                        className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 ${
                          isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-800'
                        }`} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span className="truncate">{t(item.key, item.defaultName)}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="space-y-4 pt-4 mt-2">
          {/* User Profile Footer */}
          <div className="relative" ref={profileMenuRef}>
            <div 
              onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen((prev) => !prev); }}
              className="flex items-center justify-between p-2.5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar user={user} className="w-9 h-9 rounded-full" />
                <div className="overflow-hidden">
                  <p className="text-[12px] font-bold text-gray-900 truncate">{user?.name || t('default_farmer_name', 'Farmer')}</p>
                  <p className="text-[10px] text-[#0B4D2F] font-semibold truncate">{user?.isPremium ? t('premium_farmer', 'Premium Farmer') : t('standard_farmer', 'Standard Farmer')}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-90' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-[999]">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{user?.name || t('default_farmer_name', 'Farmer')}</p>
                  <p className="text-[12px] text-gray-500 truncate mt-0.5">{user?.email || 'No email provided'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/profile');
                      if (onClose) onClose();
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-emerald-600 flex items-center gap-3 transition-colors"
                  >
                    <User className="w-4 h-4" /> {t('nav_profile', 'Profile')}
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/settings');
                      if (onClose) onClose();
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-emerald-600 flex items-center gap-3 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> {t('nav_settings', 'Settings')}
                  </button>
                </div>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsProfileMenuOpen(false);
                    await logoutAppStore();
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> {t('logout', 'Logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
