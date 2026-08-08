import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Globe, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../hooks/useTranslation';

interface TopBarProps {
  onMenuClick: () => void;
}
const SEARCH_DIRECTORY = [
  { keywords: ['dashboard', 'home', 'overview'], route: '/dashboard', label: 'Dashboard' },
  { keywords: ['paddy', 'rice', 'wheat', 'crop', 'padi', 'maize', 'cotton'], route: '/crop-intelligence', label: 'Crop Intelligence' },
  { keywords: ['disease', 'brown spot', 'leaf blast', 'blight', 'pest', 'insect'], route: '/crop-intelligence', label: 'Disease Analysis' },
  { keywords: ['irrigation', 'water', 'pump', 'moisture', 'smart irrigation'], route: '/irrigation', label: 'Smart Irrigation' },
  { keywords: ['weather', 'rain', 'temperature', 'forecast', 'meteorology', 'climate'], route: '/weather', label: 'Weather & Meteorology' },
  { keywords: ['pm kisan', 'subsidy', 'scheme', 'government', 'kcc', 'loan', 'pmfby'], route: '/government-schemes', label: 'Government Schemes' },
  { keywords: ['analytics', 'hub', 'data', 'statistics'], route: '/analytics', label: 'Analytics Hub' },
  { keywords: ['financial', 'economics', 'profit', 'cost', 'revenue'], route: '/analytics/financial', label: 'Financial Economics' },
  { keywords: ['soil', 'nutrient', 'ph', 'carbon', 'map'], route: '/analytics/soil-nutrients', label: 'Soil Nutrients' },
  { keywords: ['ai', 'assistant', 'chat', 'help', 'bot'], route: '/ai-assistant', label: 'AI Assistant' },
  { keywords: ['profile', 'account', 'user'], route: '/profile', label: 'My Profile' },
  { keywords: ['settings', 'preferences', 'language'], route: '/settings', label: 'Settings' },
  { keywords: ['alerts', 'notifications', 'warning'], route: '/alerts', label: 'Alerts & Notifications' }
];

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, alerts, logoutAppStore, selectedState, selectedDistrict } = useAppStore();
  const navigate = useNavigate();
  const { currentLang, changeLanguage, languages, t } = useTranslation();
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResults = searchQuery.trim() 
    ? SEARCH_DIRECTORY.filter(item => 
        item.keywords.some(kw => kw.includes(searchQuery.toLowerCase().trim())) ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  const handleSearchNavigate = (route: string) => {
    navigate(route);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredResults.length > 0) {
      handleSearchNavigate(filteredResults[0].route);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 py-2.5">
      <div className="app-container flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button & Search Bar */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Box - matching reference: rounded-lg, search icon on right */}
          <div className="relative max-w-[400px] w-full hidden sm:block" ref={searchContainerRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("search_placeholder", "Search crops, diseases, solutions...")}
              className="w-full pl-4 pr-10 py-2 bg-[#F9FAFB] border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>

            {/* Dropdown Results */}
            {isSearchOpen && searchQuery.trim() !== '' && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                {filteredResults.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchNavigate(result.route)}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition"
                      >
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{result.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-500 text-center bg-gray-50/50">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Controls: Language + Notifications + Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Language Selector */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 transition relative">
            <Globe className="w-4 h-4 text-gray-700" />
            <select
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer appearance-none text-[12px] font-bold text-gray-700 pr-4"
            >
              {languages?.map((l: any) => (
                <option key={l.code} value={l.code}>{l.name || l.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none" />
          </div>

          {/* Notifications */}
          <button onClick={() => navigate('/alerts')} className="relative p-2 text-gray-500 hover:text-gray-900 transition">
            <Bell className="w-[18px] h-[18px]" strokeWidth={2.5} />
            {(() => {
              const filteredAlerts = alerts?.filter((alert: any) => 
                !alert.title.toLowerCase().includes('pest') && 
                !alert.title.toLowerCase().includes('borer') && 
                !alert.title.toLowerCase().includes('outbreak') && 
                alert.category !== 'pest' && 
                alert.category !== 'pest-lifecycle'
              );
              const unreadCount = filteredAlerts?.filter((a: any) => a.unread).length || 0;
              return unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-[14px] h-[14px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              );
            })()}
          </button>

          <div className="w-px h-8 bg-gray-200 mx-0.5 hidden sm:block"></div>

          {/* User Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsProfileMenuOpen((prev) => !prev); 
              }} 
              className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition text-left focus:outline-none"
            >
              <Avatar 
                user={user} 
                className="w-8 h-8 rounded-full"
              />
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-bold text-gray-900 leading-none">{user?.name || 'Demo User'}</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-none font-medium">{selectedDistrict}, {selectedState}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 hidden sm:block transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                <div 
                  onClick={() => { setIsProfileMenuOpen(false); navigate('/settings'); }}
                  className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                >
                  <p className="text-xs font-bold text-gray-900">{user?.name || 'Demo User'}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email || 'farmer@agrimitra.ai'}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1 hover:underline">Location: {selectedDistrict}, {selectedState} ⚙️</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation();
                      setIsProfileMenuOpen(false); 
                      navigate('/profile'); 
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation();
                      setIsProfileMenuOpen(false); 
                      navigate('/settings'); 
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings & Location</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={async (e) => { 
                      e.stopPropagation();
                      setIsProfileMenuOpen(false); 
                      await logoutAppStore(); 
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default TopBar;
