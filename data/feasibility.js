/**
 * data/feasibility.js
 * Market anchors for the development proforma (Feasibility tab).
 * All figures are 2026 calendar-year anchors derived from publicly reported
 * CBRE / Altus / Colliers / JLL Canadian market reports. They are defaults
 * the user is expected to override at the scenario level — never authoritative.
 *
 * Structure:
 *   FEAS_RENT[city][assetClass]     → market rent $/sf NLA / yr
 *   FEAS_OPEX[city][assetClass]     → operating expense $/sf NLA / yr (taxes, insurance, M&O, mgmt)
 *   FEAS_CAP[city][assetClass]      → market going-in cap rate %
 *   FEAS_VACANCY[city][assetClass]  → stabilized vacancy %
 *   FEAS_CONDO_PSF[city][assetClass]→ condo / for-sale revenue $/sf NSA
 *   FEAS_HOTEL[city][tier]          → {adr, occ} for RevPAR build-up
 *
 * Asset class taxonomy is the proforma layer (apartment / condo / office /
 * industrial / retail / hotel), distinct from the Altus building-type taxonomy.
 * `mapAssetClass(typeId)` resolves an Altus type to a proforma class.
 *
 * Exposes: FEAS_RENT, FEAS_OPEX, FEAS_CAP, FEAS_VACANCY, FEAS_CONDO_PSF,
 *          FEAS_HOTEL, FEAS_DEFAULTS, mapAssetClass, getMarketDefaults.
 * Depends on: nothing (pure data).
 */

// ---------------------------------------------------------------------------
// Market rent — $/sf NLA / yr (rental product). Net rents where convention is
// net (office/industrial/retail); gross monthly-equivalent annualized for
// apartment. Mid-points of reported 2026 ranges.
// ---------------------------------------------------------------------------
const FEAS_RENT = {
  tor: {apartment:36, office:32, industrial:17, retail:42},
  van: {apartment:42, office:42, industrial:21, retail:52},
  cal: {apartment:24, office:22, industrial:14, retail:30},
  edm: {apartment:22, office:20, industrial:13, retail:26},
  win: {apartment:20, office:18, industrial:11, retail:22},
  ott: {apartment:28, office:24, industrial:14, retail:30},
  mtl: {apartment:26, office:22, industrial:13, retail:32},
  hal: {apartment:24, office:20, industrial:13, retail:26},
  stj: {apartment:20, office:18, industrial:12, retail:22},
};

// ---------------------------------------------------------------------------
// Operating expenses — $/sf NLA / yr. Includes property tax, insurance,
// maintenance & operations, and management fee. For apartment this is the
// landlord-borne opex on a gross-rent basis; for commercial this is the
// recoverable + non-recoverable bundle the developer underwrites.
// ---------------------------------------------------------------------------
const FEAS_OPEX = {
  tor: {apartment:11, office:24, industrial:5.5, retail:14},
  van: {apartment:11, office:25, industrial:6.0, retail:15},
  cal: {apartment:9,  office:18, industrial:4.5, retail:11},
  edm: {apartment:9,  office:17, industrial:4.0, retail:10},
  win: {apartment:8,  office:15, industrial:4.0, retail:9},
  ott: {apartment:10, office:18, industrial:4.5, retail:11},
  mtl: {apartment:9,  office:17, industrial:4.5, retail:11},
  hal: {apartment:8,  office:16, industrial:4.0, retail:10},
  stj: {apartment:8,  office:15, industrial:4.0, retail:9},
};

