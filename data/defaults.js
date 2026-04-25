/**
 * data/defaults.js
 * Defaults, field schemas, and garage data.
 * TYPE_DEFAULTS gives starter inputs for each building type. TYPE_FIELDS declares
 * which input fields each type exposes in the Estimate tab. GARAGE_BASE and
 * GARAGE_CITY_FACTOR drive detached residential garage cost.
 * Exposes: TYPE_DEFAULTS, TYPE_FIELDS, DEFAULT_FIELDS, NON_BUILDING_FIELDS,
 *          GARAGE_BASE, GARAGE_CITY_FACTOR, getTypeFields, getGarageLabel, applyTypeDefaults.
 * Depends on: nothing (pure data + helpers).
 */
const TYPE_DEFAULTS = {
  sfr:           {gfa:2400, storeys:2, parkingType:"none", parkingStalls:0, garage:"double"},
  custom_home:   {gfa:3200, storeys:2, parkingType:"none", parkingStalls:0, garage:"double"},
  townhouse_row:     {gfa:14400, storeys:3, parkingType:"none", parkingStalls:0, garage:"single", unitCount:8,  unitSize:1800},
  townhouse_stacked: {gfa:16800, storeys:3, parkingType:"none", parkingStalls:0, garage:"none",   unitCount:12, unitSize:1400},
  condo_wood:    {gfa:45000,  storeys:5,  parkingType:"above",       parkingStalls:60},
  condo_12:      {gfa:120000, storeys:12, parkingType:"underground", parkingStalls:140},
  condo_13_39:   {gfa:280000, storeys:28, parkingType:"underground", parkingStalls:300},
  condo_40_60:   {gfa:600000, storeys:50, parkingType:"underground", parkingStalls:550},
  condo_60plus:  {gfa:900000, storeys:70, parkingType:"underground", parkingStalls:750},
  seniors_ind:       {gfa:80000,  storeys:5, parkingType:"surface",    parkingStalls:60},
  seniors_assisted:  {gfa:90000,  storeys:5, parkingType:"surface",    parkingStalls:50},
  seniors_complex:   {gfa:140000, storeys:6, parkingType:"underground", parkingStalls:80},
  office_low_b:    {gfa:35000,   storeys:3,  parkingType:"surface",    parkingStalls:90},
  office_mid_b:    {gfa:200000,  storeys:18, parkingType:"underground", parkingStalls:200},
  office_a:        {gfa:350000,  storeys:22, parkingType:"underground", parkingStalls:280},
  office_high_a:   {gfa:1200000, storeys:45, parkingType:"underground", parkingStalls:600},
  office_fitout_b: {gfa:8000,    storeys:1,  parkingType:"none",       parkingStalls:0},
  office_fitout_a: {gfa:8000,    storeys:1,  parkingType:"none",       parkingStalls:0},
  retail_strip:       {gfa:25000,  storeys:1, parkingType:"surface", parkingStalls:120},
  retail_supermarket: {gfa:45000,  storeys:1, parkingType:"surface", parkingStalls:200},
  retail_bigbox:      {gfa:130000, storeys:1, parkingType:"surface", parkingStalls:550},
  retail_mall:        {gfa:750000, storeys:2, parkingType:"above",   parkingStalls:3000},
  hotel_budget:  {gfa:80000,  storeys:4,  parkingType:"surface",     parkingStalls:120},
  hotel_suite:   {gfa:120000, storeys:8,  parkingType:"underground", parkingStalls:140},
  hotel_full:    {gfa:350000, storeys:22, parkingType:"underground", parkingStalls:300},
  warehouse:     {gfa:80000,  storeys:1, parkingType:"surface", parkingStalls:50},
  distribution:  {gfa:350000, storeys:1, parkingType:"surface", parkingStalls:120},
  storage_urban: {gfa:60000,  storeys:4, parkingType:"surface", parkingStalls:20},
  parkade_ug:  {gfa:0, storeys:0, parkingType:"none", parkingStalls:200},
  parkade_ag:  {gfa:0, storeys:0, parkingType:"none", parkingStalls:200},
  surface_lot: {gfa:0, storeys:0, parkingType:"none", parkingStalls:200},
  school_elem:    {gfa:60000,  storeys:2, parkingType:"surface", parkingStalls:80},
  school_sec:     {gfa:180000, storeys:3, parkingType:"surface", parkingStalls:200},
  uni_teaching:   {gfa:80000,  storeys:4, parkingType:"surface", parkingStalls:60},
  uni_labs:       {gfa:60000,  storeys:4, parkingType:"surface", parkingStalls:40},
  uni_residence:  {gfa:100000, storeys:8, parkingType:"surface", parkingStalls:30},
  hospital:        {gfa:600000, storeys:8, parkingType:"underground", parkingStalls:600},
  medical_clinic:  {gfa:25000,  storeys:2, parkingType:"surface",     parkingStalls:80},
  airport_regional: {gfa:80000,    storeys:2, parkingType:"surface", parkingStalls:200},
  airport_intl:     {gfa:1500000, storeys:3, parkingType:"above",   parkingStalls:8000},
  bus_terminal:     {gfa:60000,    storeys:2, parkingType:"surface", parkingStalls:60},
  fire_ems:         {gfa:12000,  storeys:1, parkingType:"surface", parkingStalls:20},
  police_local:     {gfa:18000,  storeys:2, parkingType:"surface", parkingStalls:40},
  police_regional:  {gfa:80000,  storeys:4, parkingType:"surface", parkingStalls:200},
  courthouse:       {gfa:120000, storeys:4, parkingType:"surface", parkingStalls:150},
  facilities_maint: {gfa:25000,  storeys:1, parkingType:"surface", parkingStalls:30},
  penitentiary:     {gfa:200000, storeys:3, parkingType:"surface", parkingStalls:80},
  municipal_office: {gfa:60000,  storeys:3, parkingType:"surface", parkingStalls:80},
  library:          {gfa:25000,  storeys:2, parkingType:"surface", parkingStalls:40},
  ice_arena:       {gfa:50000, storeys:1, parkingType:"surface", parkingStalls:200},
  aquatic:         {gfa:40000, storeys:1, parkingType:"surface", parkingStalls:120},
  rec_centre:      {gfa:80000, storeys:2, parkingType:"surface", parkingStalls:200},
  performing_arts: {gfa:60000, storeys:2, parkingType:"surface", parkingStalls:150},
  museum:          {gfa:50000, storeys:3, parkingType:"surface", parkingStalls:80},
  road_local:    {gfa:500,  storeys:0, parkingType:"none", parkingStalls:0},
  road_arterial: {gfa:800,  storeys:0, parkingType:"none", parkingStalls:0},
  bridge:        {gfa:800,  storeys:0, parkingType:"none", parkingStalls:0},
  water_main:    {gfa:1000, storeys:0, parkingType:"none", parkingStalls:0},
  sewer:         {gfa:1000, storeys:0, parkingType:"none", parkingStalls:0},
  road_arterial_9m: {gfa:800, storeys:0, parkingType:"none", parkingStalls:0},
  road_private:     {gfa:800, storeys:0, parkingType:"none", parkingStalls:0},
  servicing_tn:     {gfa:10,  storeys:0, parkingType:"none", parkingStalls:0},
  servicing_ind:    {gfa:5,   storeys:0, parkingType:"none", parkingStalls:0},
  servicing_comm:   {gfa:5,   storeys:0, parkingType:"none", parkingStalls:0}
};

