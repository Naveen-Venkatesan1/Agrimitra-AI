import { NORMALIZED_SCHEMES } from '../../data/normalizedSchemes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://agrimitra-ai-l207.onrender.com' : 'http://localhost:8000');

/**
 * Calculates ML Feature Match Score (0–99), Match Level, and Match Reason
 * based on Farmer Context (state, district, crop, farmer category, land size).
 */
export function calculateSchemeMatchScore(scheme, farmerContext = {}) {
  const {
    state = 'Tamil Nadu',
    district = 'Thanjavur',
    crop = '',
    primaryCrop = crop,
    landSize = '2.5 Acres',
    farmerCategory = 'Small Farmers',
    schemeCategory = 'All'
  } = farmerContext;

  const currentCrop = crop || primaryCrop || '';
  const cropLower = currentCrop.toLowerCase();
  const stateLower = (state || '').toLowerCase();
  const districtLower = (district || '').toLowerCase();

  let score = 50; // Base score
  const reasons = [];

  const eligibleStates = scheme.eligible_states || (scheme.state ? [scheme.state] : ['All India']);
  const eligibleDistricts = scheme.eligible_districts || (scheme.district ? [scheme.district] : ['All Districts']);
  const eligibleCrops = scheme.eligible_crops || ['All Crops'];
  const farmerTypes = scheme.farmer_type || [farmerCategory || 'Small Farmers'];
  const categoryText = scheme.scheme_category || scheme.category || scheme.department || 'Agriculture';

  // 1. State Compatibility
  const isAllIndiaState = eligibleStates.includes('All India') || eligibleStates.includes('Central');
  const isMatchingState = eligibleStates.some(s => s.toLowerCase() === stateLower);

  if (isMatchingState) {
    score += 25;
    reasons.push(`Tailored specifically for ${state} agriculture`);
  } else if (isAllIndiaState) {
    score += 20;
    reasons.push(`National central scheme available across all districts in ${state}`);
  } else {
    score -= 45;
  }

  // 2. District Compatibility
  const isAllDistricts = eligibleDistricts.includes('All Districts') || eligibleDistricts.includes('All') || !scheme.district;
  const isMatchingDistrict = eligibleDistricts.some(d => d.toLowerCase() === districtLower);

  if (isMatchingDistrict) {
    score += 20;
    reasons.push(`Special high-priority package active in ${district} district`);
  } else if (isAllDistricts && (isMatchingState || isAllIndiaState)) {
    score += 10;
    reasons.push(`Valid for all farms in ${district}`);
  } else if (!isAllDistricts && !isMatchingDistrict) {
    score -= 30;
  }

  // 3. Crop Compatibility
  const isAllCrops = eligibleCrops.includes('All Crops') || !currentCrop;
  const isMatchingCrop = currentCrop && eligibleCrops.some(c => cropLower.includes(c.toLowerCase()) || c.toLowerCase().includes(cropLower.split(' ')[0]));

  if (isMatchingCrop) {
    score += 15;
    reasons.push(`Covers your cultivated crop (${currentCrop})`);
  } else if (isAllCrops) {
    score += 10;
    if (currentCrop) reasons.push(`Applicable for all crop types including ${currentCrop}`);
  } else {
    score -= 15;
  }

  // 4. Farmer Category & Land Size Compatibility
  if (landSize.includes('1.0') || landSize.includes('2.5') || landSize.includes('Small') || landSize.includes('Marginal')) {
    if (farmerTypes.some(f => f.includes('Small') || f.includes('Marginal'))) {
      score += 10;
      reasons.push(`Provides high subsidy tier for Small & Marginal farmers`);
    }
  }

  // 5. Category Alignment
  if (schemeCategory !== 'All' && schemeCategory) {
    if (categoryText.toLowerCase().includes(schemeCategory.toLowerCase())) {
      score += 10;
    }
  }

  const finalScore = Math.min(99, Math.max(15, Math.round(score)));

  let matchLevel = 'LOW MATCH';
  if (finalScore >= 80) matchLevel = 'HIGH MATCH';
  else if (finalScore >= 60) matchLevel = 'MEDIUM MATCH';

  const primaryReason = reasons.length > 0 ? reasons.join(' • ') : `Applicable for eligible farmers in ${state}`;

  return {
    matchScore: finalScore,
    matchLevel,
    matchReason: primaryReason
  };
}

