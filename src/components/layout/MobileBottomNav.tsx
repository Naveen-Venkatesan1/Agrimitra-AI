import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sprout, ShoppingBag, Grid2X2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { t, currentLang, languageCode } = useTranslation();
  const isTamil = currentLang === 'ta' || languageCode === 'ta';
  const activeColor = '#0D5C2E';
  const inactiveColor = '#9CA3AF';

  const getLabelStyle = (isActive: boolean, isCenter: boolean = false): React.CSSProperties => {
    if (isTamil) {
      return {
        fontSize: 8.5,
        lineHeight: 1.25,
        marginTop: 1.5,
        marginBottom: 2.5,
        fontWeight: isActive ? 700 : (isCenter ? 600 : 500),
        color: isActive ? activeColor : inactiveColor,
        letterSpacing: '-0.01em',
      };
    }
    return {
      fontSize: 9.5,
      fontWeight: isActive ? 700 : (isCenter ? 600 : 500),
      color: isActive ? activeColor : inactiveColor,
    };
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 2px)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-end justify-around px-1 pt-1.5 pb-1">

        {/* 1. Dashboard */}
        <NavLink
          to="/dashboard"
          end
          className="flex flex-col items-center justify-center min-w-0"
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <>
              <Home
                style={{ width: 22, height: 22, color: isActive ? activeColor : inactiveColor }}
                strokeWidth={isActive ? 2.5 : 2}
                fill={isActive ? activeColor : 'none'}
              />
              <span
                className={`text-center whitespace-nowrap px-0.5 ${isTamil ? 'mt-0.5' : 'mt-1 leading-none'}`}
                style={getLabelStyle(isActive)}
              >
                {t('nav_dashboard', 'Dashboard')}
              </span>
            </>
          )}
        </NavLink>

        {/* 2. Crop */}
        <NavLink
          to="/crop-intelligence"
          className="flex flex-col items-center justify-center min-w-0"
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <>
              <Sprout
                style={{ width: 22, height: 22, color: isActive ? activeColor : inactiveColor }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-center whitespace-nowrap px-0.5 ${isTamil ? 'mt-0.5' : 'mt-1 leading-none'}`}
                style={getLabelStyle(isActive)}
              >
                {t('nav_crop', 'Crop')}
              </span>
            </>
          )}
        </NavLink>

        {/* 3. Farm AI — Center Elevated Green Mic Button */}
        <NavLink
          to="/ai-assistant"
          className="flex flex-col items-center justify-center min-w-0 relative"
          style={{ flex: 1, marginTop: -20 }}
        >
          {({ isActive }) => (
            <>
              <div
                className="flex items-center justify-center transition-transform active:scale-95"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: '#0D5C2E',
                  boxShadow: '0 4px 14px rgba(13,92,46,0.35)',
                  border: '3px solid white',
                }}
              >
                {/* Voice AI Microphone Icon */}
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <span
                className={`text-center whitespace-nowrap px-0.5 ${isTamil ? 'mt-0.5' : 'mt-1 leading-none'}`}
                style={getLabelStyle(isActive, true)}
              >
                {t('nav_farm_ai', 'Farm AI')}
              </span>
            </>
          )}
        </NavLink>

        {/* 4. Agri Prices */}
        <NavLink
          to="/market-intelligence"
          className="flex flex-col items-center justify-center min-w-0"
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <>
              <ShoppingBag
                style={{ width: 22, height: 22, color: isActive ? activeColor : inactiveColor }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-center whitespace-nowrap px-0.5 ${isTamil ? 'mt-0.5' : 'mt-1 leading-none'}`}
                style={getLabelStyle(isActive)}
              >
                {t('nav_agri_prices', 'Agri Prices')}
              </span>
            </>
          )}
        </NavLink>

        {/* 5. More */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center min-w-0"
          style={{ flex: 1 }}
          aria-label="More options"
        >
          <Grid2X2 style={{ width: 22, height: 22, color: inactiveColor }} strokeWidth={2} />
          <span
            className={`text-center whitespace-nowrap px-0.5 ${isTamil ? 'mt-0.5' : 'mt-1 leading-none'}`}
            style={getLabelStyle(false, false)}
          >
            {t('nav_more', 'More')}
          </span>
        </button>

      </div>
    </div>
  );
};

export default MobileBottomNav;
