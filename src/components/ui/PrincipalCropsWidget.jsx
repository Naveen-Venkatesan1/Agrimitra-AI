import React, { useState, useEffect } from 'react';
import { Sprout, TrendingUp, MapPin, Award, Database, RefreshCw, BarChart3, Layers, CheckCircle2 } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import SearchableSelect from './SearchableSelect';
import { fetchPrincipalCropsProduction } from '../../services/cropApi';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../../data/indiaLocations';

export const PrincipalCropsWidget = () => {
  const { selectedState, setSelectedState, user, updateSmartContext } = useAppStore();
  const { t } = useTranslation();
  const selectedCrop = user?.primaryCrop || "Rice";
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPrincipalCropsData = async (stateName, cropName) => {
    setLoading(true);
    const res = await fetchPrincipalCropsProduction(stateName, cropName);
    setRecords(res.records || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPrincipalCropsData(selectedState, selectedCrop);
  }, [selectedState, selectedCrop]);

  const cropOptions = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane"];
  const stateOptions = Object.keys(INDIA_LOCATIONS);

  return (
    <Card hover={false} className="p-5 sm:p-6 border border-[#8BC34A]/40 bg-gradient-to-br from-white via-emerald-50/20 to-white shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-agri-primary flex items-center justify-center shadow-xs flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-agri-dark">{t('principal_crops_title', 'Production of Principal Crops (Govt Dataset)')}</h3>
              <Badge variant="good" size="xs">
                <Database className="w-3 h-3" /> Key: 579b...e561
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('principal_crops_subtitle', 'Official Department of Agriculture benchmarks on Area Harvested, Total Production & Yield')}
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

          {/* Searchable Crop Picker */}
          <SearchableSelect
            value={selectedCrop}
            onChange={(cr) => updateSmartContext({ primaryCrop: cr })}
            options={cropOptions}
            placeholder="Search Crop..."
            size="sm"
            icon={Sprout}
          />

          <button
            onClick={() => loadPrincipalCropsData(selectedState, selectedCrop)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-agri-primary hover:text-white text-gray-600 transition"
            title="Refresh Govt Principal Crops Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400 font-medium">
          {t('loading', 'Loading')}...
        </div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">No principal crop entries found for selected filter.</div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {records.map((row, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-gray-100 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-agri-primary uppercase tracking-wider block">
                        {row.crop_year} • {row.season}
                      </span>
                      <h4 className="text-sm font-black text-agri-dark mt-0.5">{row.district_name}</h4>
                    </div>
                    <Badge variant="good" size="xs">
                      {row.national_ranking || 'Principal Basin'}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-gray-400" /> Area Harvested:
                      </span>
                      <span className="font-bold text-gray-800">{row.area_ha} Ha</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Total Production:
                      </span>
                      <span className="font-extrabold text-emerald-700">{row.production_tonnes} T</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Average Yield:
                      </span>
                      <span className="font-black text-agri-dark bg-emerald-50 px-2 py-0.5 rounded-lg">
                        {row.yield_kg_ha} kg / Ha
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-agri-primary" /> Govt Agmarknet Verified
                  </span>
                  <span>State: {row.state_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PrincipalCropsWidget;
