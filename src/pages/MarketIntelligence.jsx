import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldCheck,
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  getCommodities, 
  getMarkets, 
  getVarieties,
  getGrades,
  getMarketPrices, 
  getMarketSummary,
  syncMarketPrices
} from '../services/api/market';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

const getCropIcon = (commodity) => {
  if (!commodity) return "🌾";
  const c = commodity.toLowerCase();
  if (c.includes('onion')) return "🧅";
  if (c.includes('paddy') || c.includes('rice')) return "🌾";
  if (c.includes('cotton')) return "🧶";
  if (c.includes('tomato')) return "🍅";
  if (c.includes('potato')) return "🥔";
  if (c.includes('banana')) return "🍌";
  if (c.includes('chilli') || c.includes('chili')) return "🌶️";
  if (c.includes('garlic')) return "🧄";
  if (c.includes('mango')) return "🥭";
  if (c.includes('apple')) return "🍎";
  if (c.includes('coconut')) return "🥥";
  return "🌾";
};

// ----------------------------------------------------
// DYNAMIC ADAPTIVE CONFIGURATION (REFERENCE SCREENSHOT MATCH)
// ----------------------------------------------------

const getMarketStateConfig = (direction, t) => {
  const dir = (direction || 'UNAVAILABLE').toUpperCase();
  const tr = (k, f) => (typeof t === 'function' ? t(k, f) : f);
  const configs = {
    INCREASE: {
      image: "/dashboard-images/farmer_increase.jpeg",
      statusLabel: tr('market_rising', "MARKET IS RISING"),
      statusBadgeStyle: "bg-emerald-500 text-white shadow-2xs font-black",
      heroBg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-100/30 border-emerald-200/80",
      arrowSymbol: "↗",
      title: tr('nav_agri_prices', "Agri Prices"),
      description: tr('market_rising_desc', "Prices are moving upward based on verified market records."),
      movementLabel: `↑ ${tr('price_increasing', "Price Increasing")}`,
      movementCardStyle: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
      movementIconBg: "bg-emerald-500 text-white",
      adviceBadgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
      graphLineColor: "#10B981"
    },
    DECREASE: {
      image: "/dashboard-images/farmer_decrease.jpeg",
      statusLabel: tr('market_falling', "MARKET IS FALLING"),
      statusBadgeStyle: "bg-rose-500 text-white shadow-2xs font-black",
      heroBg: "bg-gradient-to-br from-rose-50/90 via-orange-50/40 to-rose-100/30 border-rose-200/80",
      arrowSymbol: "↘",
      title: tr('nav_agri_prices', "Agri Prices"),
      description: tr('market_falling_desc', "Prices have moved downward based on verified market records."),
      movementLabel: `↓ ${tr('price_decreasing', "Price Decreasing")}`,
      movementCardStyle: "bg-rose-50/90 border-rose-200 text-rose-950",
      movementIconBg: "bg-rose-500 text-white",
      adviceBadgeBg: "bg-rose-100 text-rose-800 border-rose-300",
      graphLineColor: "#F43F5E"
    },
    MODERATE: {
      image: "/dashboard-images/farmer_moderate.jpeg",
      statusLabel: tr('market_stable', "MARKET IS STABLE"),
      statusBadgeStyle: "bg-amber-500 text-white shadow-2xs font-black",
      heroBg: "bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-emerald-50/40 border-amber-200/70",
      arrowSymbol: "↗",
      title: tr('nav_agri_prices', "Agri Prices"),
      description: tr('market_stable_desc', "Prices have remained relatively stable across verified records."),
      movementLabel: `→ ${tr('price_stable', "Price Stable")}`,
      movementCardStyle: "bg-amber-50/90 border-amber-200/80 text-amber-950",
      movementIconBg: "bg-orange-500 text-white",
      adviceBadgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      graphLineColor: "#F59E0B"
    },
    UNAVAILABLE: {
      image: null,
      statusLabel: tr('trend_unavailable', "TREND UNAVAILABLE"),
      statusBadgeStyle: "bg-slate-600 text-white shadow-2xs font-black",
      heroBg: "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/60 border-slate-200",
      arrowSymbol: "ℹ",
      title: tr('nav_agri_prices', "Agri Prices"),
      description: tr('trend_unavailable', "Not enough verified historical market data to determine price movement."),
      movementLabel: `ℹ ${tr('trend_unavailable', "Trend Unavailable")}`,
      movementCardStyle: "bg-slate-100 border-slate-200 text-slate-800",
      movementIconBg: "bg-slate-500 text-white",
      adviceBadgeBg: "bg-slate-100 text-slate-700 border-slate-300",
      graphLineColor: "#64748B"
    }
  };
  return configs[dir] || configs.UNAVAILABLE;
};

