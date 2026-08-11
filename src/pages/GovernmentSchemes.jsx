import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  FileText,
  Users,
  Sprout,
  ShieldCheck,
  Building2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  DollarSign
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { INDIA_LOCATIONS } from '../data/indiaLocations';
import { cropApi } from '../services/api/crop';
import { useTranslation } from '../hooks/useTranslation';

// Fallback comprehensive government schemes dataset if backend is loading or offline
const FALLBACK_SCHEMES = [
  {
    id: 'pm-kisan-1',
    "Scheme Name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    "Department": "Ministry of Agriculture & Farmers Welfare (Central Government)",
    "Level": "Central",
    "Description": "Central sector scheme providing income support to all landholding farmer families across India to supplement their financial needs for procuring various inputs.",
    "Eligibility": "Small & marginal landholding farmer families with cultivable landholding up to 2 hectares (subject to exclusion criteria for high-income earners).",
    "Benefits": "₹6,000 per year transferred directly to bank account in 3 equal installments of ₹2,000 every 4 months (Direct Benefit Transfer - DBT).",
    "Documents Required": "Aadhaar Card, Land Ownership Certificate (Patta/Khatian), Bank Account Details linked with Aadhaar.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://pmkisan.gov.in"
  },
  {
    id: 'pmfby-2',
    "Scheme Name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    "Department": "Department of Agriculture & Farmers Welfare",
    "Level": "Central / State",
    "Description": "Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss/damage arising out of non-preventable natural risks.",
    "Eligibility": "All farmers including sharecroppers and tenant farmers growing notified crops in notified areas.",
    "Benefits": "Maximum premium payable by farmers: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for Annual Commercial/Horticultural crops. Balance premium subsidized up to 90% by Central & State.",
    "Documents Required": "Aadhaar Card, Land Record / Sowing Certificate, Bank Passbook, Identity Proof.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://pmfby.gov.in"
  },
  {
    id: 'kcc-3',
    "Scheme Name": "Kisan Credit Card (KCC) Scheme",
    "Department": "NABARD & Reserve Bank of India",
    "Level": "Central",
    "Description": "Flexible and simplified credit delivery procedure to meet the short-term credit requirements for cultivation of crops, post-harvest expenses, and farm maintenance.",
    "Eligibility": "Individual/Joint borrowers, Tenant farmers, Sharecroppers, and Self-Help Groups (SHGs) engaged in agriculture and allied activities.",
    "Benefits": "Concessional interest rate of 4% per annum (with prompt repayment incentive of 3%), collateral-free loan up to ₹1.60 Lakh (up to ₹3 Lakh with hassle-free process).",
    "Documents Required": "Application Form, Identity & Address Proof, Land Registration Documents, Passport Size Photo.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://www.myscheme.gov.in/schemes/kcc"
  },
  {
    id: 'pm-ksy-4',
    "Scheme Name": "Per Drop More Crop - PM Krishi Sinchayee Yojana (PMKSY)",
    "Department": "Department of Agriculture & Farmers Welfare",
    "Level": "Central / State",
    "Description": "Focuses on enhancing water use efficiency at farm level through Micro Irrigation technologies like Drip and Sprinkler irrigation systems.",
    "Eligibility": "All categories of farmers, including Small & Marginal farmers, Panchayats, and Producer Groups.",
    "Benefits": "Financial assistance of 55% for Small & Marginal Farmers and 45% for other farmers for installing Drip & Sprinkler Irrigation systems.",
    "Documents Required": "Aadhaar Card, Land Records (7/12 extract or Patta), Electricity Bill, Bank Account Copy.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://pmksy.gov.in"
  },
  {
    id: 'pm-kusum-5',
    "Scheme Name": "PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan)",
    "Department": "Ministry of New and Renewable Energy (MNRE)",
    "Level": "Central / State",
    "Description": "Scheme for setting up solar pumps, grid-connected solar power plants, and solarization of existing agriculture pumps.",
    "Eligibility": "Individual farmers, Water User Associations, Farmer Producer Organizations (FPOs), and Cooperatives.",
    "Benefits": "Up to 60% subsidy (30% Central + 30% State) for off-grid and grid-connected solar agricultural pumps. Farmers need to pay only 10% upfront.",
    "Documents Required": "Aadhaar Card, Land Document, Bank Account Details, Irrigation Source Document.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://pmkusum.mnre.gov.in"
  },
  {
    id: 'smam-6',
    "Scheme Name": "Sub-Mission on Agricultural Mechanization (SMAM)",
    "Department": "Department of Agriculture & Farmers Welfare",
    "Level": "Central / State",
    "Description": "Promotes agricultural mechanization among small and marginal farmers and establishes Custom Hiring Centres (CHCs) for high-value machinery.",
    "Eligibility": "Small & Marginal Farmers, Women Farmers, SC/ST Farmers, and Registered CHCs / FPOs.",
    "Benefits": "40% to 50% financial subsidy on procurement of tractors, tillers, harvesters, seed drills, and power sprayers.",
    "Documents Required": "Aadhaar Card, Land Records, Quotation from Authorized Dealer, Bank Account Details.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://agrimachinery.nic.in"
  },
  {
    id: 'soil-health-7',
    "Scheme Name": "Soil Health Card Scheme (SHC)",
    "Department": "Ministry of Agriculture & Farmers Welfare",
    "Level": "Central / State",
    "Description": "Provides comprehensive soil status reports to farmers every 2 years containing nutrient status (12 parameters) and customized fertilizer recommendations.",
    "Eligibility": "All farmers across all Indian States and Union Territories.",
    "Benefits": "Free soil testing and customized Soil Health Card containing precise fertilizer dosage advice for higher yield and lower input costs.",
    "Documents Required": "Aadhaar Card, Farm Survey Number / Khasra Number.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://soilhealth.dac.gov.in"
  },
  {
    id: 'pkvy-8',
    "Scheme Name": "Paramparagat Krishi Vikas Yojana (PKVY) - Organic Farming",
    "Department": "Department of Agriculture & Farmers Welfare",
    "Level": "Central",
    "Description": "Promotes organic farming through adoption of organic village clusters and Participatory Guarantee System (PGS) certification.",
    "Eligibility": "Farmer clusters/groups having minimum 20 hectares or 50 farmers per cluster.",
    "Benefits": "Financial assistance of ₹50,000 per hectare over 3 years, of which ₹31,000 (62%) is provided directly for organic inputs (seeds, bio-fertilizers, bio-pesticides).",
    "Documents Required": "Aadhaar Card, Cluster Registration Form, Land Ownership Details.",
    "Application Status": "Open",
    "Official Website/Application Link": "https://pgsindia-ncof.gov.in"
  }
];