// ---------------------------------------------------------------------------
// Going-in cap rates — %. Stabilized institutional product. Apartment is
// purpose-built rental; industrial is logistics/Class A; retail is
// neighbourhood/grocery-anchored mid-point.
// ---------------------------------------------------------------------------
const FEAS_CAP = {
  tor: {apartment:4.50, office:7.00, industrial:5.50, retail:6.25, hotel:7.50},
  van: {apartment:4.25, office:6.50, industrial:5.00, retail:5.75, hotel:7.25},
  cal: {apartment:5.25, office:8.50, industrial:6.25, retail:6.75, hotel:8.50},
  edm: {apartment:5.50, office:9.00, industrial:6.50, retail:7.00, hotel:8.75},
  win: {apartment:5.75, office:8.50, industrial:6.75, retail:7.50, hotel:9.00},
  ott: {apartment:5.00, office:7.50, industrial:6.00, retail:6.50, hotel:8.00},
  mtl: {apartment:4.75, office:7.25, industrial:5.75, retail:6.25, hotel:7.75},
  hal: {apartment:5.50, office:8.00, industrial:6.50, retail:7.00, hotel:8.50},
  stj: {apartment:6.00, office:9.00, industrial:7.00, retail:7.75, hotel:9.50},
};

// ---------------------------------------------------------------------------
// Stabilized vacancy — %. CMHC primary rental for apartment; CBRE/Colliers
// Q4 2025 averages for commercial.
// ---------------------------------------------------------------------------
const FEAS_VACANCY = {
  tor: {apartment:1.5, office:18, industrial:4.0, retail:2.0},
  van: {apartment:1.0, office:11, industrial:3.0, retail:1.5},
  cal: {apartment:3.0, office:25, industrial:5.0, retail:3.5},
  edm: {apartment:4.5, office:22, industrial:5.5, retail:4.5},
  win: {apartment:3.5, office:14, industrial:4.0, retail:4.0},
  ott: {apartment:2.5, office:13, industrial:3.5, retail:3.0},
  mtl: {apartment:1.5, office:17, industrial:4.5, retail:2.5},
  hal: {apartment:1.0, office:14, industrial:4.0, retail:3.0},
  stj: {apartment:5.0, office:15, industrial:5.0, retail:5.0},
};

// ---------------------------------------------------------------------------
// Condo / for-sale revenue — $/sf NSA. Used for condo, townhouse, custom-home
// scenarios. Mid-points of reported new-construction launch pricing.
// ---------------------------------------------------------------------------
const FEAS_CONDO_PSF = {
  tor: {condo:1300, townhouse:1100, sfr:1450},
  van: {condo:1500, townhouse:1300, sfr:1700},
  cal: {condo:700,  townhouse:600,  sfr:750},
  edm: {condo:600,  townhouse:525,  sfr:650},
  win: {condo:550,  townhouse:475,  sfr:575},
  ott: {condo:850,  townhouse:725,  sfr:900},
  mtl: {condo:900,  townhouse:775,  sfr:950},
  hal: {condo:750,  townhouse:625,  sfr:800},
  stj: {condo:500,  townhouse:425,  sfr:525},
};

// ---------------------------------------------------------------------------
// Hotel — Average Daily Rate ($) and stabilized occupancy (%). Tier mapping:
// budget = limited service; suite = upper-midscale extended stay; full = full
// service / upper upscale. Values reflect reported 2025 actuals trended to
// 2026 with modest growth.
// ---------------------------------------------------------------------------
const FEAS_HOTEL = {
  tor: {budget:{adr:175, occ:72}, suite:{adr:225, occ:74}, full:{adr:340, occ:73}},
  van: {budget:{adr:185, occ:74}, suite:{adr:240, occ:76}, full:{adr:370, occ:76}},
  cal: {budget:{adr:140, occ:65}, suite:{adr:180, occ:68}, full:{adr:240, occ:67}},
  edm: {budget:{adr:130, occ:62}, suite:{adr:165, occ:64}, full:{adr:220, occ:63}},
  win: {budget:{adr:120, occ:62}, suite:{adr:150, occ:64}, full:{adr:195, occ:63}},
  ott: {budget:{adr:155, occ:68}, suite:{adr:195, occ:70}, full:{adr:265, occ:70}},
  mtl: {budget:{adr:160, occ:70}, suite:{adr:200, occ:72}, full:{adr:280, occ:73}},
  hal: {budget:{adr:140, occ:68}, suite:{adr:180, occ:70}, full:{adr:240, occ:70}},
  stj: {budget:{adr:130, occ:64}, suite:{adr:165, occ:66}, full:{adr:210, occ:65}},
};

