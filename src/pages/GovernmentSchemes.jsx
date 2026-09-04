import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  Info,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Sprout,
  ShieldCheck,
  Droplets,
  Tractor,
  Leaf,
  CreditCard,
  Sun,
  LayoutGrid,
  Sparkles,
  ChevronLeft,
  Share2,
  Building2,
  MoreHorizontal,
  FileText,
  RefreshCw,
  Landmark
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { governmentSchemesApi } from '../services/api/governmentSchemes';

export const GovernmentSchemes = () => {
  const {
    selectedState = "Tamil Nadu",
    setSelectedState,
    selectedDistrict = "Ariyalur",
    setSelectedDistrict,
    user
  } = useAppStore();

  const { t } = useTranslation();

  const statesList = useMemo(() => Object.keys(INDIA_LOCATIONS).sort(), []);
  const districtsList = useMemo(() => {
    return (INDIA_LOCATIONS[selectedState] || []).slice().sort();
  }, [selectedState]);

  // Component Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLocationFilters, setShowLocationFilters] = useState(false);

  // Active Detail View State (Screen 2 Detail Experience)
  const [activeDetailScheme, setActiveDetailScheme] = useState(null);

  // Master loaded schemes for current location & In-Memory Cache
  const schemesCacheRef = React.useRef(new Map());
  const [allLoadedSchemes, setAllLoadedSchemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // Scroll Reset Helper — Ensures Scheme Details View always opens at the absolute TOP
  const resetScrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const containers = document.querySelectorAll('.overflow-y-auto, main, #root, #app-content-area');
    containers.forEach(el => {
      if (el) el.scrollTop = 0;
    });
  };

  const handleOpenDetails = (scheme) => {
    setActiveDetailScheme(scheme);
    resetScrollToTop();
  };

  useEffect(() => {
    if (activeDetailScheme) {
      resetScrollToTop();
      const timer = setTimeout(resetScrollToTop, 50);
      return () => clearTimeout(timer);
    }
  }, [activeDetailScheme]);

  // Fast Data Fetching with In-Memory Location Cache
  const fetchSchemes = React.useCallback(async (state, district, crop, userProfile) => {
    const cacheKey = `${state || 'All'}__${district || 'All'}__${crop || ''}`;

    if (schemesCacheRef.current.has(cacheKey)) {
      setAllLoadedSchemes(schemesCacheRef.current.get(cacheKey));
      setIsLoading(false);
      setIsUnavailable(false);
      return;
    }

    // Only show full loading spinner on initial cold load if no data exists
    if (allLoadedSchemes.length === 0) {
      setIsLoading(true);
    }
    setIsUnavailable(false);

    try {
      const res = await governmentSchemesApi.getGovernmentSchemes({
        state,
        district,
        crop,
        farmerCategory: userProfile?.farmerType || 'Small Farmers',
        schemeType: 'All',
        searchQuery: '',
        userProfile
      });

      if (!res.success || res.reason === 'unavailable') {
        if (!schemesCacheRef.current.has(cacheKey)) {
          setIsUnavailable(true);
          setAllLoadedSchemes([]);
        }
      } else {
        const fetched = res.schemes || [];
        schemesCacheRef.current.set(cacheKey, fetched);
        setAllLoadedSchemes(fetched);
      }
    } catch (err) {
      console.warn("Failed to fetch schemes:", err);
      if (!schemesCacheRef.current.has(cacheKey)) {
        setIsUnavailable(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [allLoadedSchemes.length]);

  useEffect(() => {
    fetchSchemes(
      selectedState,
      selectedDistrict,
      user?.primaryCrop || user?.crop || '',
      user
    );
  }, [selectedState, selectedDistrict, user, fetchSchemes]);

  // Instantaneous in-memory filtering (0ms UI latency for Category, Search, Reset)
  const filteredSchemes = useMemo(() => {
    if (!allLoadedSchemes || allLoadedSchemes.length === 0) return [];

    return allLoadedSchemes.filter(scheme => {
      // 1. Category Filter
      if (selectedCategory && selectedCategory !== 'All') {
        const catLower = selectedCategory.toLowerCase();
        const schemeCatLower = (scheme.category || '').toLowerCase();
        const schemeNameLower = (scheme.name || '').toLowerCase();

        let matchesCat = false;
        if (catLower === 'income') {
          matchesCat = schemeCatLower.includes('income') || schemeCatLower.includes('dbt') || schemeCatLower.includes('financial') || schemeCatLower.includes('credit') || schemeNameLower.includes('kisan');
        } else if (catLower === 'insurance') {
          matchesCat = schemeCatLower.includes('insurance') || schemeNameLower.includes('bima') || schemeNameLower.includes('fasal');
        } else if (catLower === 'irrigation') {
          matchesCat = schemeCatLower.includes('irrigation') || schemeCatLower.includes('water') || schemeNameLower.includes('drop') || schemeNameLower.includes('pmksy');
        } else if (catLower === 'machinery') {
          matchesCat = schemeCatLower.includes('machinery') || schemeCatLower.includes('equipment') || schemeCatLower.includes('mechaniz') || schemeCatLower.includes('subsid');
        } else if (catLower === 'others') {
          const isStandard = ['income', 'insurance', 'irrigation', 'machinery', 'mechaniz'].some(c => schemeCatLower.includes(c));
          matchesCat = !isStandard;
        } else {
          matchesCat = schemeCatLower.includes(catLower) || schemeNameLower.includes(catLower);
        }

        if (!matchesCat) return false;
      }

      // 2. Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (scheme.name || '').toLowerCase().includes(q);
        const matchDesc = (scheme.description || '').toLowerCase().includes(q);
        const matchBenefits = (scheme.benefits || '').toLowerCase().includes(q);
        const matchCat = (scheme.category || '').toLowerCase().includes(q);
        const matchDept = (scheme.department || '').toLowerCase().includes(q);

        if (!matchName && !matchDesc && !matchBenefits && !matchCat && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [allLoadedSchemes, selectedCategory, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  // Category label localization helper
  const getLocalizedCategory = (category) => {
    if (!category) return t('category_all', 'All');
    const cat = category.toLowerCase();
    if (cat.includes('income') || cat.includes('dbt')) return t('cat_income_support', 'Income Support / DBT');
    if (cat.includes('insurance')) return t('category_insurance', 'Crop Insurance');
    if (cat.includes('irrigation') || cat.includes('water')) return t('category_irrigation', 'Irrigation & Water');
    if (cat.includes('credit') || cat.includes('loan')) return t('cat_credit_loans', 'Credit & Loans');
    if (cat.includes('organic') || cat.includes('soil')) return t('cat_organic_soil', 'Organic & Soil Health');
    if (cat.includes('horticulture')) return t('cat_horticulture', 'Horticulture');
    if (cat.includes('marketing')) return t('cat_marketing', 'Marketing');
    if (cat.includes('machinery') || cat.includes('mechaniz') || cat.includes('subsid') || cat.includes('equipment')) return t('cat_mechanization', 'Equipment & Machinery');
    return category;
  };

  // Scheme level badge localization helper
  const getSchemeLevelBadge = (level) => {
    const isCentral = (level || 'Central').toLowerCase().includes('central');
    return isCentral ? t('central_scheme', 'Central Scheme') : t('state_scheme', 'State Scheme');
  };

  // Helper to resolve max 1 small supporting illustration for benefit panel
  const getBenefitIllustration = (scheme) => {
    const name = (scheme?.name || '').toLowerCase();
    const cat = (scheme?.category || '').toLowerCase();

    if (name.includes('pmfby') || cat.includes('insurance')) {
      return '/dashboard-images/govt_umbrella_icon.png';
    }
    if (name.includes('pmksy') || cat.includes('irrigation') || cat.includes('water')) {
      return '/dashboard-images/govt_irrigation_icon.png';
    }
    if (name.includes('kisan') || cat.includes('income') || cat.includes('credit')) {
      return '/dashboard-images/govt_money_bag.png';
    }
    return '/dashboard-images/govt_sprout_icon.png';
  };

  // Farmer-friendly category controls with SVG icons only (No decorative artwork)
  const categoryChips = [
    { id: 'All', label: t('category_all', 'All'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'Income', label: t('cat_income_support', 'Income Support'), icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'Insurance', label: t('category_insurance', 'Insurance'), icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'Irrigation', label: t('category_irrigation', 'Irrigation'), icon: <Droplets className="w-3.5 h-3.5" /> },
    { id: 'Machinery', label: t('cat_mechanization', 'Equipment'), icon: <Tractor className="w-3.5 h-3.5" /> },
    { id: 'Others', label: t('category_other', 'Other'), icon: <MoreHorizontal className="w-3.5 h-3.5" /> }
  ];

  // Helper to parse documents list dynamically from scheme record
  const getDocumentList = (docString) => {
    if (!docString || typeof docString !== 'string') {
      return ['Aadhaar Card', 'Bank Account Details', 'Land Ownership Records', 'Mobile Number'];
    }
    const list = docString.split(/[,;\n•]+/).map(d => d.trim()).filter(Boolean);
    return list.length > 0 ? list : ['Aadhaar Card', 'Bank Account Details', 'Land Ownership Records', 'Mobile Number'];
  };

  // =========================================================================
  // 7. SCHEME DETAILS UX (Farmer Detail Journey — Resets to Scroll Top)
  // =========================================================================
  if (activeDetailScheme) {
    const isRecommended = activeDetailScheme.matchScore && activeDetailScheme.matchScore >= 80;
    const docList = getDocumentList(activeDetailScheme.documents);

    return (
      <div className="w-full max-w-xl md:max-w-2xl mx-auto px-3.5 sm:px-6 py-4 space-y-4 select-none pb-36 font-sans text-slate-800 bg-[#F8FAFC]">
        
        {/* 1. Back & Share Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <button
            onClick={() => setActiveDetailScheme(null)}
            className="flex items-center gap-1.5 text-xs font-black text-slate-900 hover:text-emerald-700 transition cursor-pointer min-h-[36px] px-2 py-1 rounded-lg hover:bg-slate-100/80 active:scale-95 shrink-0"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="break-words">{t('back', 'Back')}</span>
          </button>

          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: activeDetailScheme.name,
                  text: activeDetailScheme.description,
                  url: activeDetailScheme.applicationUrl || window.location.href
                }).catch(() => {});
              }
            }}
            className="flex items-center gap-1.5 text-xs font-black text-slate-900 hover:text-emerald-700 transition cursor-pointer min-h-[36px] px-2 py-1 rounded-lg hover:bg-slate-100/80 active:scale-95 shrink-0"
          >
            <span className="break-words">{t('share', 'Share')}</span>
            <Share2 className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* 2. Top Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isRecommended ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B4D2F] text-white text-[11px] font-extrabold shadow-2xs break-words leading-tight max-w-full">
              <Sparkles className="w-3 h-3 shrink-0" /> {t('recommended_for_farm', 'Recommended for your farm')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[11px] font-extrabold break-words leading-tight max-w-full">
              <span className="shrink-0">🏛️</span> {getSchemeLevelBadge(activeDetailScheme.level)}
            </span>
          )}

          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-100/80 break-words leading-tight max-w-full">
            {getLocalizedCategory(activeDetailScheme.category)}
          </span>
        </div>

        {/* 3. Scheme Identity Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug break-words">
            {activeDetailScheme.name}
          </h1>
          <p className="text-xs font-bold text-slate-500 leading-relaxed break-words">
            {activeDetailScheme.department || activeDetailScheme.name}
          </p>
        </div>

        {/* 4. Benefit Hero Panel */}
        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/40 border border-emerald-200/70 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wider block">
              {t('support_available', 'SUPPORT AVAILABLE')}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-emerald-950 leading-snug break-words">
              {activeDetailScheme.benefits?.split('.')[0] || '₹6,000 per year'}
            </h2>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed break-words">
              {activeDetailScheme.description}
            </p>
          </div>
        </div>

        {/* 5, 6, 7. Structured Scheme Information */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Section 5: Who should check? */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
              <span className="text-base shrink-0">👤</span>
              <span className="break-words">{t('scheme_eligibility', 'Eligibility')}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed pl-5 sm:pl-6 break-words">
              {activeDetailScheme.eligibility}
            </p>
          </div>

          <div className="border-b border-slate-100"></div>

          {/* Section 6: What benefit do you get? */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
              <span className="text-base shrink-0">📅</span>
              <span className="break-words">{t('scheme_benefits', 'Benefits')}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed pl-5 sm:pl-6 break-words">
              {activeDetailScheme.benefits}
            </p>
          </div>

          <div className="border-b border-slate-100"></div>

          {/* Section 7: About this scheme */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="break-words">{t('about_scheme', 'About this scheme')}</span>
            </div>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed pl-5 sm:pl-6 break-words">
              {activeDetailScheme.description}
            </p>
          </div>
        </div>

        {/* 8. Documents You May Need */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 break-words">
            {t('scheme_documents', 'Documents Required')}
          </h3>
          <div className="space-y-2.5">
            {docList.map((doc, i) => (
              <div key={i} className="flex items-start sm:items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0 gap-3">
                <div className="flex items-center gap-2.5 text-slate-800 font-bold min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="break-words leading-snug">{doc}</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              </div>
            ))}
          </div>
        </div>

        {/* 9. LOCKED DISCLAIMER BANNER */}
        <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 text-[11px] text-emerald-950">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-bold block mb-0.5 break-words">{t('eligibility_check_required', 'Eligibility check required')}</span>
            <p className="text-slate-700 leading-relaxed break-words">
              {t('eligibility_disclaimer_desc', 'Eligibility depends on the official scheme guidelines. You can ask our AgriMitra Farm AI for general guidance, but always verify with official sources.')}
            </p>
          </div>
        </div>

        {/* 10. Department Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
            <Building2 className="w-5 h-5 shrink-0" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('department', 'Department')}
            </span>
            <h4 className="text-xs font-black text-slate-900 break-words leading-snug mt-0.5">
              {activeDetailScheme.department || 'Department of Agriculture & Farmers Welfare'}
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 break-words">
              {t('gov_of_india', 'Government of India')}
            </p>
          </div>
        </div>

        {/* 11. Official Apply Action & Trust Footer */}
        <div className="space-y-2.5 pt-2">
          {activeDetailScheme.applicationUrl ? (
            <a
              href={activeDetailScheme.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] py-3.5 px-4 bg-[#0B4D2F] hover:bg-[#083A23] text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center break-words leading-tight cursor-pointer"
            >
              <span>{t('scheme_apply_online', 'Apply on Official Portal')}</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ) : (
            <div className="w-full min-h-[44px] py-3.5 px-4 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center flex items-center justify-center cursor-not-allowed">
              {t('app_link_unavailable', 'Application Link Unavailable')}
            </div>
          )}

          <div className="text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Landmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="break-words">{t('official_portal', 'Official Government Portal')}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 break-words">
              {t('redirect_official_website', 'You will be redirected to the official website')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCHEME DISCOVERY VIEW (Clean, Strict Farmer-Friendly Government Schemes UX)
  // =========================================================================
  return (
    <div className="w-full max-w-xl md:max-w-2xl mx-auto px-3.5 sm:px-6 py-4 space-y-4 select-none pb-36 font-sans text-slate-800 bg-[#F8FAFC]">
      
      {/* 1. APP HEADER & PAGE TITLE */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight break-words">
            {t('govt_schemes_title', 'Government Schemes')}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 break-words leading-relaxed">
            {t('govt_schemes_subtitle', 'Verified agricultural subsidies, credit support & government schemes')}
          </p>
        </div>

        {/* ONE Search Field Only */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder={t('search_schemes_placeholder', 'Search schemes...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* 3. LOCATION CONTEXT */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="truncate">{selectedDistrict}, {selectedState}</span>
        </div>

        <button 
          onClick={() => setShowLocationFilters(!showLocationFilters)}
          className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 transition cursor-pointer min-h-[32px] px-2 py-1 rounded-lg hover:bg-emerald-50/60 active:scale-95"
        >
          <span className="break-words">{t('change_location', 'Change Location')}</span>
          <span className="shrink-0">{showLocationFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Collapsible Location Selector */}
      {showLocationFilters && (
        <div className="bg-white p-3 rounded-2xl border border-emerald-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in">
          <div>
            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 ml-0.5">{t('filter_state', 'State')}</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 ml-0.5">{t('filter_district', 'District')}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {districtsList.map(dt => <option key={dt} value={dt}>{dt}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 4. VERIFIED GOVERNMENT SUPPORT CARD */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/40 border border-emerald-200/70 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 relative overflow-hidden shadow-2xs">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs sm:text-sm leading-snug">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
              ✓
            </div>
            <span className="break-words">{t('verified_gov_sources', 'Verified Government Support')}</span>
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-600 leading-relaxed break-words">
            {t('verified_gov_support_desc', 'Only official government scheme information and official application links are shown.')}
          </p>
        </div>

        <img
          src="/dashboard-images/govt_hero_farmer.png"
          alt="AgriMitra Verified Farmer"
          className="w-16 h-20 sm:w-20 sm:h-24 object-contain shrink-0 drop-shadow-sm self-center"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      {/* 5. COMPACT CATEGORY FILTERS */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categoryChips.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all border whitespace-nowrap min-h-[36px] active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-[#0B4D2F] text-white border-[#0B4D2F] shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="shrink-0">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 6. SCHEME LIST SECTION HEADER */}
      <div className="flex items-baseline justify-between gap-2 pt-1">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 break-words">
          {t('schemes_for_you', 'Schemes for You')}
        </h2>
        <button 
          onClick={handleResetFilters}
          className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0 min-h-[32px] flex items-center"
        >
          {t('see_all', 'See All')}
        </button>
      </div>

      {/* SCHEME LIST CARDS */}
      {isLoading && allLoadedSchemes.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto shrink-0" />
          <p className="text-xs font-black text-slate-700 break-words">
            {t('finding_schemes', 'Finding verified government schemes...')}
          </p>
        </div>
      ) : isUnavailable && allLoadedSchemes.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <AlertCircle className="w-9 h-9 text-rose-500 mx-auto shrink-0" />
          <h3 className="text-xs font-black text-slate-900 break-words">
            {t('schemes_unavailable', 'Government scheme data is currently unavailable.')}
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto break-words">
            {t('schemes_unavailable_desc', 'We are unable to reach the official government source at this moment. Please try again later.')}
          </p>
          <button 
            onClick={() => fetchSchemes(selectedState, selectedDistrict, user?.primaryCrop || user?.crop || '', user)} 
            className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl active:scale-95 transition shadow-2xs hover:bg-emerald-700 cursor-pointer"
          >
            {t('retry_connection', 'Retry Connection')}
          </button>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 text-center shadow-2xs space-y-2.5 px-4">
          <Landmark className="w-9 h-9 text-slate-400 mx-auto shrink-0" />
          <h3 className="text-xs font-black text-slate-900 break-words">
            {t('no_schemes_found_category', 'No agriculture schemes found for this category.')}
          </h3>
          <p className="text-[11px] text-slate-500 break-words">
            {t('adjust_search_query', 'Try adjusting your search query or selecting "All".')}
          </p>
          <button 
            onClick={handleResetFilters}
            className="text-xs font-black text-emerald-700 hover:text-emerald-800 underline block mx-auto pt-1 cursor-pointer"
          >
            {t('reset_filters', 'Reset Filters')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSchemes.map((scheme) => {
            const isRecommended = scheme.matchScore && scheme.matchScore >= 80;

            return (
              <div
                key={scheme.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all hover:shadow-xs"
              >
                {/* A. TOP AREA (Compact Badges) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  {isRecommended ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B4D2F] text-white text-[10.5px] font-extrabold shadow-2xs break-words leading-tight max-w-full">
                      <Sparkles className="w-3 h-3 shrink-0" /> {t('recommended_for_farm', 'Recommended for your farm')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[10.5px] font-extrabold break-words leading-tight max-w-full">
                      <span className="shrink-0">🏛️</span> {getSchemeLevelBadge(scheme.level)}
                    </span>
                  )}

                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-extrabold border border-emerald-100/80 break-words leading-tight max-w-full">
                    {getLocalizedCategory(scheme.category)}
                  </span>
                </div>

                {/* B. SCHEME NAME */}
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words">
                    {scheme.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed break-words">
                    {scheme.description}
                  </p>
                </div>

                {/* C. BENEFIT PANEL */}
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3.5 shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wider block">
                      {t('support_available', 'SUPPORT AVAILABLE')}
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-emerald-950 leading-snug break-words">
                      {scheme.benefits?.split('.')[0] || '₹6,000 per year'}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed break-words">
                      {scheme.benefits}
                    </p>
                  </div>
                </div>

                {/* D. QUICK INFORMATION */}
                <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                    <span className="shrink-0">👤</span>
                    <span className="break-words">{t('who_should_check', 'Who should check?')}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600 pl-5 leading-relaxed break-words">
                    {scheme.eligibility}
                  </p>
                </div>

                {/* E. CARD ACTIONS */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:gap-2.5 pt-1 items-stretch">
                  <button
                    onClick={() => handleOpenDetails(scheme)}
                    className="w-full min-h-[42px] py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl shadow-2xs text-center flex items-center justify-center break-words leading-tight active:scale-95 transition cursor-pointer"
                  >
                    {t('view_details', 'View Details')}
                  </button>

                  {scheme.applicationUrl ? (
                    <a
                      href={scheme.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[42px] py-2.5 px-3 bg-[#0B4D2F] hover:bg-[#083A23] text-white font-black text-xs rounded-xl flex items-center justify-center text-center gap-1.5 shadow-2xs active:scale-95 transition break-words leading-tight"
                    >
                      <span>{t('check_apply_officially', 'Check & Apply Officially')}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <div className="w-full min-h-[42px] py-2.5 px-3 bg-slate-100 text-slate-400 rounded-xl text-[11px] font-bold flex items-center justify-center text-center leading-tight cursor-not-allowed">
                      {t('link_unavailable', 'Link unavailable')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOCKED DISCLAIMER BANNER */}
      {filteredSchemes.length > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 text-[11px] text-emerald-950 mt-6">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-bold block mb-0.5 break-words">{t('eligibility_check_required', 'Eligibility check required')}</span>
            <p className="text-slate-700 leading-relaxed break-words">
              {t('eligibility_disclaimer_desc', 'Eligibility depends on the official scheme guidelines. You can ask our AgriMitra Farm AI for general guidance, but always verify with official sources.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernmentSchemes;