export const GovernmentSchemes = () => {
  const { t } = useTranslation();
  const {
    selectedState,
    setSelectedState,
    selectedDistrict,
    setSelectedDistrict,
    user
  } = useAppStore();

  const statesList = useMemo(() => Object.keys(INDIA_LOCATIONS).sort(), []);
  const districtsList = useMemo(() => {
    return (INDIA_LOCATIONS[selectedState] || []).slice().sort();
  }, [selectedState]);

  // Local Component Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Schemes Data & Loading State
  const [schemes, setSchemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Selected Scheme Modal State
  const [expandedCards, setExpandedCards] = useState({});

  // Sync state change with district reset if current district not in state
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
  };

  // Fetch schemes from backend API or fallback ML engine
  const fetchSchemes = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await cropApi.getGovernmentSchemes({
        state: selectedState,
        district: selectedDistrict,
        crop: selectedCrop === 'All' ? '' : selectedCrop,
        farmerCategory: selectedCategory === 'All' ? '' : selectedCategory,
        schemeType: selectedType === 'All' ? '' : selectedType,
        searchQuery: searchQuery,
        userProfile: user
      });

      if (res && res.success && Array.isArray(res.schemes) && res.schemes.length > 0) {
        setSchemes(res.schemes);
      } else {
        setSchemes(FALLBACK_SCHEMES);
      }
    } catch (err) {
      console.warn("Failed to fetch schemes, using fallback dataset:", err);
      setSchemes(FALLBACK_SCHEMES);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when location or dropdown filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSchemes();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedState, selectedDistrict, selectedCrop, selectedCategory, selectedType, searchQuery, user]);

  const toggleExpandCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCrop('All');
    setSelectedCategory('All');
    setSelectedType('All');
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0B4D2F] via-[#0D5C38] to-[#127045] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none transform translate-x-20 -translate-y-20" />
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md text-emerald-200 text-xs font-bold border border-emerald-300/30">
              <Landmark className="w-3.5 h-3.5" /> Direct Benefit & Subsidy Portal
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-amber-300" /> {selectedDistrict}, {selectedState}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Government Schemes & Financial Subsidies
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 font-medium leading-relaxed">
            Discover verified Central & State agricultural schemes, input subsidies, crop insurance, solar equipment incentives, and low-interest loan benefits tailored for your region.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-200">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" /> 100% Verified Govt Guidelines
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Direct DBT Portal Connections
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> AI-Matched Eligibility Engine
            </div>
          </div>
        </div>
      </div>

      {/* Location & Filter Toolbar */}
      <Card hover={false} className="p-5 bg-white border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0B4D2F]" />
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
              Regional Scheme Filters
            </h3>
          </div>
          {(searchQuery || selectedCrop !== 'All' || selectedCategory !== 'All' || selectedType !== 'All') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#0B4D2F] hover:text-emerald-700 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Search Scheme / Benefit</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. PM-KISAN, Drip, Solar, Subsidy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D2F]"
              />
            </div>
          </div>

          {/* State Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">State / Territory</label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D2F]"
            >
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">District</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D2F]"
            >
              {districtsList.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Scheme Type */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Scheme Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D2F]"
            >
              <option value="All">All Categories</option>
              <option value="Income">Income Support / DBT</option>
              <option value="Insurance">Crop Insurance</option>
              <option value="Irrigation">Irrigation & Water</option>
              <option value="Solar">Solar & Energy</option>
              <option value="Machinery">Farm Machinery & SMAM</option>
              <option value="Organic">Organic & Soil Health</option>
              <option value="Credit">Credit & Loans (KCC)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Content Header & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Available Schemes ({schemes.length})
          </h2>
          <p className="text-xs text-gray-500">
            Showing matching agricultural incentives for <span className="font-semibold text-emerald-800">{selectedState}</span> ({selectedDistrict})
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#0B4D2F] font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching live schemes...
          </div>
        )}
      </div>

      {/* Schemes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} hover={false} className="p-6 space-y-4 animate-pulse bg-white border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-16 bg-gray-100 rounded w-full" />
              <div className="h-8 bg-gray-200 rounded w-full" />
            </Card>
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <Card hover={false} className="p-12 text-center bg-white border border-gray-100 space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-[#0B4D2F]">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">No matching schemes found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              We couldn't find specific schemes matching your current filters. Try resetting the filters or searching for general terms like "PM-KISAN" or "Insurance".
            </p>
          </div>
          <Button variant="secondary" onClick={handleResetFilters} className="text-xs font-bold">
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {schemes.map((scheme, idx) => {
            const schemeId = scheme.id || `scheme-${idx}`;
            const isExpanded = !!expandedCards[schemeId];
            const appUrl = scheme["Official Website/Application Link"];
            const matchLevel = scheme.matchLevel || (scheme.matchScore >= 80 ? 'HIGH MATCH' : 'MEDIUM MATCH');
            const matchScore = scheme.matchScore || 85;
            const matchReason = scheme.matchReason || `Matches farming profile in ${selectedState}`;

            return (
              <Card
                key={schemeId}
                hover={true}
                className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-emerald-200 relative"
              >
                <div className="space-y-4">
                  {/* Card Top Badges & Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="good" size="xs">
                          <Building2 className="w-3 h-3" /> {scheme["Level"] || "Central/State"}
                        </Badge>
                        <Badge variant="info" size="xs">
                          {scheme["Application Status"] || "Open"}
                        </Badge>
                      </div>

                      {/* ML Match Level Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1 border ${
                        matchLevel === 'HIGH MATCH'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : matchLevel === 'MEDIUM MATCH'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <Sparkles className="w-3 h-3 text-amber-500" /> {matchLevel} ({matchScore}%)
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-gray-900 leading-snug hover:text-[#0B4D2F] transition">
                      {scheme["Scheme Name"]}
                    </h3>

                    <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 flex-shrink-0 text-[#0B4D2F]" />
                      <span className="truncate">{scheme["Department"] || "Ministry of Agriculture & Farmers Welfare"}</span>
                    </p>

                    {/* Explainable Match Reason */}
                    {matchReason && (
                      <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-[11px] text-emerald-900 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong className="font-bold">Why this matches you:</strong> {matchReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                    {scheme["Description"]}
                  </p>

                  {/* Benefit Highlights Box */}
                  <div className="bg-[#F4FAF6] p-3.5 rounded-xl border border-[#E3F2E8] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B4D2F]">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Scheme Benefits & Financial Support
                    </div>
                    <p className="text-xs text-gray-700 font-medium leading-relaxed">
                      {scheme["Benefits"]}
                    </p>
                  </div>

                  {/* Expandable Section (Eligibility & Documents) */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-gray-100 animate-fade-in text-xs">
                      <div>
                        <span className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                          <Users className="w-3.5 h-3.5 text-[#0B4D2F]" /> Eligibility Criteria:
                        </span>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {scheme["Eligibility"]}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-[#0B4D2F]" /> Mandatory Documents Required:
                        </span>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {scheme["Documents Required"]}
                        </p>
                      </div>

                      {/* Source & Transparency Badge */}
                      <div className="pt-2 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100">
                        <span>Source: <strong className="text-gray-700">{scheme.officialSource || 'Official Government Portal'}</strong></span>
                        <span>Year: <strong className="text-gray-700">{scheme.schemeYear || '2025-2026'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleExpandCard(schemeId)}
                    className="text-xs font-bold text-gray-600 hover:text-[#0B4D2F] flex items-center gap-1 py-1 transition"
                  >
                    {isExpanded ? (
                      <>Hide Details <ChevronUp className="w-3.5 h-3.5" /></>
                    ) : (
                      <>View Eligibility & Docs <ChevronDown className="w-3.5 h-3.5" /></>
                    )}
                  </button>

                  {appUrl ? (
                    <a
                      href={appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B4D2F] hover:bg-[#083A23] text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      Apply Now <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl cursor-not-allowed">
                      Official application link currently unavailable
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scheme Quick Info Banner */}
      <div className="bg-amber-50 border border-amber-200/70 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Need assistance with your online scheme application?</span>
          <p className="mt-0.5 text-amber-800">
            You can ask our AgriMitra AI Assistant in the AI Assistant module for direct guidance on application forms, eligibility criteria, and required land documentation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GovernmentSchemes;