// ---------------------------------------------------------------------------
// Non-market defaults: financing, contingency, target spread.
// ---------------------------------------------------------------------------
const FEAS_DEFAULTS = {
  landCost:        0,    // $ — user must enter
  contingencyPct:  5,    // % of hard cost
  ltcPct:          65,   // loan-to-cost %
  interestRate:    7.0,  // % annual on construction loan
  constructionMo:  18,   // construction term, months
  avgDrawPct:      55,   // % of facility — average outstanding for interest carry
  developerFeePct: 4,    // % of total project cost
  targetSpreadBps: 150,  // basis points over market cap rate for go signal
  // Rental defaults (overridable — initialized from market on city change)
  nlaEfficiency:   85,   // NLA / GFA % for buildings without explicit input
  // Condo defaults
  condoEfficiency: 80,   // NSA / GFA %
  condoSGA:        4,    // sales/marketing/G&A as % of revenue
  condoMargin:     15,   // target developer margin %
  // Hotel defaults
  hotelGOPpct:     35,   // GOP margin (pre-FF&E reserve, mgmt fee)
  hotelMgmtFee:    3,    // % of revenue
  hotelFFEReserve: 4,    // % of revenue
};

// ---------------------------------------------------------------------------
// Map an Altus building-type id to a proforma asset class.
// Returns one of: apartment, condo, townhouse, sfr, office, industrial,
// retail, hotel-budget, hotel-suite, hotel-full, or null (unsupported).
// ---------------------------------------------------------------------------
function mapAssetClass(typeId) {
  if (!typeId) return null;
  // Rental residential
  // condo_* types are sold in Canada — treat as condo unless flagged otherwise
  if (typeId === "uni_residence") return "apartment";
  if (typeId.startsWith("seniors_")) return "apartment";
  // For-sale residential
  if (typeId.startsWith("condo_"))  return "condo";
  if (typeId.startsWith("townhouse_")) return "townhouse";
  if (typeId === "sfr" || typeId === "custom_home") return "sfr";
  // Office
  if (typeId.startsWith("office_") && !typeId.includes("fitout")) return "office";
  // Industrial
  if (["warehouse","distribution","storage_urban"].includes(typeId)) return "industrial";
  // Retail
  if (typeId.startsWith("retail_")) return "retail";
  // Hotel
  if (typeId === "hotel_budget") return "hotel-budget";
  if (typeId === "hotel_suite")  return "hotel-suite";
  if (typeId === "hotel_full")   return "hotel-full";
  return null;
}

// ---------------------------------------------------------------------------
// Resolve market defaults for a given city + asset class. Returns a flat
// object of values to seed the proforma. Returns null if class is unsupported.
// ---------------------------------------------------------------------------
function getMarketDefaults(city, assetClass) {
  if (!assetClass) return null;
  const out = {};
  // Rental
  if (["apartment","office","industrial","retail"].includes(assetClass)) {
    out.rent    = FEAS_RENT[city]?.[assetClass]    ?? 0;
    out.opex    = FEAS_OPEX[city]?.[assetClass]    ?? 0;
    out.cap     = FEAS_CAP[city]?.[assetClass]     ?? 0;
    out.vacancy = FEAS_VACANCY[city]?.[assetClass] ?? 0;
    out.kind    = "rental";
    return out;
  }
  // For-sale
  if (["condo","townhouse","sfr"].includes(assetClass)) {
    out.condoPsf = FEAS_CONDO_PSF[city]?.[assetClass] ?? 0;
    out.kind     = "for-sale";
    return out;
  }
  // Hotel
  if (assetClass.startsWith("hotel-")) {
    const tier = assetClass.split("-")[1];
    const h = FEAS_HOTEL[city]?.[tier];
    if (!h) return null;
    out.adr  = h.adr;
    out.occ  = h.occ;
    out.cap  = FEAS_CAP[city]?.hotel ?? 0;
    out.kind = "hotel";
    return out;
  }
  return null;
}