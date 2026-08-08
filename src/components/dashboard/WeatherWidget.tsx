import React from 'react';
import { Sun, Droplets, Wind, CloudRain, Compass, ArrowRight, MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface WeatherWidgetProps {
  weather: any;
  onViewFull: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, onViewFull }) => {
  const { selectedDistrict, selectedState } = useAppStore();

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">Weather Overview</h3>
          <span className="text-[10px] font-semibold text-agri-primary flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {selectedDistrict}, {selectedState}
          </span>
        </div>
        <button onClick={onViewFull} className="text-[11px] font-bold text-[#0B4D2F] flex items-center gap-1 hover:underline">
          View Full <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-[42px] font-bold text-gray-900 leading-none tracking-tight">{weather?.temp || 28}°C</div>
          <p className="text-[13px] text-gray-500 mt-1">{weather?.condition || 'Partly Cloudy'}</p>
        </div>
        <Sun className="w-12 h-12 text-yellow-400" fill="currentColor" />
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] text-gray-500">Humidity</span>
          <span className="text-[11px] font-bold text-gray-900 ml-auto">{weather?.humidity || 65}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] text-gray-500">Wind Speed</span>
          <span className="text-[11px] font-bold text-gray-900 ml-auto">{String(weather?.windSpeed || '12').replace('km/h', '')} <br/><span className="text-[9px] font-normal text-gray-500">km/h</span></span>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] text-gray-500">Rainfall</span>
          <span className="text-[11px] font-bold text-gray-900 ml-auto">{weather?.rainfall || '0.0 mm'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] text-gray-500">Pressure</span>
          <span className="text-[11px] font-bold text-gray-900 ml-auto">{String(weather?.pressure || '1012').replace('hPa', '')} <br/><span className="text-[9px] font-normal text-gray-500">hPa</span></span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 mt-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
          {[
            { d: 'Mon', h: 31, l: 23 },
            { d: 'Tue', h: 30, l: 22 },
            { d: 'Wed', h: 29, l: 22 },
            { d: 'Thu', h: 28, l: 21 },
            { d: 'Fri', h: 27, l: 21 },
            { d: 'Sat', h: 27, l: 20 },
            { d: 'Sun', h: 28, l: 21 }
          ].map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span>{day.d}</span>
              <Sun className="w-3.5 h-3.5 text-yellow-400 my-0.5" fill="currentColor" />
              <div className="flex flex-col items-center leading-tight">
                <span className="font-bold text-gray-900">{day.h}°</span>
                <span className="text-[9px]">{day.l}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