const TYPE_FIELDS = {
  sfr:           ["gfa","storeys","garage","quality","softCost"],
  custom_home:   ["gfa","storeys","garage","quality","softCost"],
  townhouse_row:     ["tnUnits","storeys","siteArea","garage","quality","softCost"],
  townhouse_stacked: ["tnUnits","storeys","siteArea","garage","quality","softCost"],
  condo_wood:    ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  condo_12:      ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  condo_13_39:   ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  condo_40_60:   ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  condo_60plus:  ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  seniors_ind:       ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  seniors_assisted:  ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  seniors_complex:   ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  uni_residence:     ["gfa","storeys","siteArea","unitMix","parking","quality","softCost"],
  office_fitout_a: ["gfa","quality","softCost"],
  office_fitout_b: ["gfa","quality","softCost"],
  hotel_budget: ["hotelKeys","storeys","parking","quality","softCost"],
  hotel_suite:  ["hotelKeys","storeys","parking","quality","softCost"],
  hotel_full:   ["hotelKeys","storeys","parking","quality","softCost"],
  hospital: ["hospitalBeds","storeys","siteArea","parking","quality","softCost"],
  school_elem: ["schoolCapacity","storeys","siteArea","parking","quality","softCost"],
  school_sec:  ["schoolCapacity","storeys","siteArea","parking","quality","softCost"],
  office_low_b:  ["officeNla","storeys","siteArea","parking","quality","softCost"],
  office_mid_b:  ["officeNla","storeys","siteArea","parking","quality","softCost"],
  office_high_a: ["officeNla","storeys","siteArea","parking","quality","softCost"],
  warehouse:    ["gfa","clearHeight","storeys","siteArea","parking","quality","softCost"],
  distribution: ["gfa","clearHeight","storeys","siteArea","parking","quality","softCost"],
  retail_strip:       ["gfa","retailTier","storeys","siteArea","parking","quality","softCost"],
  retail_supermarket: ["gfa","retailTier","storeys","siteArea","parking","quality","softCost"],
  retail_bigbox:      ["gfa","retailTier","storeys","siteArea","parking","quality","softCost"],
  retail_mall:        ["gfa","retailTier","storeys","siteArea","parking","quality","softCost"]
};

