import React, { useState, useEffect } from 'react';
import { Warehouse, TrendingUp, ShieldCheck, Database, RefreshCw, Layers, CheckCircle2, PackageCheck, MapPin } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import SearchableSelect from './SearchableSelect';
import { fetchProductionStockYield } from '../../services/cropApi';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../../data/indiaLocations';

export const StockYieldWidget = () => {
  const { selectedState, setSelectedState, user, updateSmartContext } = useAppStore();
  const { t } = useTranslation();
  const selectedCommodity = user?.primaryCrop || "Rice";
  const [stockRecords, setStockRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStockYieldData = async (stateName, commodityName) => {
    setLoading(true);
    const res = await fetchProductionStockYield(stateName, commodityName);
    setStockRecords(res.records || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStockYieldData(selectedState, selectedCommodity);
  }, [selectedState, selectedCommodity]);

  const commodityOptions = ["Rice", "Wheat", "Pulses"];
  const stateOptions = Object.keys(INDIA_LOCATIONS);

  return (
    <Card hover={false} className="p-5 sm:p-6 border border-[#8BC34A]/40 bg-gradient-to-br from-white via-emerald-50/20 to-white shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs flex-shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-agri-dark">{t('stock_yield_title', 'Agriculture Production Stock & Buffer Yield')}</h3>
              <Badge variant="good" size="xs">
                <Database className="w-3 h-3" /> Key: 579b...e561
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('stock_yield_subtitle', 'FCI & State Warehousing Buffer Reserves, Godown Capacity Utilization & Yield Efficiency')}
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

          {/* Searchable Commodity Picker */}
          <SearchableSelect
            value={selectedCommodity}
            onChange={(cm) => updateSmartContext({ primaryCrop: cm })}
            options={commodityOptions}
            placeholder="Search Commodity..."
            size="sm"
          />

          <button
            onClick={() => loadStockYieldData(selectedState, selectedCommodity)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-agri-primary hover:text-white text-gray-600 transition"
            title="Refresh Production Stock Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400 font-medium">
          {t('loading', 'Loading')}...
        </div>
      ) : stockRecords.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">No warehouse stock records found for selected criteria.</div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {stockRecords.map((row, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-gray-100 shadow-xs hover:border-amber-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        {row.district}
                      </span>
                      <h4 className="text-sm font-black text-agri-dark mt-0.5 leading-snug">{row.warehouse}</h4>
                    </div>
                    <Badge variant="good" size="xs">
                      {row.storage_status || 'Optimum Buffer'}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" /> Buffer Stock Reserve:
                      </span>
                      <span className="font-extrabold text-emerald-700">{row.buffer_stock_mt}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-500" /> Total Storage Capacity:
                      </span>
                      <span className="font-bold text-gray-800">{row.available_capacity_mt}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Basin Yield Efficiency:
                      </span>
                      <span className="font-black text-agri-dark bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50">
                        {row.average_yield_factor}
                      </span>
                    </div>

                    {/* Utilization Progress Bar */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                        <span>Godown Utilization</span>
                        <span>{row.storage_utilization}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: row.storage_utilization || '75%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-agri-primary" /> FCI Civil Supplies Verified
                  </span>
                  <span>Commodity: {row.commodity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default StockYieldWidget;
