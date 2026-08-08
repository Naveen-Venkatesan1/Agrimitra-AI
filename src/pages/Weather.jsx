import React, { useState, useEffect } from 'react';
import { Sun, CloudSun, CloudRain, Wind, Droplets, Gauge, AlertTriangle, Compass, CheckCircle2, RefreshCw, Database, Sparkles, Layers, Bug, MapPin, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../data/indiaLocations';

export const Weather = () => {
  const { weather, addAlert, user, selectedState, selectedDistrict, setSelectedState, setSelectedDistrict, fetchLiveWeather, loading } = useAppStore();
  const { t } = useTranslation();
  const [rainForecastTriggered, setRainForecastTriggered] = useState(false);
  const userCrop = user?.primaryCrop || user?.crop || "Paddy";
  
  const stateOptions = Object.keys(INDIA_LOCATIONS);
  const districtOptions = INDIA_LOCATIONS[selectedState] || [];

  const triggerRainForecastAlert = () => {
    setRainForecastTriggered(true);

    addAlert({
      title: `Rain expected in 4 hours (${weather.rainProbabilityTomorrow}% Probability). Irrigation automatically paused to save water.`,
      type: 'Weather Alert',
      category: 'weather',
      severity: 'warning'
    });
  };

  const getIconComponent = (conditionStr, isRainy) => {
    if (isRainy || (conditionStr && conditionStr.toLowerCase().includes('rain'))) return CloudRain;
    if (conditionStr && conditionStr.toLowerCase().includes('cloud')) return CloudSun;
    return Sun;
  };

  const forecastToDisplay = (weather.dailyForecast || []).map(f => ({
    ...f,
    icon: getIconComponent(f.condition, f.isRainy)
  }));

  const displayForecast = forecastToDisplay;

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Hyperlocal Meteorology</span>
            <Badge variant="good" size="xs">
              <Database className="w-3 h-3" /> {weather.source || 'Open-Meteo Live API'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('weather_page_title')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('weather_page_subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Searchable State Selector */}
          <SearchableSelect
            value={selectedState}
            onChange={(st) => setSelectedState(st)}
            options={stateOptions}
            placeholder="Search State..."
            size="sm"
            icon={MapPin}
          />
          
          {/* Searchable District Selector */}
          <SearchableSelect
            value={selectedDistrict}
            onChange={(ds) => setSelectedDistrict(ds)}
            options={districtOptions}
            placeholder="Search District..."
            size="sm"
            icon={MapPin}
          />

          <button
            onClick={() => fetchLiveWeather(selectedDistrict, selectedState, userCrop)}
            disabled={loading}
            className="p-2 rounded-xl bg-gray-100 hover:bg-agri-primary hover:text-white text-gray-600 transition flex items-center gap-1 text-xs font-bold"
            title="Refresh Live Open-Meteo Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Weather Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover={false} className="p-5 border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Temperature</span>
              <div className="text-3xl font-black text-agri-dark mt-1 flex items-baseline gap-1">
                {weather.temp}°C
                <span className="text-xs font-normal text-gray-500">({weather.high}° / {weather.low}°)</span>
              </div>
              <p className="text-xs text-emerald-700 font-bold mt-1">{weather.condition}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-agri-primary flex items-center justify-center">
              <Sun className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card hover={false} className="p-5 border border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Relative Humidity</span>
              <div className="text-3xl font-black text-agri-dark mt-1">{weather.humidity}%</div>
              <p className="text-xs text-blue-700 font-bold mt-1">Vapor Pressure Deficit Normal</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card hover={false} className="p-5 border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Wind & Pressure</span>
              <div className="text-3xl font-black text-agri-dark mt-1">{weather.windSpeed}</div>
              <p className="text-xs text-indigo-700 font-bold mt-1">Barometric: {weather.pressure}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
              <Wind className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card hover={false} className="p-5 border border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Precipitation (24h)</span>
              <div className="text-3xl font-black text-agri-dark mt-1">{weather.rainfall}</div>
              <p className="text-xs text-amber-700 font-bold mt-1">Tomorrow Rain Prob: {weather.rainProbabilityTomorrow}%</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-600 flex items-center justify-center">
              <CloudRain className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 7-Day Weather Forecast Strip */}
      <Card hover={false} className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-agri-dark mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-agri-primary" /> 7-Day Agri-Meteorology Forecast ({selectedDistrict}, {selectedState})
          </span>
          <span className="text-xs font-normal text-gray-400">Open-Meteo High Resolution Model</span>
        </h3>

        {displayForecast.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading live Open-Meteo forecast...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {displayForecast.map((day, idx) => {
              const IconComp = day.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-between ${
                    day.isRainy ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-600">{day.day}</span>
                  <IconComp className={`w-8 h-8 my-2 ${day.isRainy ? 'text-amber-500' : 'text-emerald-600'}`} />
                  <div>
                    <span className="text-sm font-black text-agri-dark block">{day.high}° / {day.low}°</span>
                    <span className="text-[10px] font-semibold text-gray-500 block truncate mt-0.5">{day.condition}</span>
                  </div>
                  {day.isRainy && (
                    <Badge variant="warning" size="xs" className="mt-2 text-[9px]">
                      Rain Risk
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rain Advisory Simulation Trigger */}
      <Card hover={false} className="p-5 bg-gradient-to-r from-emerald-900 to-emerald-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#8BC34A] border border-white/20 shrink-0">
            <CloudRain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Rainfall Auto-Irrigation Guard</h4>
            <p className="text-xs text-emerald-100 mt-0.5">Automated integration between Open-Meteo precipitation forecasts and solenoid drip valves.</p>
          </div>
        </div>

        <Button 
          onClick={triggerRainForecastAlert} 
          variant="outline" 
          size="sm" 
          className="bg-white/10 text-white border-white/30 hover:bg-white/20 whitespace-nowrap text-xs"
        >
          {rainForecastTriggered ? 'Alert Sent & Irrigation Paused' : 'Simulate Rain Forecast Alert'}
        </Button>
      </Card>
    </div>
  );
};

export default Weather;
