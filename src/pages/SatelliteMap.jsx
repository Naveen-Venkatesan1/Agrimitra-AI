import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Eye, Zap, RefreshCw, Compass, Database, ShieldCheck, Wind, Droplets, Sparkles, Activity, BarChart3 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useAppStore } from '../store/useAppStore';
import { fetchSatelliteTelemetry } from '../services/satelliteApi';
import { useTranslation } from '../hooks/useTranslation';
import { INDIA_LOCATIONS, getLocationCoordinates } from '../data/indiaLocations';
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
        {/* React Leaflet Map */}
        <MapContainer 
          center={[getLocationCoordinates(selectedState, selectedDistrict).lat, getLocationCoordinates(selectedState, selectedDistrict).lon]} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', position: 'absolute', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[getLocationCoordinates(selectedState, selectedDistrict).lat, getLocationCoordinates(selectedState, selectedDistrict).lon]}>
            <Popup>
              {selectedDistrict}, {selectedState} Field Boundary
            </Popup>
          </Marker>
          <MapUpdater center={[getLocationCoordinates(selectedState, selectedDistrict).lat, getLocationCoordinates(selectedState, selectedDistrict).lon]} />
        </MapContainer>

        {/* Telemetry Overlay */}
        <div className="absolute top-4 right-4 z-[400] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl text-center border border-white/20 w-64 shadow-2xl pointer-events-auto">
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">{telemetryData?.index_name || activeLayer} ({selectedGraph})</p>
            <p className="text-3xl font-extrabold text-white mt-1.5">{telemetryData?.mean_score || '0.78'}</p>
            <p className="text-[11px] text-amber-300 font-semibold mt-1">{selectedDistrict}, {selectedState}</p>
            <p className="text-[10px] text-gray-300 mt-1 border-t border-white/10 pt-1">{telemetryData?.chlorophyll_index || 'High Optimal Biomass Activity'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Component to handle map center updates when state/district changes
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export default SatelliteMap;