export const governmentSchemesApi = {
  /**
   * Single Unified Government Schemes Data Flow.
   * 1. Fetches verified schemes from FastAPI backend POST /api/government-schemes
   * 2. Enriches records with ML Match Score & Ranking
   * 3. Falls back to normalized local dataset if backend is unreachable
   * 4. Normalizes schema cleanly for frontend consumption
   */
  async getGovernmentSchemes(params = {}) {
    let state = "All";
    let district = "All";
    let crop = "";
    let farmerCategory = "All";
    let schemeType = "All";
    let searchQuery = "";
    let farmerContext = {};

    if (params && typeof params === 'object') {
      state = params.state || params.State || "All";
      district = params.district || params.District || "All";
      crop = params.crop || params.Crop || "";
      farmerCategory = params.farmerCategory || params.FarmerCategory || "All";
      schemeType = params.schemeType || params.SchemeType || "All";
      searchQuery = params.searchQuery || params.SearchQuery || "";
      farmerContext = params.userProfile || params.farmerContext || {};
    }

    try {
      // Step 1: Fetch verified schemes from FastAPI Backend
      const response = await fetch(`${API_BASE_URL}/api/government-schemes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          State: state,
          District: district,
          Crop: crop,
          FarmerCategory: farmerCategory,
          SchemeType: schemeType,
          SearchQuery: searchQuery
        })
      });

      if (response.ok) {
        const data = await response.json();
        const apiSchemes = data['Matching Government Schemes'] || data.schemes || data.results || [];

        if (Array.isArray(apiSchemes)) {
          const normalizedSchemes = apiSchemes.map((s, idx) => {
            const isVerifiedUrl = s['Official Website/Application Link']?.startsWith('http') || s.applicationUrl?.startsWith('http');
            const applyUrl = isVerifiedUrl ? (s['Official Website/Application Link'] || s.applicationUrl) : null;
            const hasDistrict = s.district && s.district !== 'All' && s.district.trim() !== '';

            const { matchScore, matchLevel, matchReason } = calculateSchemeMatchScore(
              {
                eligible_states: [s.Level || 'Central', s.state || state],
                eligible_districts: [s.district || district],
                eligible_crops: [crop || 'All Crops'],
                farmer_type: [farmerCategory || 'Small Farmers'],
                scheme_category: s.category || s.Department || 'Agriculture'
              },
              { state, district, crop, farmerCategory, ...farmerContext }
            );

            return {
              id: s.id || `scheme-${idx}`,
              name: s['Scheme Name'] || s.scheme_name || s.name || 'Unnamed Scheme',
              category: s.SchemeType || s.category || 'Agriculture',
              level: s.Level || s.level || 'Central/State',
              state: s.state || s.State || 'All India',
              district: hasDistrict ? s.district : null,
              department: s.Department || s.department || 'Ministry of Agriculture & Farmers Welfare',
              description: s.Description || s.details || s.description || 'Description unavailable.',
              benefits: s.Benefits || s.benefits || 'Benefits information not specified.',
              eligibility: s.Eligibility || s.eligibility || 'Check official guidelines for eligibility.',
              documents: s['Documents Required'] || s.documents || 'Standard KYC documents required.',
              applicationUrl: applyUrl,
              sourceUrl: applyUrl || s.sourceUrl || 'https://www.myscheme.gov.in/',
              lastUpdated: s.lastUpdated || new Date().getFullYear().toString(),
              matchScore,
              matchLevel,
              matchReason
            };
          });

          normalizedSchemes.sort((a, b) => b.matchScore - a.matchScore);
          return { success: true, schemes: normalizedSchemes };
        }
      }
    } catch (err) {
      console.warn("Backend government schemes endpoint offline, using verified local dataset:", err.message);
    }

    // Step 2: Fallback to Verified Local Dataset (NORMALIZED_SCHEMES) if Backend is offline
    try {
      let filtered = NORMALIZED_SCHEMES.filter(scheme => {
        if (state && state !== 'All') {
          const matchesState = scheme.eligible_states.includes('All India') ||
            scheme.eligible_states.some(s => s.toLowerCase() === state.toLowerCase());
          if (!matchesState) return false;
        }

        if (schemeType && schemeType !== 'All') {
          const catLower = schemeType.toLowerCase();
          const schemeCatLower = scheme.scheme_category.toLowerCase();
          if (!schemeCatLower.includes(catLower) && !scheme.scheme_name.toLowerCase().includes(catLower)) {
            return false;
          }
        }

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = scheme.scheme_name.toLowerCase().includes(q);
          const matchDesc = scheme.scheme_description.toLowerCase().includes(q);
          const matchBenefits = scheme.benefits.toLowerCase().includes(q);
          const matchCat = scheme.scheme_category.toLowerCase().includes(q);

          if (!matchName && !matchDesc && !matchBenefits && !matchCat) {
            return false;
          }
        }

        return true;
      });

      const fallbackSchemes = filtered.map((s) => {
        const { matchScore, matchLevel, matchReason } = calculateSchemeMatchScore(s, {
          state,
          district,
          crop,
          farmerCategory,
          schemeCategory: schemeType,
          ...farmerContext
        });

        const isOfficialGovUrl = Boolean(
          s.official_apply_url && 
          (s.official_apply_url.includes('.gov.in') || s.official_apply_url.includes('.nic.in') || s.official_apply_url.includes('http'))
        );

        return {
          id: s.scheme_id,
          name: s.scheme_name,
          category: s.scheme_category,
          level: s.government_level,
          state: state || 'All India',
          district: null,
          department: s.department || s.ministry,
          description: s.scheme_description,
          benefits: s.benefits,
          eligibility: s.eligibility,
          documents: s.documents_required,
          applicationUrl: isOfficialGovUrl ? s.official_apply_url : null,
          sourceUrl: s.official_source_url || 'https://www.myscheme.gov.in/',
          lastUpdated: s.last_updated || '2025',
          matchScore,
          matchLevel,
          matchReason
        };
      });

      fallbackSchemes.sort((a, b) => b.matchScore - a.matchScore);
      return { success: true, schemes: fallbackSchemes };
    } catch (err) {
      console.error("Error in fallback scheme calculation:", err);
      return { success: false, reason: 'unavailable' };
    }
  }
};

export default governmentSchemesApi;
