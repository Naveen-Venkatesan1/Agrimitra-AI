import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Eye, Zap, RefreshCw, Compass, Database, ShieldCheck, Wind, Droplets, Sparkles, Activity, BarChart3 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useAppStore } from '../store/useAppStore';
import { fetchSatelliteTelemetry } from '../services/satelliteApi';
import { useTranslation } from '../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { GRAPH_OPTIONS } from '../data/graphOptions';

export const SatelliteMap = () => {
  const { user, selectedState, selectedDistrict, selectedGraph, setSelectedState, setSelectedDistrict, setSelectedGraph } = useAppStore();
  const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [loading, setLoading] = useState(false);
  const [telemetryData, setTelemetryData] = useState(null);

  const stateOptions = Object.keys(INDIA_LOCATIONS);
  const districtOptions = INDIA_LOCATIONS[selectedState] || [];

  const loadTelemetry = async (layerName) => {
    setLoading(true);
    const res = await fetchSatelliteTelemetry(selectedDistrict || "Thanjavur", layerName);
    setTelemetryData(res.records || null);
    setLoading(false);
  };

  useEffect(() => {
    loadTelemetry(activeLayer);
  }, [activeLayer, selectedDistrict]);

  const layerOptions = [
    { id: 'NDVI', label: 'NDVI (Vegetation Index)', bgClass: 'bg-agri-primary text-white' },
    { id: 'NDWI', label: 'NDWI (Moisture Index)', bgClass: 'bg-agri-water text-white' },
    { id: 'RGB', label: 'True Color RGB', bgClass: 'bg-gray-800 text-white' },
    { id: 'AQI', label: 'Air Quality (AQI & Microclimate)', bgClass: 'bg-amber-600 text-white' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">GIS & Air Quality Intelligence</span>
            <Badge variant="good" size="xs">
              <Database className="w-3 h-3" /> Key: AQ.Ab...PWLig Connected
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('satellite_title', 'Satellite View, Field Map & Air Quality')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('satellite_subtitle', 'High-resolution Sentinel-2 vegetation index, moisture heatmap & real-time atmospheric telemetry')}</p>
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

          {/* Searchable Graph / Index Selector */}
          <SearchableSelect
            value={selectedGraph}
            onChange={(g) => setSelectedGraph(g)}
            options={GRAPH_OPTIONS}
            placeholder="Search Graph..."
            size="sm"
            icon={BarChart3}
          />

          <Button onClick={() => loadTelemetry(activeLayer)} loading={loading} icon={RefreshCw} variant="outline" size="sm">
            Pass
          </Button>
        </div>
      </div>

      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-600">Select Telemetry Layer:</span>
          {layerOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveLayer(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                activeLayer === opt.id ? opt.bgClass : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Badge variant="info">Location: {selectedDistrict}, {selectedState} • {selectedGraph}</Badge>
      </div>

      {/* Interactive Satellite Map View */}
      <Card hover={false} className="p-0 overflow-hidden relative border border-gray-200 shadow-card rounded-2xl min-h-[480px]">
        {/* Background Satellite Visual Container */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1600')`,
            filter: activeLayer === 'NDVI' ? 'contrast(1.2) hue-rotate(40deg)' : activeLayer === 'NDWI' ? 'hue-rotate(160deg)' : activeLayer === 'AQI' ? 'sepia(0.3) brightness(1.05)' : 'none'
          }}
        />

        {/* Boundary Overlay Canvas */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="relative border-4 border-dashed border-[#8BC34A] bg-emerald-500/20 backdrop-blur-xs rounded-3xl w-72 h-72 sm:w-96 sm:h-96 flex flex-col items-center justify-center p-4 text-white shadow-2xl">
            <div className="absolute -top-3 left-4 px-3 py-1 bg-agri-dark text-[#8BC34A] border border-[#8BC34A] rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              <MapPin className="w-3.5 h-3.5" /> {selectedDistrict} Field Boundary #{user?.primaryCrop || 'Paddy'}-01
            </div>

            <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl text-center border border-white/20 w-4/5">
              <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">{telemetryData?.index_name || activeLayer} ({selectedGraph})</p>
              <p className="text-3xl font-extrabold text-white mt-1.5">{telemetryData?.mean_score || '0.78'}</p>
              <p className="text-[11px] text-amber-300 font-semibold mt-1">{selectedDistrict}, {selectedState}</p>
              <p className="text-[10px] text-gray-300 mt-1 border-t border-white/10 pt-1">{telemetryData?.chlorophyll_index || 'High Optimal Biomass Activity'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SatelliteMap;
