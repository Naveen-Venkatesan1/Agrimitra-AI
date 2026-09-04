import React, { useState, useEffect } from 'react';
import { Layers, DollarSign, Database, RefreshCw, CheckCircle2, Package, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import SearchableSelect from './SearchableSelect';
import { fetchFertilizerData } from '../../services/cropApi';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../../data/indiaLocations';

export const FertilizerWidget = () => {
  const { selectedState, selectedDistrict, setSelectedState, setSelectedDistrict } = useAppStore();
  const { t } = useTranslation();
  const [fertilizerRecords, setFertilizerRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFertilizerData = async (stateName, districtName) => {
    setLoading(true);
    const res = await fetchFertilizerData(stateName, districtName);
    setFertilizerRecords(res.records || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFertilizerData(selectedState, selectedDistrict);
  }, [selectedState, selectedDistrict]);

  const stateOptions = Object.keys(INDIA_LOCATIONS);
  const districtOptions = INDIA_LOCATIONS[selectedState] || [];

  return (
    <Card hover={false} className="p-5 sm:p-6 border border-[#8BC34A]/40 bg-gradient-to-br from-white via-emerald-50/20 to-white shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-agri-dark">{t('fertilizer_widget_title', 'Subsidized Fertilizer Availability & PACS Stock')}</h3>
              <Badge variant="good" size="xs">
                <Database className="w-3 h-3" /> Key: 579b...e561
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('fertilizer_widget_subtitle', 'Department of Fertilizers live PACS/IFFCO depot stock, official subsidized bag MRPs & NPK complex ratios')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Searchable State Picker */}
          <SearchableSelect
            value={selectedState}
            onChange={(st) => setSelectedState(st)}
            options={stateOptions}
            placeholder="Search State..."
            size="sm"
            icon={MapPin}
          />

          {/* Searchable District Picker */}
          <SearchableSelect
            value={selectedDistrict}
            onChange={(ds) => setSelectedDistrict(ds)}
            options={districtOptions}
            placeholder="Search District..."
            size="sm"
            icon={MapPin}
          />

          <button
            onClick={() => loadFertilizerData(selectedState, selectedDistrict)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-agri-primary hover:text-white text-gray-600 transition"
            title="Refresh Fertilizer Stock Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400 font-medium">
          {t('loading', 'Loading')}...
        </div>
      ) : fertilizerRecords.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">No fertilizer stock entries found for selected district.</div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {fertilizerRecords.map((row, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-gray-100 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        NPK: {row.npk_ratio}
                      </span>
                      <h4 className="text-sm font-black text-agri-dark mt-0.5 leading-tight">{row.fertilizer_name}</h4>
                    </div>
                    <Badge variant={row.availability_status.includes('In Stock') ? 'good' : 'warning'} size="xs">
                      {row.bag_weight}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Subsidized MRP:</span>
                      <span className="font-black text-base text-emerald-700">{row.subsidized_mrp}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">Open Market Price:</span>
                      <span className="line-through text-gray-400 font-semibold">{row.open_market_price}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-blue-500" /> PACS Stock:
                      </span>
                      <span className="font-bold text-gray-800">{row.pacs_stock_bags}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] text-gray-600 font-medium mt-2">
                      <span className="font-bold text-agri-dark block">Recommended Use:</span>
                      {row.recommended_stage}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-2 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-agri-primary" /> Govt Subsidy Rate
                  </span>
                  <span>{selectedDistrict}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default FertilizerWidget;
