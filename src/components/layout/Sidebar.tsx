import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Sprout,
  Bot,
  CloudSun,
  Droplets,
  Landmark,
  ShoppingBag,
  Bell,
  User,
  Settings,
  X
} from 'lucide-react';
import { LogoIcon } from '../ui/Logo';
import { useTranslation } from '../../hooks/useTranslation';

const navItems = [
  { key: 'nav_dashboard', defaultName: 'Dashboard', path: '/dashboard', icon: Home, exact: true },
  { key: 'nav_crop_intelligence', defaultName: 'Crop Intelligence', path: '/crop-intelligence', icon: Sprout, exact: false },
  { key: 'nav_farm_ai', defaultName: 'Farm AI', path: '/ai-assistant', icon: Bot, exact: false },
  { key: 'nav_weather', defaultName: 'Weather & Meteorology', path: '/weather', icon: CloudSun, exact: false },
  { key: 'nav_irrigation', defaultName: 'Smart Irrigation', path: '/irrigation', icon: Droplets, exact: false },
  { key: 'nav_govt_schemes', defaultName: 'Government Schemes', path: '/government-schemes', icon: Landmark, exact: false },
  { key: 'nav_agri_prices', defaultName: 'Agri Prices', path: '/market-intelligence', icon: ShoppingBag, exact: false },
  { key: 'alerts_notifications', defaultName: 'Alerts & Notifications', path: '/alerts', icon: Bell, exact: false },
  { key: 'nav_profile', defaultName: 'My Profile', path: '/profile', icon: User, exact: false },
  { key: 'nav_settings', defaultName: 'Settings', path: '/settings', icon: Settings, exact: false },
];


interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[280px] max-w-[85vw] bg-white border-r border-gray-100 flex flex-col justify-between p-4 shadow-xl transition-transform duration-200 ease-out will-change-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation drawer"
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header & Logo */}
          <div className="flex items-center justify-between px-1 py-2 mb-3 border-b border-gray-100/80 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <LogoIcon className="w-10 h-10 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline tracking-tight font-extrabold text-base leading-none">
                  <span className="text-agri-dark">AGRIMITRA&nbsp;</span>
                  <span className="text-[#10B981]">AI</span>
                </div>
                <span className="text-[10px] font-medium tracking-wide mt-1 text-gray-500 truncate">
                  Smart Farming. Better Tomorrow
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="p-1.5 -mr-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition active:scale-95 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold tracking-tight transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0B4D2F] text-white shadow-sm font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-150 ${
                          isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                        }`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span className="flex-1 text-left leading-snug break-words">
                        {t(item.key, item.defaultName)}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