const DEFAULT_FIELDS = ["gfa","storeys","siteArea","parking","quality","softCost"];
const NON_BUILDING_FIELDS = ["quality"];

const GARAGE_BASE = {
  none:   {sf:0,    cost:[0,0]},
  single: {sf:240,  cost:[25000, 40000]},
  double: {sf:480,  cost:[40000, 70000]},
  triple: {sf:720,  cost:[65000, 110000]}
};

const GARAGE_CITY_FACTOR = {
  van:1.5, tor:1.4, cal:1.0, edm:1.0, ott:0.95,
  mtl:0.9, win:0.95, hal:0.85, stj:0.85
};

function getTypeFields(type) {
  if (!type) return [];
  const isBuilding = !type.perStall && !type.perLM && !type.perSM && !type.perUnit && !type.perAcre;
  if (!isBuilding) return NON_BUILDING_FIELDS;
  return TYPE_FIELDS[type.id] || DEFAULT_FIELDS;
}

function getGarageLabel(g) {
  return {none:"None", single:"Single Car Garage", double:"Double Car Garage", triple:"Triple Car Garage"}[g] || "None";
}

function applyTypeDefaults(scenario, typeId) {
  const d = TYPE_DEFAULTS[typeId];
  if (!d) return;
  scenario.inputs.gfa = d.gfa;
  scenario.inputs.storeys = d.storeys;
  scenario.inputs.parkingType = d.parkingType;
  scenario.inputs.parkingStalls = d.parkingStalls;
  scenario.inputs.unitMix = {bachelor:0, one:0, two:0, three:0};
  scenario.inputs.siteArea = 0;
  scenario.inputs.garage = d.garage || "none";
  scenario.inputs.unitCount = d.unitCount || 0;
  scenario.inputs.unitSize = d.unitSize || 1800;
  const hotelDefaults = {hotel_budget:120, hotel_suite:180, hotel_full:350};
  const hospitalDefaults = {hospital:300};
  const schoolDefaults = {school_elem:450, school_sec:800};
  scenario.inputs.hotelKeys     = hotelDefaults[typeId]    || 0;
  scenario.inputs.hospitalBeds  = hospitalDefaults[typeId] || 0;
  scenario.inputs.schoolCapacity = schoolDefaults[typeId]  || 0;
  const officeNlaDefaults = {office_low_b:26000, office_mid_b:150000, office_high_a:900000};
  scenario.inputs.officeNla = officeNlaDefaults[typeId] || 0;
  scenario.inputs.officeEfficiency = 75;
  const clearDefaults = {warehouse:28, distribution:36, storage_urban:14};
  scenario.inputs.clearHeight = clearDefaults[typeId] || 28;
  scenario.inputs.retailTier = "shell";
}