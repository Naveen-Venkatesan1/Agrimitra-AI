import requests
import time
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Cache for verified schemes
_SCHEMES_CACHE = {
    "data": [],
    "last_updated": 0
}
CACHE_TTL = 3600  # 1 hour

# Curated registry of REAL government schemes
REAL_SCHEMES_REGISTRY = [
    {
        "id": "central-pmkisan",
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "category": "Income Support / DBT",
        "level": "Central",
        "state": "All India",
        "district": "All",
        "department": "Department of Agriculture & Farmers Welfare",
        "description": "A central sector scheme to provide income support to all landholding farmers' families in the country to supplement their financial needs.",
        "benefits": "₹6,000 per year transferred directly to the bank accounts of farmers in three equal installments of ₹2,000.",
        "eligibility": "All landholding farmers' families, subject to certain exclusion criteria related to higher income status.",
        "documents": "Aadhaar Card, Land Holding Papers, Bank Account Details.",
        "applicationUrl": "https://pmkisan.gov.in/",
        "sourceUrl": "https://pmkisan.gov.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "central-pmfby",
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "category": "Crop Insurance",
        "level": "Central",
        "state": "All India",
        "district": "All",
        "department": "Ministry of Agriculture & Farmers Welfare",
        "description": "Provides comprehensive insurance cover against failure of the crop thus helping in stabilising the income of the farmers.",
        "benefits": "Maximum premium payable by farmers is 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops. The rest is borne by the Government.",
        "eligibility": "All farmers growing notified crops in a notified area during the season who have insurable interest in the crop.",
        "documents": "Aadhaar Card, Bank Passbook, Land Records/Sowing Certificate.",
        "applicationUrl": "https://pmfby.gov.in/",
        "sourceUrl": "https://pmfby.gov.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "central-pmksy",
        "name": "Per Drop More Crop (PMKSY)",
        "category": "Irrigation & Water",
        "level": "Central",
        "state": "All India",
        "district": "All",
        "department": "Department of Agriculture & Farmers Welfare",
        "description": "Focuses on enhancing water use efficiency at farm level through Micro Irrigation technologies viz. Drip and Sprinkler irrigation systems.",
        "benefits": "Financial assistance/subsidy provided to farmers for installing micro-irrigation systems. Subsidy varies by state and farmer category.",
        "eligibility": "All farmers, with special focus on small & marginal farmers.",
        "documents": "Aadhaar Card, Land Records, Quotation for Irrigation System.",
        "applicationUrl": "https://pmksy.gov.in/",
        "sourceUrl": "https://pmksy.gov.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "central-pkvy",
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "category": "Organic & Soil Health",
        "level": "Central",
        "state": "All India",
        "district": "All",
        "department": "Department of Agriculture & Farmers Welfare",
        "description": "A traditional farming improvement programme to promote organic farming through the adoption of organic village clusters.",
        "benefits": "Financial assistance of ₹50,000 per hectare for 3 years is provided for organic inputs, certification, and marketing.",
        "eligibility": "Farmers must form a cluster (minimum 20 hectares or 50 farmers).",
        "documents": "Cluster Registration Documents, Aadhaar, Land Details.",
        "applicationUrl": "https://pgsindia-ncof.gov.in/",
        "sourceUrl": "https://pgsindia-ncof.gov.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "central-nbm",
        "name": "National Bamboo Mission",
        "category": "Horticulture",
        "level": "Central",
        "state": "All India",
        "district": "All",
        "department": "Ministry of Agriculture & Farmers Welfare",
        "description": "Aims to increase the area under bamboo plantation in non-forest government and private lands to supplement farm income.",
        "benefits": "Subsidies for bamboo plantation, setting up nurseries, and bamboo processing units.",
        "eligibility": "Farmers, entrepreneurs, and FPOs engaged in bamboo cultivation or processing.",
        "documents": "Aadhaar, Land Records, Project Proposal (for processing units).",
        "applicationUrl": "https://nbm.nic.in/",
        "sourceUrl": "https://nbm.nic.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "tn-horticulture",
        "name": "Tamil Nadu State Horticulture Development Scheme",
        "category": "Horticulture",
        "level": "State",
        "state": "Tamil Nadu",
        "district": "All",
        "department": "Tamil Nadu Department of Horticulture and Plantation Crops",
        "description": "State-level scheme to promote cultivation of high-yielding varieties of fruits, vegetables, spices, and plantation crops.",
        "benefits": "Subsidies for planting materials, inputs, and protected cultivation structures (greenhouses/shade nets).",
        "eligibility": "Farmers in Tamil Nadu possessing land suitable for horticulture.",
        "documents": "Aadhaar, Chitta/Adangal, Bank Passbook, Passport Size Photo.",
        "applicationUrl": "https://tnhorticulture.tn.gov.in/tnhortnet/",
        "sourceUrl": "https://tnhorticulture.tn.gov.in/",
        "lastUpdated": "2026"
    },
    {
        "id": "tn-agrimarketing",
        "name": "Uzhavar Sandhai (Farmers Market) Scheme",
        "category": "Marketing",
        "level": "State",
        "state": "Tamil Nadu",
        "district": "All",
        "department": "Department of Agricultural Marketing and Agri Business",
        "description": "Facilitates direct contact between farmers and consumers without the intervention of middlemen.",
        "benefits": "Free stall allocation, free weighing scales, and fair price determination daily to ensure better profit margins for farmers.",
        "eligibility": "Bona fide farmers of Tamil Nadu cultivating vegetables/fruits.",
        "documents": "Identity Card issued by the Department of Agriculture/Horticulture.",
        "applicationUrl": "https://agrimark.tn.gov.in/",
        "sourceUrl": "https://agrimark.tn.gov.in/",
        "lastUpdated": "2026"
    }
]