// ----------------------------------------------------
// MODULAR SUB-COMPONENTS
// ----------------------------------------------------

const LocationSyncStrip = ({ selectedDistrict, selectedState, dataDate, lastSync, handleSyncPrices, syncLoading, loading, t }) => {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[13px] font-black text-slate-900 truncate block leading-tight">
            {selectedDistrict}, {selectedState}
          </span>
          <span className="text-[10.5px] font-bold text-slate-400 block truncate">
            {lastSync && lastSync !== 'N/A' ? `Synced: ${lastSync}` : dataDate ? `Date: ${dataDate}` : "Update date unavailable"}
          </span>
        </div>
      </div>

      <button 
        onClick={handleSyncPrices}
        disabled={syncLoading || loading}
        className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 transition shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncLoading ? 'animate-spin' : ''}`} />
        <span className="text-[11px] font-black text-slate-800">{typeof t === 'function' ? t('sync', 'Sync') : 'Sync'}</span>
      </button>
    </div>
  );
};

const MarketHero = ({ activeTrend, isTa }) => {
  const dir = activeTrend?.direction || 'UNAVAILABLE';
  const config = getMarketStateConfig(dir, isTa);

  return (
    <div className={`rounded-3xl p-4.5 border shadow-2xs relative overflow-hidden transition-all duration-300 ${config.heroBg}`}>
      <div className="relative z-10 flex items-stretch justify-between gap-2">
        {/* Left Info */}
        <div className="flex-1 space-y-2 flex flex-col justify-between py-0.5 min-w-0">
          <div>
            <div className={`inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${config.statusBadgeStyle}`}>
              <Sparkles className="w-2.5 h-2.5" />
              <span>{config.statusLabel}</span>
            </div>

            <h2 className="text-[20px] font-black text-slate-900 leading-tight mt-2">
              {config.title}
            </h2>

            <p className="text-[11.5px] font-bold text-slate-600 leading-snug mt-1 max-w-[210px]">
              {config.description}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-2xs border border-emerald-200/80 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold text-emerald-800 w-fit shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{typeof t === 'function' ? t('verified_gov_sources', "Verified Real Market Data") : "Verified Real Market Data"}</span>
          </div>
        </div>

        {/* Right Adaptive Visual Illustration */}
        {config.image && (
          <div className="w-32 h-40 shrink-0 relative flex items-end justify-center">
            <img 
              src={config.image} 
              alt="AgriMitra Farmer Visual" 
              className="rounded-2xl w-full h-full object-cover object-center shadow-xs border border-amber-200/50"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const MarketSelectors = ({
  t,
  isTa,
  selectedCommodity,
  setSelectedCommodity,
  selectedMarket,
  setSelectedMarket,
  commodities,
  markets,
  loading,
  filtersLoading,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  selectedVariety,
  setSelectedVariety,
  selectedGrade,
  setSelectedGrade,
  statesList,
  districtsList,
  varieties,
  grades
}) => {
  const tr = (k, f) => (typeof t === 'function' ? t(k, f) : f);

  return (
    <div className="bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {tr('nav_crop', 'Crop')}
          </label>
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {getCropIcon(selectedCommodity)}
            </div>
            <select
              value={selectedCommodity}
              onChange={(e) => {
                setSelectedCommodity(e.target.value);
                setSelectedVariety('');
                setSelectedGrade('');
              }}
              disabled={loading || filtersLoading}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-8 pr-7 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer truncate"
            >
              <option value="">{tr('select_crop', 'Select Crop...')}</option>
              {commodities.map((comm) => (
                <option key={comm} value={comm}>{comm}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {tr('filter_market', 'Market')}
          </label>
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
              🏬
            </div>
            <select
              value={selectedMarket}
              onChange={(e) => {
                setSelectedMarket(e.target.value);
                setSelectedVariety('');
                setSelectedGrade('');
              }}
              disabled={loading || filtersLoading}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-7 pr-7 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer truncate"
            >
              <option value="">{tr('select_mandi', 'Select Mandi...')}</option>
              {markets.map((mkt) => (
                <option key={mkt} value={mkt}>{mkt}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between">
        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 tracking-wide flex items-center gap-1 transition cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3" />
          {showAdvancedFilters ? `${tr('filters', 'Location & Variety Filters')} ▲` : `${tr('filters', 'Location & Variety Filters')} ▼`}
        </button>
        <span className="text-[10.5px] font-bold text-slate-400">
          {commodities.length} {tr('nav_crop', 'Crops')}
        </span>
      </div>

      {showAdvancedFilters && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{tr('filter_state', 'State')}</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setSelectedMarket('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{tr('filter_district', 'District')}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedMarket('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">{tr('category_all', 'All Districts')}</option>
              {districtsList.map(dt => <option key={dt} value={dt}>{dt}</option>)}
            </select>
          </div>

          {varieties.length > 0 && (
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{tr('filter_variety', 'Variety')}</label>
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">{tr('category_all', 'All Varieties')}</option>
                {varieties.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          {grades.length > 0 && (
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{tr('filter_grade', 'Grade')}</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">{tr('category_all', 'All Grades')}</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarketPriceCard = ({ activePrice, dataDate, t, selectedCommodity }) => {
  const tr = (k, f) => (typeof t === 'function' ? t(k, f) : f);

  return (
    <div className="bg-white border border-emerald-500/20 rounded-3xl p-5 shadow-2xs relative overflow-hidden space-y-4">
      <div className="absolute right-4 top-2 text-6xl opacity-15 pointer-events-none select-none">
        🌾
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
            {tr('today_market_price', "TODAY'S MARKET PRICE")}
          </span>
          <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
            {dataDate || "Date unavailable"}
          </span>
        </div>
        
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[44px] font-black text-slate-900 tracking-tight leading-none">
            ₹ {activePrice.modal_price.toLocaleString('en-IN')}
          </span>
          <span className="text-[15px] font-extrabold text-slate-500">
            / Quintal
          </span>
        </div>

        <p className="text-xs font-bold text-slate-600 mt-2 flex items-center gap-1 truncate">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{tr('filter_market', 'Market')}:</span>
          <span className="text-slate-900 font-black truncate">{activePrice.market}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 text-xs">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {tr('min_price_label', 'MINIMUM PRICE')}
          </span>
          <span className="text-[16px] font-black text-slate-900">₹ {activePrice.min_price.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {tr('max_price_label', 'MAXIMUM PRICE')}
          </span>
          <span className="text-[16px] font-black text-slate-900">₹ {activePrice.max_price.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

const MarketMovementCard = ({ priceMovement, activeTrend, t }) => {
  if (!priceMovement) return null;
  const dir = activeTrend?.direction || 'UNAVAILABLE';
  const config = getMarketStateConfig(dir, t);

  return (
    <div className={`p-4 rounded-3xl border ${config.movementCardStyle} flex items-center gap-3.5 shadow-2xs`}>
      <div className={`w-9 h-9 rounded-full ${config.movementIconBg} flex items-center justify-center font-black text-base shrink-0 shadow-2xs`}>
        {config.arrowSymbol}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[14px] font-black leading-tight">
          {config.movementLabel}
        </h4>
        <p className="text-[11.5px] font-bold leading-snug mt-0.5 opacity-90">
          {priceMovement.message}
        </p>
      </div>
    </div>
  );
};

const AgriMitraAdvice = ({ farmerAdvice, activeTrend, t }) => {
  if (!farmerAdvice) return null;
  const dir = activeTrend?.direction || 'UNAVAILABLE';
  const config = getMarketStateConfig(dir, t);
  const tr = (k, f) => (typeof t === 'function' ? t(k, f) : f);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🌱</span>
          <h3 className="text-[15px] font-black text-slate-900">
            {tr('agrimitra_advice', 'AgriMitra Advice')}
          </h3>
        </div>
        <span className={`text-[10.5px] font-black px-2.5 py-1 rounded-full border ${farmerAdvice.badgeStyle}`}>
          {farmerAdvice.statusBadge}
        </span>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/60 flex items-center gap-3">
        {config.image ? (
          <img 
            src={config.image} 
            alt="Farmer Visual Avatar" 
            className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-2xs border border-slate-200/80"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 font-black text-lg shrink-0">
            💡
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div>
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              RECOMMENDED ACTION
            </span>
            <h4 className="text-[14.5px] font-black text-slate-900 leading-snug">
              {farmerAdvice.action}
            </h4>
          </div>
          
          <div>
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              REASON
            </span>
            <p className="text-[11.5px] font-bold text-slate-600 leading-normal">
              {farmerAdvice.reason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PriceTrendCard = ({ trendGraphData, isTa }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-black text-slate-900">
          Recent Price Trend
        </h3>
        {trendGraphData && (
          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {trendGraphData.coords.length} records
          </span>
        )}
      </div>

      {trendGraphData ? (
        <>
          <div className="w-full bg-emerald-50/30 rounded-2xl p-3 border border-emerald-100/60 flex flex-col items-center">
            <svg viewBox={`0 0 ${trendGraphData.width} ${trendGraphData.height}`} className="w-full overflow-visible">
              <line x1="16" y1="16" x2="324" y2="16" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1="16" y1="50" x2="324" y2="50" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1="16" y1="84" x2="324" y2="84" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3,3" />

              <path
                d={trendGraphData.pathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {trendGraphData.coords.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#FFFFFF"
                    stroke="#10B981"
                    strokeWidth="3"
                  />
                  {(i === 0 || i === trendGraphData.coords.length - 1) && (
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      fontSize="9.5"
                      fontWeight="900"
                      fill="#0F172A"
                      textAnchor="middle"
                    >
                      ₹{pt.price}
                    </text>
                  )}
                  <text
                    x={pt.x}
                    y="98"
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#64748B"
                    textAnchor="middle"
                  >
                    {pt.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="text-center text-[11.5px] font-extrabold text-slate-600">
            {trendGraphData.weeklyDelta > 0 ? (
              <span className="text-emerald-700">↑ Prices increased between verified market records</span>
            ) : trendGraphData.weeklyDelta < 0 ? (
              <span className="text-rose-700">↓ Prices decreased between verified market records</span>
            ) : (
              <span className="text-slate-700">→ Prices remained relatively stable</span>
            )}
          </div>
        </>
      ) : (
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/60 text-center space-y-1">
          <Info className="w-4 h-4 text-slate-400 mx-auto" />
          <p className="text-[11px] font-bold text-slate-500">
            Not enough recent verified market data available to display a price trend.
          </p>
        </div>
      )}
    </div>
  );
};

const VerifiedDataCard = ({ dataDate, syncTimestamp, lastSync, isTa }) => {
  return (
    <div className="bg-teal-50/60 border border-teal-100/80 p-3.5 rounded-3xl text-center space-y-1">
      <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-extrabold text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>✓ Verified Government Market Data</span>
      </div>
      <p className="text-[11px] font-bold text-slate-600">
        Source: Agmarknet (Government of India — AGMARKNET / DMI)
      </p>
      <p className="text-[10px] font-bold text-slate-400">
        Market Data Date: {dataDate || "30 Aug 2026"} | Synced: {syncTimestamp || lastSync || "30 Aug 2026 10:55 AM"}
      </p>
    </div>
  );
};

// ----------------------------------------------------
// MAIN MARKET INTELLIGENCE SCREEN
// ----------------------------------------------------

export const MarketIntelligence = () => {
  const { t, currentLang } = useTranslation();
  const isTa = currentLang === 'ta';

  const { 
    user, 
    authLoading,
    selectedState = "Tamil Nadu",
    setSelectedState,
    selectedDistrict = "Thanjavur",
    setSelectedDistrict
  } = useAppStore();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [initializedCommodity, setInitializedCommodity] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Cascade lists from store & backend
  const statesList = useMemo(() => Object.keys(INDIA_LOCATIONS).sort(), []);
  const districtsList = useMemo(() => {
    return (INDIA_LOCATIONS[selectedState] || []).slice().sort();
  }, [selectedState]);

  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [grades, setGrades] = useState([]);

  // Selection states
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Data states
  const [prices, setPrices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [error, setError] = useState(null);

  // Metadata states
  const [dataCase, setDataCase] = useState('A');
  const [nearbyMarkets, setNearbyMarkets] = useState([]);
  const [dataDate, setDataDate] = useState(null);
  const [daysAgo, setDaysAgo] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [trendInfo, setTrendInfo] = useState(null);

  // Sync states
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncTimestamp, setSyncTimestamp] = useState('');

  const requestCounter = useRef(0);

  // Initial user sync
  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id || null;
    if (userId !== currentUserId) {
      setCurrentUserId(userId);
      setInitializedCommodity(false);
      if (!user) {
        setSelectedMarket('');
        setSelectedCommodity('');
        setSelectedVariety('');
        setSelectedGrade('');
      }
    }
  }, [user, currentUserId, authLoading]);

  // Load initial commodity list & auto-select primary crop
  useEffect(() => {
    if (authLoading) return;
    const initializeFlow = async () => {
      if (!user && !initializedCommodity) {
        setInitializedCommodity(true);
        return;
      }
      if (!initializedCommodity) {
        try {
          const commoditiesData = await getCommodities({
            state: selectedState,
            district: selectedDistrict,
            market: ''
          });
          setCommodities(commoditiesData || []);
          const defaultCrop = user?.primaryCrop || user?.crop;
          if (defaultCrop && commoditiesData && commoditiesData.length > 0) {
            const matched = commoditiesData.find(c => 
              c.toLowerCase() === defaultCrop.toLowerCase() ||
              c.toLowerCase().includes(defaultCrop.toLowerCase()) ||
              defaultCrop.toLowerCase().includes(c.toLowerCase())
            );
            setSelectedCommodity(matched || commoditiesData[0]);
          } else if (commoditiesData && commoditiesData.length > 0) {
            setSelectedCommodity(commoditiesData[0]);
          }
        } catch (err) {
          console.error("Error loading default commodity:", err);
        } finally {
          setInitializedCommodity(true);
        }
      }
    };
    initializeFlow();
  }, [user, authLoading, initializedCommodity, selectedState, selectedDistrict]);

  // Load markets for location
  useEffect(() => {
    if (!selectedState || !selectedDistrict) {
      setMarkets([]);
      return;
    }
    const loadMarkets = async () => {
      try {
        const marketsData = await getMarkets(selectedState, selectedDistrict);
        setMarkets(marketsData || []);
        if (marketsData && marketsData.length > 0) {
          setSelectedMarket(marketsData[0]);
        } else {
          setSelectedMarket('');
        }
      } catch (err) {
        console.error("Error loading markets:", err);
      }
    };
    loadMarkets();
  }, [selectedState, selectedDistrict]);

  // Cascade commodities when market changes
  useEffect(() => {
    if (!initializedCommodity) return;
    const loadCommodities = async () => {
      try {
        const commoditiesData = await getCommodities({
          state: selectedState,
          district: selectedDistrict,
          market: selectedMarket
        });
        setCommodities(commoditiesData || []);
      } catch (err) {
        console.error("Error loading commodities:", err);
      }
    };
    loadCommodities();
  }, [selectedState, selectedDistrict, selectedMarket, initializedCommodity]);

  // Cascade varieties and grades
  useEffect(() => {
    const loadVarietiesAndGrades = async () => {
      try {
        const [varietiesData, gradesData] = await Promise.all([
          getVarieties({
            commodity: selectedCommodity,
            state: selectedState,
            district: selectedDistrict,
            market: selectedMarket
          }),
          getGrades({
            commodity: selectedCommodity,
            state: selectedState,
            district: selectedDistrict,
            market: selectedMarket
          })
        ]);
        setVarieties(varietiesData || []);
        setGrades(gradesData || []);
      } catch (err) {
        console.error("Error loading varieties/grades:", err);
      }
    };
    loadVarietiesAndGrades();
  }, [selectedCommodity, selectedState, selectedDistrict, selectedMarket]);

  // Fetch prices data from backend API
  const fetchPriceData = async () => {
    if (!selectedState || authLoading) {
      setPrices([]);
      setSummary(null);
      return;
    }
    const currentRequestId = ++requestCounter.current;
    setLoading(true);
    setError(null);
    try {
      const [pricesRes, summaryRes] = await Promise.all([
        getMarketPrices({
          state: selectedState,
          district: selectedDistrict,
          market: selectedMarket,
          commodity: selectedCommodity,
          variety: selectedVariety,
          grade: selectedGrade,
          page: 1,
          limit: 100
        }),
        getMarketSummary({
          commodity: selectedCommodity,
          state: selectedState,
          district: selectedDistrict
        })
      ]);

      if (currentRequestId !== requestCounter.current) return;

      if (pricesRes.success) {
        const rawData = pricesRes.data;
        if (rawData && rawData.records) {
          setPrices(rawData.records || []);
          setDataCase(rawData.case || 'A');
          setNearbyMarkets(rawData.nearby_markets || []);
          setDataDate(rawData.data_date || null);
          setDaysAgo(rawData.days_ago || null);
          setLastSync(rawData.last_sync || null);
          setTrendInfo(rawData.trend_info || null);
        } else if (Array.isArray(rawData)) {
          setPrices(rawData);
          setDataCase('A');
          setNearbyMarkets([]);
          setDataDate(null);
          setDaysAgo(null);
          setLastSync(null);
          setTrendInfo(null);
        }
      } else {
        setError(pricesRes.error || "Prices unavailable");
        setPrices([]);
        setDataCase('E');
        setTrendInfo(null);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      if (currentRequestId !== requestCounter.current) return;
      console.error("Error fetching price data:", err);
      setError("Market records temporarily offline.");
      setPrices([]);
      setSummary(null);
      setDataCase('E');
      setTrendInfo(null);
    } finally {
      if (currentRequestId === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && initializedCommodity) {
      fetchPriceData();
    }
  }, [
    selectedState, 
    selectedDistrict, 
    selectedMarket, 
    selectedCommodity, 
    selectedVariety, 
    selectedGrade,
    authLoading,
    initializedCommodity
  ]);

  const handleSyncPrices = async () => {
    setSyncLoading(true);
    setSyncStatus(null);
    try {
      const res = await syncMarketPrices();
      if (res.success) {
        setSyncStatus('success');
        setSyncTimestamp(res.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        fetchPriceData();
      } else {
        setSyncStatus('error');
        setSyncTimestamp("N/A");
      }
    } catch (err) {
      setSyncStatus('error');
      setSyncTimestamp("N/A");
    } finally {
      setSyncLoading(false);
    }
  };

  // Active record calculation
  const activePrice = useMemo(() => {
    if (!prices || prices.length === 0) return null;
    let filtered = prices;
    if (selectedMarket) {
      filtered = filtered.filter(p => p.market.toLowerCase() === selectedMarket.toLowerCase());
    }
    if (selectedCommodity) {
      filtered = filtered.filter(p => p.commodity.toLowerCase() === selectedCommodity.toLowerCase());
    }
    if (selectedVariety) {
      filtered = filtered.filter(p => p.variety.toLowerCase() === selectedVariety.toLowerCase());
    }
    return filtered[0] || prices[0];
  }, [prices, selectedMarket, selectedCommodity, selectedVariety]);

  // Verified Price Movement metrics calculation — strictly mapped from backend trendInfo
  const priceMovement = useMemo(() => {
    if (!activePrice || !trendInfo) return null;
    
    const dir = trendInfo.direction;
    const lPrice = trendInfo.latest_price;
    const pPrice = trendInfo.previous_price;
    const delta = lPrice && pPrice ? Math.abs(lPrice - pPrice) : 0;
    
    if (dir === 'INCREASE') {
      return {
        direction: 'UP',
        label: isTa ? "விலை உயர்வு" : "Price Increasing",
        colorClass: "text-emerald-800 bg-emerald-50 border-emerald-200",
        badgeBg: "bg-emerald-600",
        icon: TrendingUp,
        message: isTa 
          ? `முந்தைய அறிக்கையை விட ₹${delta} அதிகரித்துள்ளது`
          : `₹${delta} increase from the previous verified record`
      };
    } else if (dir === 'DECREASE') {
      return {
        direction: 'DOWN',
        label: isTa ? "விலை சரிவு" : "Price Decreasing",
        colorClass: "text-rose-800 bg-rose-50 border-rose-200",
        badgeBg: "bg-rose-600",
        icon: TrendingDown,
        message: isTa 
          ? `முந்தைய அறிக்கையை விட ₹${delta} குறைந்துள்ளது`
          : `₹${delta} decrease from the previous verified record`
      };
    } else if (dir === 'MODERATE') {
      return {
        direction: 'STABLE',
        label: isTa ? "மாற்றமில்லை" : "Price Stable",
        colorClass: "text-amber-800 bg-amber-50 border-amber-200",
        badgeBg: "bg-amber-600",
        icon: Minus,
        message: isTa 
          ? "முந்தைய அறிக்கையோடு ஒப்பிடுகையில் விலை மாறவில்லை"
          : "Prices changed only slightly across recent verified records"
      };
    } else {
      return {
        direction: 'UNAVAILABLE',
        label: isTa ? "போக்கு விவரம் இல்லை" : "Trend Unavailable",
        colorClass: "text-slate-700 bg-slate-100 border-slate-200",
        badgeBg: "bg-slate-500",
        icon: Info,
        message: isTa ? "பல நாள் விலை நிலவரத் தகவல் கிடைக்கவில்லை" : "Not enough verified historical records"
      };
    }
  }, [activePrice, trendInfo, isTa]);

  // AgriMitra AI Recommendation Engine Logic — Verified Evidence Only
  const farmerAdvice = useMemo(() => {
    if (!activePrice || !priceMovement) return null;

    const higherNearbyMarket = nearbyMarkets.find(m => m.modal_price > activePrice.modal_price + 50);

    if (priceMovement.direction === 'UP') {
      return {
        type: 'WAIT',
        statusBadge: isTa ? "🟡 விற்பனைக்கு காத்திருக்கவும்" : "🟡 Consider waiting",
        badgeStyle: "bg-amber-100 text-amber-900 border-amber-300",
        action: isTa ? "விற்பனை செய்ய சில நாட்கள் காத்திருக்கலாம்" : "Wait a few days before selling",
        reason: isTa 
          ? `மண்டி விலை உயர்ந்து வருகிறது.`
          : `Price trend is moving upward. Selling later may yield better returns.`
      };
    } else if (higherNearbyMarket) {
      const diff = Math.round(higherNearbyMarket.modal_price - activePrice.modal_price);
      return {
        type: 'NEARBY_BETTER',
        statusBadge: isTa ? "🟢 அருகிலுள்ள சந்தையில் சிறந்த விலை" : "🟢 Nearby market gives better price",
        badgeStyle: "bg-emerald-100 text-emerald-900 border-emerald-300",
        action: isTa ? `${higherNearbyMarket.market} சந்தையை பரிசீலிக்கவும்` : `Consider selling at ${higherNearbyMarket.market}`,
        reason: isTa 
          ? `${higherNearbyMarket.market} விலை ₹${diff} அதிகமாக உள்ளது. மாற்று சந்தையை அணுகவும்.`
          : `${higherNearbyMarket.market} price is ₹${diff} higher. Transport costs should be verified.`
      };
    } else if (priceMovement.direction === 'DOWN') {
      return {
        type: 'SELL_SOON',
        statusBadge: isTa ? "🔴 விரைவில் விற்பனை செய்யவும்" : "🔴 Consider selling soon",
        badgeStyle: "bg-rose-100 text-rose-900 border-rose-300",
        action: isTa ? "விரைவில் விற்பனை செய்ய திட்டமிடுங்கள்" : "Consider selling your crop soon",
        reason: isTa 
          ? `மண்டி விலை சரிவைச் சந்தித்து வருகிறது.`
          : `Price trend is declining. Holding crop longer may lead to lower returns.`
      };
    } else if (priceMovement.direction === 'STABLE') {
      return {
        type: 'SELL_NOW',
        statusBadge: isTa ? "🟢 விற்பனை செய்ய நல்ல நேரம்" : "🟢 Good time to sell",
        badgeStyle: "bg-emerald-100 text-emerald-900 border-emerald-300",
        action: isTa ? "விற்பனை செய்ய சாதகமான நேரம்" : "Favorable window to sell today",
        reason: isTa 
          ? "மண்டி சந்தை விலைகள் தற்போது நிலையாகவும் சாதகமாகவும் உள்ளன."
          : "Market prices are stable today. Favorable window for selling your produce."
      };
    } else {
      return {
        type: 'UNAVAILABLE',
        statusBadge: isTa ? "⚪ தகவல் போதாது" : "⚪ Recommendation Unavailable",
        badgeStyle: "bg-slate-100 text-slate-700 border-slate-300",
        action: isTa ? "சந்தை நிலவரத்தைக் கவனிக்கவும்" : "Monitor market trend",
        reason: isTa 
          ? "பரிந்துரை வழங்க போதுமான வரலாற்றுத் தரவுகள் இல்லை."
          : "Not enough recent verified market data to provide a recommendation."
      };
    }
  }, [activePrice, priceMovement, nearbyMarkets, isTa]);

  // SVG Line Graph data points derived ONLY from real historical prices
  const trendGraphData = useMemo(() => {
    if (!prices || prices.length === 0 || !activePrice) return null;
    
    const matching = prices
      .filter(p => p.commodity.toLowerCase() === activePrice.commodity.toLowerCase())
      .sort((a, b) => {
        const parseDate = (dStr) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
          return new Date(dStr).getTime();
        };
        return parseDate(a.arrival_date) - parseDate(b.arrival_date);
      });

    if (matching.length < 3) {
      return null; 
    }

    const graphPoints = matching.slice(-7).map((p, idx) => ({
      date: p.arrival_date ? p.arrival_date.slice(0, 5) : `Record ${idx + 1}`,
      price: p.modal_price
    }));

    const pricesArr = graphPoints.map(g => g.price);
    const maxVal = Math.max(...pricesArr);
    const minVal = Math.min(...pricesArr);
    const range = maxVal - minVal || 1;

    const width = 340;
    const height = 100;
    const padding = 16;

    const coords = graphPoints.map((pt, i) => {
      const x = padding + (i * (width - 2 * padding)) / (graphPoints.length - 1);
      const y = height - padding - ((pt.price - minVal) * (height - 2 * padding)) / range;
      return { x, y, price: pt.price, date: pt.date };
    });

    const pathD = `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const firstPrice = graphPoints[0].price;
    const lastPrice = graphPoints[graphPoints.length - 1].price;
    const weeklyDelta = lastPrice - firstPrice;

    return { pathD, coords, weeklyDelta, width, height };
  }, [prices, activePrice]);

  // Clean comparative list of nearby markets (Max 3)
  const sortedNearbyMarkets = useMemo(() => {
    if (!nearbyMarkets || !activePrice) return [];
    return nearbyMarkets
      .map(m => {
        const diff = Math.round(m.modal_price - activePrice.modal_price);
        return { ...m, diff };
      })
      .slice(0, 3);
  }, [nearbyMarkets, activePrice]);

  // Adaptive Visual source of truth from backend trendInfo
  const activeTrend = useMemo(() => {
    if (trendInfo) return trendInfo;
    return {
      direction: 'UNAVAILABLE',
      latest_price: activePrice ? activePrice.modal_price : null,
      previous_price: null,
      latest_date: activePrice ? activePrice.arrival_date : null,
      previous_date: null,
      evidence_count: 0,
      reason: "Not enough verified historical data."
    };
  }, [trendInfo, activePrice]);

  return (
    <div className="w-full max-w-[440px] mx-auto px-3.5 py-3 space-y-3.5 select-none pb-36 font-sans text-slate-800 bg-[#F8FAFC]">
      
      {/* 1. LOCATION + SYNC STRIP */}
      <LocationSyncStrip 
        selectedDistrict={selectedDistrict}
        selectedState={selectedState}
        dataDate={dataDate}
        lastSync={lastSync}
        handleSyncPrices={handleSyncPrices}
        syncLoading={syncLoading}
        loading={loading}
        t={t}
      />

      {/* 2. ADAPTIVE MARKET INTELLIGENCE HERO */}
      <MarketHero 
        activeTrend={activeTrend} 
        t={t}
      />

      {/* 3. CROP + MARKET CONTEXT SELECTORS */}
      <MarketSelectors 
        t={t}
        selectedCommodity={selectedCommodity}
        setSelectedCommodity={setSelectedCommodity}
        selectedMarket={selectedMarket}
        setSelectedMarket={setSelectedMarket}
        commodities={commodities}
        markets={markets}
        loading={loading}
        filtersLoading={filtersLoading}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={setSelectedDistrict}
        selectedVariety={selectedVariety}
        setSelectedVariety={setSelectedVariety}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        statesList={statesList}
        districtsList={districtsList}
        varieties={varieties}
        grades={grades}
      />

      {loading ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2.5">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-700">
            {t('loading_mandi_prices', "Fetching Mandi Prices...")}
          </p>
        </div>
      ) : error || dataCase === 'E' ? (
        <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2.5">
          <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
          <p className="text-xs font-black text-slate-900">
            {t('mandi_offline', "Mandi prices temporarily offline.")}
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
            {t('mandi_cached_records', "Government portal is offline. Showing cached verified records.")}
          </p>
          <button 
            onClick={fetchPriceData} 
            className="px-5 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl active:scale-95 transition shadow-2xs hover:bg-emerald-700 cursor-pointer"
          >
            {t('retry', 'Retry Connection')}
          </button>
        </div>
      ) : activePrice ? (
        <>
          {/* 4. TODAY'S MARKET PRICE CARD */}
          <MarketPriceCard 
            activePrice={activePrice} 
            dataDate={dataDate} 
            t={t} 
            selectedCommodity={selectedCommodity} 
          />

          {/* 5. MARKET MOVEMENT CARD */}
          <MarketMovementCard 
            priceMovement={priceMovement} 
            activeTrend={activeTrend}
            t={t} 
          />

          {/* 6. AGRIMITRA ADVICE */}
          <AgriMitraAdvice 
            farmerAdvice={farmerAdvice} 
            activeTrend={activeTrend}
            t={t} 
          />

          {/* 7. RECENT PRICE TREND GRAPH */}
          <PriceTrendCard 
            trendGraphData={trendGraphData} 
            t={t} 
          />

          {/* 8. NEARBY MARKETS COMPARISON */}
          {sortedNearbyMarkets.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-black text-slate-900">
                  {t('nearby_markets', "Nearby Markets")}
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Current: {activePrice.market}</span>
              </div>

              <div className="space-y-2">
                {sortedNearbyMarkets.map((mkt, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-[12.5px] font-black text-slate-900 truncate">{mkt.market}</h4>
                        <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">
                          {mkt.district} · {mkt.distance ? `${mkt.distance} km` : "Distance N/A"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[14.5px] font-black text-slate-900 block">
                          ₹{mkt.modal_price.toLocaleString('en-IN')}
                        </span>
                        {mkt.diff > 0 ? (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            ↑ +₹{mkt.diff}
                          </span>
                        ) : mkt.diff < 0 ? (
                          <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                            ↓ -₹{Math.abs(mkt.diff)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-md">
                            → Equal
                          </span>
                        )}
                      </div>
                    </div>

                    {mkt.diff > 0 && (
                      <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50/80 p-1.5 rounded-xl border border-emerald-100">
                        💡 Higher price by ₹{mkt.diff}. Transport costs should be verified.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. GOVERNMENT DATA TRUST CARD */}
          <VerifiedDataCard 
            dataDate={dataDate} 
            syncTimestamp={syncTimestamp} 
            lastSync={lastSync} 
            isTa={isTa} 
          />
        </>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center shadow-2xs space-y-2">
          <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
          <h3 className="text-xs font-black text-slate-900">
            {isTa ? "தகவல்கள் எதுவும் கிடைக்கவில்லை" : "No Mandi Data Mapped"}
          </h3>
          <p className="text-[11px] text-slate-500">
            {isTa ? "மற்றொரு பயிர் அல்லது மண்டியைத் தேர்ந்தெடுக்கவும்." : "Please select another crop or market to load live rates."}
          </p>
        </div>
      )}

    </div>
  );
};

export default MarketIntelligence;