import React from 'react';
import { Droplets, Compass, Settings, ArrowRight } from 'lucide-react';

interface IrrigationWidgetProps {
  irrigation: any;
  onManage: () => void;
}

export const IrrigationWidget: React.FC<IrrigationWidgetProps> = ({ irrigation, onManage }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-gray-900">Smart Irrigation</h3>
        <button onClick={onManage} className="text-[11px] font-bold text-[#0B4D2F] flex items-center gap-1 hover:underline">
          View Details <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative w-[110px] h-[110px]">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F6" strokeWidth="10" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray={`${irrigation?.soilMoisture || 46} 100`} pathLength="100" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold text-gray-900 leading-none mb-1">{irrigation?.soilMoisture || 46}%</span>
            <span className="text-[8px] text-gray-500 text-center leading-tight mb-1">Soil Moisture</span>
            <span className="text-[9px] font-bold text-emerald-500">{irrigation?.moistureStatus || 'Good'}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] text-gray-500">Water Level</span>
            </div>
            <span className="text-[12px] font-bold text-gray-900">{irrigation?.waterLevel || 68}%</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] text-gray-500">Pump Status</span>
            </div>
            <span className={`text-[12px] font-bold ${irrigation?.pumpStatus === 'ON' ? 'text-emerald-500' : 'text-gray-400'}`}>{irrigation?.pumpStatus || 'ON'}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] text-gray-500">Mode</span>
            </div>
            <span className="text-[12px] font-bold text-purple-600">{irrigation?.mode || 'Auto'}</span>
          </div>
        </div>
      </div>

      <button onClick={onManage} className="w-full mt-auto py-3 bg-[#0B4D2F] hover:bg-[#083822] text-white text-[12px] font-bold rounded-xl transition flex items-center justify-center gap-2">
        Manage Irrigation <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
