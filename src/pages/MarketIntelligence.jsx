import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, IndianRupee, Calendar, Search, RefreshCw, BarChart } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAppStore } from '../store/useAppStore';
import { getMarketPrices } from '../services/api/market';

export const MarketIntelligence = () => {
  const { user, selectedState, selectedDistrict } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState([]);
  const [error, setError] = useState(null);

  const crop = user?.primaryCrop || 'Tomato';

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMarketPrices({ state: selectedState, district: selectedDistrict, commodity: crop });
      if (res.success) {
        setPrices(res.data);
      } else {
        setError(res.error || 'Failed to fetch market data.');
      }
    } catch (err) {
      setError('An error occurred while fetching prices.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, [selectedState, selectedDistrict, crop]);

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">
            Market Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">
            Live Mandi Prices
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time APMC / Mandi market rates from Data.gov.in
          </p>
        </div>
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-agri-primary text-white text-sm font-bold rounded-xl hover:bg-agri-dark transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover={false} className="p-4 bg-emerald-50 border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-200/50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Target Commodity</span>
            <span className="text-xl font-extrabold text-gray-900 block">{crop}</span>
          </div>
        </Card>
        <Card hover={false} className="p-4 bg-sky-50 border border-sky-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-200/50 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-sky-700" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Selected Region</span>
            <span className="text-xl font-extrabold text-gray-900 block leading-tight">{selectedDistrict}, {selectedState}</span>
          </div>
        </Card>
        <Card hover={false} className="p-4 bg-amber-50 border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-200/50 flex items-center justify-center">
            <BarChart className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Markets Found</span>
            <span className="text-xl font-extrabold text-gray-900 block">{prices.length}</span>
          </div>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Recent APMC Market Rates</h3>
        </div>
        
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Fetching live rates from government database...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        ) : prices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-500">No recent market data available for {crop} in {selectedDistrict}. Try another district or crop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Market / Mandi</th>
                  <th className="px-4 py-3">Commodity / Variety</th>
                  <th className="px-4 py-3">Min Price (₹/Quintal)</th>
                  <th className="px-4 py-3">Max Price (₹/Quintal)</th>
                  <th className="px-4 py-3">Modal Price (₹/Quintal)</th>
                  <th className="px-4 py-3">Arrival Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prices.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.market} <span className="text-[10px] text-gray-400 block font-normal">{item.district}, {item.state}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {item.commodity} <span className="text-gray-400">({item.variety})</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-600">{item.min_price}</td>
                    <td className="px-4 py-3 font-semibold text-gray-600">{item.max_price}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" /> {item.modal_price}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.arrival_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketIntelligence;
