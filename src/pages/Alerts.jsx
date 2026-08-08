import React, { useState } from 'react';
import { Bell, Check, Trash2, AlertTriangle, CloudRain, Droplets, Bug, Sprout, ShieldAlert } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

export const Alerts = () => {
  const { alerts, markAlertRead, clearAllAlerts } = useAppStore();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts
    .filter(a => 
      !a.title.toLowerCase().includes('pest') && 
      !a.title.toLowerCase().includes('borer') && 
      !a.title.toLowerCase().includes('outbreak') && 
      a.category !== 'pest' && 
      a.category !== 'pest-lifecycle'
    )
    .filter(a => filter === 'all' || a.category === filter);

  const getTabLabel = (id, defaultLabel) => {
    if (id === 'all') return t('all_alerts', defaultLabel);
    if (id === 'disease') return t('disease_alerts', defaultLabel);
    if (id === 'weather') return t('weather_alerts', defaultLabel);
    if (id === 'irrigation') return t('irrigation_alerts', defaultLabel);
    return defaultLabel;
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Real-time Feed</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('alerts_title', 'Alerts & Notifications')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('alerts_subtitle', 'Stay updated with critical farm activities, weather warnings, and IoT alerts')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={clearAllAlerts} variant="outline" size="sm" icon={Trash2}>
            {t('clear_all')}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'disease', label: 'Disease' },
          { id: 'weather', label: 'Weather' },
          { id: 'irrigation', label: 'Irrigation' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === tab.id ? 'bg-agri-primary text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {getTabLabel(tab.id, tab.label)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card hover={false} className="p-10 text-center py-16">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-700">{t('no_alerts', 'No alerts found')}</h4>
            <p className="text-xs text-gray-400 mt-1">{t('no_alerts_desc', 'Your farm parameters are running smoothly.')}</p>
          </Card>
        ) : (
          filteredAlerts.map((item) => (
            <Card
              key={item.id}
              onClick={() => markAlertRead(item.id)}
              className={`flex items-start justify-between gap-4 p-4 border transition ${
                item.unread ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl ${
                  item.severity === 'danger' ? 'bg-red-100 text-red-700' : item.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {item.category === 'disease' ? <Sprout className="w-5 h-5" /> : item.category === 'pest' ? <Bug className="w-5 h-5" /> : item.category === 'weather' ? <CloudRain className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-agri-dark">{item.title}</h4>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'} size="xs">
                      {item.type}
                    </Badge>
                    <span className="text-[11px] text-gray-400">{item.time}</span>
                  </div>
                </div>
              </div>

              {item.unread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAlertRead(item.id);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-agri-primary"
                  title="Mark read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
