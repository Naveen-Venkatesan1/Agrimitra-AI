import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Bell, Cpu, Shield, Save, CheckCircle2, MapPin } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../data/indiaLocations';

export const Settings = () => {
  const { user, selectedState, selectedDistrict, setSelectedState, setSelectedDistrict, updateUserProfile } = useAppStore();
  const { t, currentLang, changeLanguage, languages } = useTranslation();
  const [notifications, setNotifications] = useState({
    sms: true,
    whatsapp: true,
    push: true,
    weatherAlerts: true,
    irrigationAlerts: true
  });
  const [saved, setSaved] = useState(false);

  const stateOptions = Object.keys(INDIA_LOCATIONS);
  const districtOptions = INDIA_LOCATIONS[selectedState] || [];

  const handleSave = () => {
    updateUserProfile({ state: selectedState, district: selectedDistrict });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div>
        <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Preferences</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('nav_settings', 'Settings')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Configure language, location defaults, notification channels & IoT device integrations</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Global Location Settings */}
      <Card hover={false} className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-agri-dark border-b pb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-agri-primary" /> Default Farm Location (Global State & District)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">State / Union Territory</label>
            <SearchableSelect
              value={selectedState}
              onChange={(st) => setSelectedState(st)}
              options={stateOptions}
              placeholder="Search State..."
              icon={MapPin}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">District</label>
            <SearchableSelect
              value={selectedDistrict}
              onChange={(ds) => setSelectedDistrict(ds)}
              options={districtOptions}
              placeholder="Search District..."
              icon={MapPin}
            />
          </div>
        </div>
      </Card>

      {/* Language Settings */}
      <Card hover={false} className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-agri-dark border-b pb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-agri-primary" /> Regional Language Preference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Application Language</label>
            <select
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-agri-primary"
            >
              {languages?.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName ? `${l.nativeName} (${l.name})` : l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Notification Channels */}
      <Card hover={false} className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-agri-dark border-b pb-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-agri-primary" /> Notification Channels
        </h3>
        <div className="space-y-3">
          {[
            { key: 'push', title: 'In-App Push Notifications', desc: 'Receive real-time alerts on your phone or web app' },
            { key: 'whatsapp', title: 'WhatsApp Farmer Advisory', desc: 'Receive daily disease reports & weather forecast on WhatsApp' },
            { key: 'sms', title: 'Critical SMS Alerts', desc: 'Receive high-priority pest & storm alerts via SMS (works offline)' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-agri-dark">{item.title}</p>
                <p className="text-[11px] text-gray-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                className="w-4 h-4 rounded text-agri-primary focus:ring-agri-primary border-gray-300"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} icon={Save}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default Settings;