def verify_url(scheme):
    """
    Pings the scheme's sourceUrl to verify it's still alive.
    If it fails, returns None. If it succeeds, returns the scheme.
    """
    url = scheme.get("sourceUrl")
    if not url:
        return scheme # Keep it if no URL to verify

    try:
        # Use verify=False to prevent failing on government sites with poor SSL config
        res = requests.head(url, timeout=5, verify=False, allow_redirects=True)
        if res.status_code < 400 or res.status_code in [403, 405]: 
            # 403/405 often means WAF blocked the HEAD request, but site is likely up
            return scheme
            
        # Fallback to GET if HEAD failed
        res_get = requests.get(url, timeout=5, verify=False, stream=True)
        if res_get.status_code < 400 or res_get.status_code in [403, 405]:
            return scheme
            
        logger.warning(f"Scheme URL verification failed for {scheme['id']} with status {res.status_code}")
        return None
    except Exception as e:
        logger.warning(f"Scheme URL verification failed for {scheme['id']}: {str(e)}")
        return None

def get_verified_schemes():
    """
    Returns the list of verified schemes, using a cache to avoid spamming servers.
    """
    global _SCHEMES_CACHE
    now = time.time()
    
    if _SCHEMES_CACHE["data"] and (now - _SCHEMES_CACHE["last_updated"]) < CACHE_TTL:
        return _SCHEMES_CACHE["data"]
        
    verified = []
    
    # Verify in parallel
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(verify_url, REAL_SCHEMES_REGISTRY))
        
    verified = [s for s in results if s is not None]
    
    _SCHEMES_CACHE["data"] = verified
    _SCHEMES_CACHE["last_updated"] = now
    
    return verified

def get_filtered_schemes(state="All", district="All", crop="", farmer_category="All", scheme_type="All", search_query=""):
    """
    Filters the verified schemes based on user criteria.
    """
    all_schemes = get_verified_schemes()
    filtered = []
    
    for s in all_schemes:
        # State Filter
        if state and state != "All":
            if s["state"] != "All India" and s["state"].lower() != state.lower():
                continue
                
        # District Filter (Only apply if scheme is explicitly district-specific)
        if district and district != "All":
            if s["district"] != "All" and s["district"].lower() != district.lower():
                continue
                
        # Scheme Type / Category Filter
        if scheme_type and scheme_type != "All":
            # Match loosely
            if scheme_type.lower() not in s["category"].lower() and scheme_type.lower() not in s["name"].lower():
                continue
                
        # Search Query
        if search_query:
            sq = search_query.lower()
            if sq not in s["name"].lower() and sq not in s["description"].lower() and sq not in s["benefits"].lower():
                continue
                
        filtered.append(s)
        
    return filtered
