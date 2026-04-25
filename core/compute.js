/**
 * core/compute.js
 * Pure cost calculation engine. Takes a scenario, returns an estimate object.
 * Handles unit/key/bed/student/NLA-driven GFA, clear height and retail tier modifiers,
 * parking, garage, soft costs, FSR, and floorplate.
 * Exposes: computeEstimate, computeGarageCost.
 * Depends on: TYPES, GARAGE_BASE, GARAGE_CITY_FACTOR (data/building-types.js, data/parking.js),
 *             lerp, getTypeFields (core/ui.js).
 */
function computeGarageCost(garage, city, quality, unitCount = 1) {
  const g = GARAGE_BASE[garage];
  if (!g || garage === "none") return 0;
  const baseCost = lerp(g.cost[0], g.cost[1], quality);
  const cityAdjusted = baseCost * (GARAGE_CITY_FACTOR[city] || 1.0);
  return Math.round(cityAdjusted * unitCount);
}

function computeEstimate(scenario) {
  const t = TYPES.find(x => x.id === scenario.typeId);
  if (!t) return null;
  const inp = scenario.inputs;
  const r = t.rates[scenario.city];
  const rate = lerp(r[0], r[1], inp.quality);
  const isBuilding = !t.perStall && !t.perLM && !t.perSM && !t.perUnit && !t.perAcre;
  const fields = getTypeFields(t);
  const usesTnUnits = fields.includes("tnUnits");
  const usesGarage = fields.includes("garage");
  const usesParking = fields.includes("parking");

  let effectiveGfa = inp.gfa;
  if (usesTnUnits && inp.unitCount > 0 && inp.unitSize > 0) {
    effectiveGfa = inp.unitCount * inp.unitSize;
  }

  const SQFT_PER_KEY = {hotel_budget:550, hotel_suite:750, hotel_full:1100};
  if (SQFT_PER_KEY[t.id] && inp.hotelKeys > 0) {
    effectiveGfa = inp.hotelKeys * SQFT_PER_KEY[t.id];
  }

  if (t.id === "hospital" && inp.hospitalBeds > 0) {
    effectiveGfa = inp.hospitalBeds * 1400;
  }

  const SQFT_PER_STUDENT = {school_elem:100, school_sec:120};
  if (SQFT_PER_STUDENT[t.id] && inp.schoolCapacity > 0) {
    effectiveGfa = inp.schoolCapacity * SQFT_PER_STUDENT[t.id];
  }

  const OFFICE_NLA_TYPES = ["office_low_b","office_mid_b","office_high_a"];
  if (OFFICE_NLA_TYPES.includes(t.id) && inp.officeNla > 0) {
    const eff = Math.max(50, Math.min(95, inp.officeEfficiency || 75)) / 100;
    effectiveGfa = Math.round(inp.officeNla / eff);
  }

  let clearHeightMod = 1.0;
  const IND_TYPES = ["warehouse","distribution","storage_urban"];
  if (IND_TYPES.includes(t.id)) {
    const baseline = 28;
    const delta = (inp.clearHeight || baseline) - baseline;
    clearHeightMod = 1 + (delta / 4) * 0.025;
    clearHeightMod = Math.max(0.85, Math.min(1.35, clearHeightMod));
  }

  let retailTierMod = 1.0;
  const RETAIL_TYPES = ["retail_strip","retail_supermarket","retail_bigbox","retail_mall"];
  if (RETAIL_TYPES.includes(t.id)) {
    const tierMods = {shell:0.65, landlord:1.0, turnkey:1.35};
    retailTierMod = tierMods[inp.retailTier] || 1.0;
  }

  const area = isBuilding ? effectiveGfa : (t.perStall ? inp.parkingStalls : inp.gfa);
  const baseCost = rate * area * clearHeightMod * retailTierMod;

  let parkCost = 0;
  let parkDetail = null;
  if (isBuilding && usesParking && inp.parkingType !== "none") {
    const pKey = inp.parkingType === "surface" ? "surface_lot" : inp.parkingType === "above" ? "parkade_ag" : "parkade_ug";
    const pType = TYPES.find(x => x.id === pKey);
    const pRate = lerp(pType.rates[scenario.city][0], pType.rates[scenario.city][1], inp.quality);
    const stalls = inp.parkingStalls != null ? inp.parkingStalls : 100;
    parkCost = pRate * stalls;
    parkDetail = {type:inp.parkingType, rate:pRate, stalls};
  }

  let garageCost = 0;
  let garageDetail = null;
  if (usesGarage && inp.garage !== "none") {
    const garageUnits = usesTnUnits ? Math.max(1, inp.unitCount) : 1;
    garageCost = computeGarageCost(inp.garage, scenario.city, inp.quality, garageUnits);
    garageDetail = {type:inp.garage, units:garageUnits, perUnit:computeGarageCost(inp.garage, scenario.city, inp.quality, 1)};
  }

  const hardTotal = baseCost + parkCost + garageCost;
  const softPct = isBuilding ? inp.softPct : 15;
  const softCost = hardTotal * softPct / 100;
  const grandTotal = hardTotal + softCost;

  let unitCount = 0;
  if (usesTnUnits) {
    unitCount = inp.unitCount;
  } else {
    unitCount = Object.values(inp.unitMix).reduce((a,b) => a+b, 0);
  }

  const fsr = inp.siteArea > 0 ? +(effectiveGfa / inp.siteArea).toFixed(2) : 0;
  const floorplate = inp.storeys > 0 && isBuilding ? Math.round(effectiveGfa / inp.storeys) : 0;

  return {
    type:t, city:scenario.city, area, rate, baseCost, parkCost, parkDetail,
    clearHeightMod, retailTierMod,
    garageCost, garageDetail,
    hardTotal, softCost, softPct, grandTotal, unitCount, fsr, floorplate,
    isBuilding, inputs:inp, effectiveGfa, fields
  };
}