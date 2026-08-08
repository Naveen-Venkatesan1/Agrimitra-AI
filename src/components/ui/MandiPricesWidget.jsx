import React, { useState, useEffect } from 'react';
import { Tag, TrendingUp, MapPin, RefreshCw, Database } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import { fetchMandiPrices } from '../../services/cropApi';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';

export const MandiPricesWidget = () => {
  const { user } = useAppStore();
  const { t } = useTranslation();
  const [mandiRecords, setMandiRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMandiPrices = async () => {
    setLoading(true);
    const stateName = user?.state || user?.location?.split(',')[0] || "Tamil Nadu";
    const res = await fetchMandiPrices(stateName, user?.primaryCrop || "Paddy(Dhan)");
    setMandiRecords(res.records);
    setLoading(false);
  };

  useEffect(() => {
    loadMandiPrices();
  }, [user?.state, user?.primaryCrop]);

  return (
    <Card hover={false} className="p-5 border border-[#8BC34A]/30 bg-white">
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-agri-primary flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-agri-dark">{t('mandi_widget_title', 'Agmarknet Live Mandi Prices')}</h3>
            <p className="text-[10px] text-gray-500">{t('mandi_widget_subtitle', 'Government Daily Mandi Trade Rates')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="good" size="xs">
            <Database className="w-3 h-3" /> Live Govt API
          </Badge>
          <button
            onClick={loadMandiPrices}
            className="p-1 rounded-lg text-gray-400 hover:text-agri-primary hover:bg-gray-100"
            title="Refresh Mandi Rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400">{t('loading', 'Loading')}...</div>
      ) : (
        <div className="space-y-3">
          {mandiRecords.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-3 text-xs">
              <div>
                <h4 className="font-bold text-agri-dark">{item.market}</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-agri-light" /> {item.district}, {item.state} • <span className="font-semibold text-gray-700">{item.variety}</span>
                </p>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-emerald-700">₹{item.modal_price} / Qtl</div>
                <span className="text-[9px] text-gray-400">Min: ₹{item.min_price} | Max: ₹{item.max_price}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MandiPricesWidget;
