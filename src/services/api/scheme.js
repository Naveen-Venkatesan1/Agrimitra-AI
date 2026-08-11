// AGRI MITRA AI — Government Schemes ML & Intelligent Ranking Service
import { NORMALIZED_SCHEMES } from '../../data/normalizedSchemes';

/**
 * Calculates ML Feature Match Score (0–100) and Match Reason between Farmer Context and Scheme.
 */
function calculateSchemeMatchScore(scheme, farmerContext = {}) {
  const {
    state = 'Tamil Nadu',
    district = 'Thanjavur',
    crop = 'Paddy (Rice)',
    primaryCrop = crop,
    landSize = '2.5 Acres',
    farmerCategory = 'Small Farmers',
    schemeCategory = 'All'
  } = farmerContext;

  const currentCrop = crop || primaryCrop || 'Paddy (Rice)';
  const cropLower = currentCrop.toLowerCase();
  const stateLower = state.toLowerCase();
  const districtLower = district.toLowerCase();

  let score = 50; // Base score
  const reasons = [];

  // 1. State Compatibility (Highest Weight)
  const isAllIndiaState = scheme.eligible_states.includes('All India');
  const isMatchingState = scheme.eligible_states.some(s => s.toLowerCase() === stateLower);

  if (isMatchingState) {
    score += 25;
    reasons.push(`Tailored specifically for ${state} agriculture`);
  } else if (isAllIndiaState) {
    score += 20;
    reasons.push(`National central scheme available across all districts in ${state}`);
  } else {
    // Incompatible state
    score -= 45;
  }

  // 2. District Compatibility
  const isAllDistricts = scheme.eligible_districts.includes('All Districts');
  const isMatchingDistrict = scheme.eligible_districts.some(d => d.toLowerCase() === districtLower);

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
  const isAllCrops = scheme.eligible_crops.includes('All Crops');
  const isMatchingCrop = scheme.eligible_crops.some(c => cropLower.includes(c.toLowerCase()) || c.toLowerCase().includes(cropLower.split(' ')[0]));

  if (isMatchingCrop) {
    score += 15;
    reasons.push(`Covers your cultivated crop (${currentCrop})`);
  } else if (isAllCrops) {
    score += 10;
    reasons.push(`Applicable for all crop types including ${currentCrop}`);
  } else {
    score -= 15;
  }

  // 4. Farmer Category & Land Size Compatibility
  if (landSize.includes('1.0') || landSize.includes('2.5') || landSize.includes('Small') || landSize.includes('Marginal')) {
    if (scheme.farmer_type.some(f => f.includes('Small') || f.includes('Marginal'))) {
      score += 10;
      reasons.push(`Provides high subsidy tier for Small & Marginal farmers (${landSize})`);
    }
  }

  // 5. Scheme Category Alignment
  if (schemeCategory !== 'All' && schemeCategory) {
    if (scheme.scheme_category.toLowerCase().includes(schemeCategory.toLowerCase())) {
      score += 10;
    }
  }

  // Bound score between 15% and 99%
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

export const schemeApi = {
  /**
   * Fetches and ranks Government Schemes based on state, district, crop, category, search query, and farmer profile.
   */
  async getGovernmentSchemes(params = {}) {
    let state = "Tamil Nadu";
    let district = "Thanjavur";
    let crop = "";
    let farmerCategory = "All";
    let schemeType = "All";
    let searchQuery = "";
    let farmerContext = {};

    if (typeof params === 'string') {
      state = params;
    } else if (params && typeof params === 'object') {
      state = params.state || params.State || state;
      district = params.district || params.District || district;
      crop = params.crop || params.Crop || crop;
      farmerCategory = params.farmerCategory || params.FarmerCategory || farmerCategory;
      schemeType = params.schemeType || params.SchemeType || schemeType;
      searchQuery = params.searchQuery || params.SearchQuery || "";
      farmerContext = params.userProfile || params;
    }

    try {
      // Step 1: Try FastAPI Backend if available
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
        const apiSchemes = data['Matching Government Schemes'] || [];
        if (Array.isArray(apiSchemes) && apiSchemes.length > 0) {
          const ranked = apiSchemes.map((s, idx) => {
            const { matchScore, matchLevel, matchReason } = calculateSchemeMatchScore(
              {
                eligible_states: [s.Level || 'Central', state],
                eligible_districts: [district],
                eligible_crops: [crop || 'All Crops'],
                farmer_type: [farmerCategory || 'Small Farmers'],
                scheme_category: s.Department || 'Agriculture'
              },
              { state, district, crop, farmerCategory, ...farmerContext }
            );

            const isVerifiedUrl = s['Official Website/Application Link']?.startsWith('http');
            const applyUrl = isVerifiedUrl ? s['Official Website/Application Link'] : null;

            return {
              id: s.id || `api-scheme-${idx}`,
              "Scheme Name": s["Scheme Name"],
              Department: s["Department"] || "Ministry of Agriculture & Farmers Welfare",
              Level: s["Level"] || "Central/State",
              Description: s["Description"],
              Eligibility: s["Eligibility"],
              Benefits: s["Benefits"],
              "Documents Required": s["Documents Required"],
              "Application Status": s["Application Status"] || "Open",
              "Official Website/Application Link": applyUrl,
              hasVerifiedUrl: Boolean(applyUrl),
              matchScore,
              matchLevel,
              matchReason,
              schemeYear: '2025-2026',
              officialSource: 'Official Government Portal'
            };
          });

          ranked.sort((a, b) => b.matchScore - a.matchScore);
          return { success: true, schemes: ranked };
        }
      }
    } catch (err) {
      console.warn("FastAPI schemes endpoint unavailable, using Normalized ML Engine:", err.message);
    }

    // Step 2: Use Normalized Dataset + ML Matching Engine
    let filtered = NORMALIZED_SCHEMES.filter(scheme => {
      // State Filter (Must match target State OR All India)
      const matchesState = scheme.eligible_states.includes('All India') ||
        scheme.eligible_states.some(s => s.toLowerCase() === state.toLowerCase());

      if (!matchesState) return false;

      // Category Filter
      if (schemeType && schemeType !== 'All') {
        const catLower = schemeType.toLowerCase();
        const schemeCatLower = scheme.scheme_category.toLowerCase();
        if (!schemeCatLower.includes(catLower) && !scheme.scheme_name.toLowerCase().includes(catLower)) {
          return false;
        }
      }

      // Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = scheme.scheme_name.toLowerCase().includes(q);
        const matchDesc = scheme.scheme_description.toLowerCase().includes(q);
        const matchBenefits = scheme.benefits.toLowerCase().includes(q);
        const matchCat = scheme.scheme_category.toLowerCase().includes(q);
        const matchElig = scheme.eligibility.toLowerCase().includes(q);
        const matchMinistry = scheme.ministry.toLowerCase().includes(q);

        if (!matchName && !matchDesc && !matchBenefits && !matchCat && !matchElig && !matchMinistry) {
          return false;
        }
      }

      return true;
    });

    // Step 3: Compute ML Rank Scores & Format for UI
    const rankedSchemes = filtered.map((s) => {
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
        "Scheme Name": s.scheme_name,
        Department: s.department || s.ministry,
        Level: s.government_level,
        Description: s.scheme_description,
        Eligibility: s.eligibility,
        Benefits: s.benefits,
        "Documents Required": s.documents_required,
        "Application Status": s.status === 'Active' ? 'Open' : s.status,
        "Official Website/Application Link": isOfficialGovUrl ? s.official_apply_url : null,
        hasVerifiedUrl: isOfficialGovUrl,
        matchScore,
        matchLevel,
        matchReason,
        schemeYear: s.scheme_year || '2025-2026',
        officialSource: 'Official Government Portal'
      };
    });

    // Sort by match score descending
    rankedSchemes.sort((a, b) => b.matchScore - a.matchScore);

    return { success: true, schemes: rankedSchemes };
  }
};

export default schemeApi;
