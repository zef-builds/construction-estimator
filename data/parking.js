/**
 * data/parking.js
 * Stall-count suggestion logic. PARKING_RATIOS gives Canadian zoning-style
 * ratios per type (per unit, per 1,000 sf, per key, per bed, per student).
 * CITY_PARKING_ADJ applies a downtown reduction factor by city based on
 * transit proximity. getParkingRatioSuggestion returns a recommended
 * stall count for the current scenario.
 * Exposes: PARKING_RATIOS, CITY_PARKING_ADJ, getParkingRatioSuggestion.
 * Depends on: nothing structural (reads scenario.inputs at call time).
 */
const PARKING_RATIOS = {
  condo_wood:    {mode:"unit", min:0.7, max:1.0, label:"0.7–1.0 stalls/unit"},
  condo_12:      {mode:"unit", min:0.7, max:1.0, label:"0.7–1.0 stalls/unit"},
  condo_13_39:   {mode:"unit", min:0.6, max:0.9, label:"0.6–0.9 stalls/unit"},
  condo_40_60:   {mode:"unit", min:0.5, max:0.8, label:"0.5–0.8 stalls/unit"},
  condo_60plus:  {mode:"unit", min:0.4, max:0.7, label:"0.4–0.7 stalls/unit"},
  seniors_ind:       {mode:"unit", min:0.5, max:0.8, label:"0.5–0.8 stalls/unit"},
  seniors_assisted:  {mode:"unit", min:0.3, max:0.5, label:"0.3–0.5 stalls/unit"},
  seniors_complex:   {mode:"unit", min:0.3, max:0.5, label:"0.3–0.5 stalls/unit"},
  uni_residence:     {mode:"unit", min:0.2, max:0.4, label:"0.2–0.4 stalls/unit"},
  office_low_b:  {mode:"gfa", ratio:3.0, label:"3 stalls/1,000 sf"},
  office_mid_b:  {mode:"gfa", ratio:2.0, label:"2 stalls/1,000 sf"},
  office_high_a: {mode:"gfa", ratio:1.5, label:"1.5 stalls/1,000 sf"},
  retail_strip:       {mode:"gfa", ratio:4.5, label:"4.5 stalls/1,000 sf"},
  retail_supermarket: {mode:"gfa", ratio:5.0, label:"5 stalls/1,000 sf"},
  retail_bigbox:      {mode:"gfa", ratio:5.0, label:"5 stalls/1,000 sf"},
  retail_mall:        {mode:"gfa", ratio:4.0, label:"4 stalls/1,000 sf"},
  hotel_budget: {mode:"key", ratio:0.6, label:"0.6 stalls/key"},
  hotel_suite:  {mode:"key", ratio:0.8, label:"0.8 stalls/key"},
  hotel_full:   {mode:"key", ratio:1.0, label:"1 stall/key"},
  hospital:    {mode:"bed",  ratio:2.0, label:"2 stalls/bed"},
  school_elem: {mode:"cap",  ratio:0.15, label:"0.15 stalls/student"},
  school_sec:  {mode:"cap",  ratio:0.20, label:"0.20 stalls/student"},
};

const CITY_PARKING_ADJ = {
  tor: {downtown:0.70, note:"Toronto downtown: zoning often waives minimums near TTC"},
  van: {downtown:0.65, note:"Vancouver: among lowest minimums in Canada near SkyTrain"},
  mtl: {downtown:0.75, note:"Montréal: reduced minimums near metro stations"},
  ott: {downtown:0.80, note:"Ottawa: LRT proximity reduces requirements"},
  cal: {downtown:0.85, note:"Calgary: C-Train proximity reduces downtown requirements"},
  edm: {downtown:0.85, note:"Edmonton: LRT expansion reducing core minimums"},
  win: {downtown:0.90, note:"Winnipeg: limited rapid transit, standard minimums apply"},
  hal: {downtown:0.90, note:"Halifax: bus-focused network, standard minimums apply"},
  stj: {downtown:0.95, note:"St. John's: car-dependent market, full minimums typical"},
};

function getParkingRatioSuggestion(type, scenario) {
  const r = PARKING_RATIOS[type.id];
  if (!r) return null;
  const inp = scenario.inputs;
  const cityAdj = CITY_PARKING_ADJ[scenario.city] || {downtown:1.0, note:"Standard minimums apply"};
  let baseStalls = 0;
  let ratioLabel = r.label;
  if (r.mode === "gfa") {
    const gfa = inp.officeNla > 0 ? Math.round(inp.officeNla / ((inp.officeEfficiency||75)/100)) : inp.gfa;
    baseStalls = Math.round((gfa / 1000) * r.ratio);
  } else if (r.mode === "unit") {
    const units = inp.unitMix ? Object.values(inp.unitMix).reduce((a,b)=>a+b,0) : 0;
    const effectiveUnits = units > 0 ? units : Math.round(inp.gfa / 900);
    const midRatio = (r.min + r.max) / 2;
    baseStalls = Math.round(effectiveUnits * midRatio);
    ratioLabel = r.label + (units > 0 ? ` · ${units} units` : " · estimated units");
  } else if (r.mode === "key") {
    const keys = inp.hotelKeys || Math.round(inp.gfa / 700);
    baseStalls = Math.round(keys * r.ratio);
  } else if (r.mode === "bed") {
    const beds = inp.hospitalBeds || Math.round(inp.gfa / 1400);
    baseStalls = Math.round(beds * r.ratio);
  } else if (r.mode === "cap") {
    const cap = inp.schoolCapacity || Math.round(inp.gfa / 110);
    baseStalls = Math.round(cap * r.ratio);
  }
  const adjStalls = Math.max(10, Math.round(baseStalls * cityAdj.downtown));
  return {
    stalls: adjStalls,
    label: ratioLabel,
    ratioLabel: ratioLabel,
    cityNote: cityAdj.note,
  };
}