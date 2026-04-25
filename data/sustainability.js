/**
 * data/sustainability.js
 * Sustain tab data. EC_INTENSITY is a single whole-building embodied carbon
 * benchmark per type (kgCO₂e/m², A1–A5; top-down, not material-level).
 * GREEN_STANDARDS lists code/certification tiers with cost-premium percentages.
 * PROV_INCENTIVES catalogues programs by province; CITY_PROV maps cities to
 * provinces. CARBON_PRICE_* are federal industrial OBPS prices in $/tCO₂e.
 * Exposes: EC_INTENSITY, GREEN_STANDARDS, PROV_INCENTIVES, CITY_PROV,
 *          CARBON_PRICE_2025, CARBON_PRICE_2030.
 * Depends on: nothing (pure data).
 */
const EC_INTENSITY = {
  sfr:280, custom_home:320, townhouse_row:270, townhouse_stacked:290,
  condo_wood:310, condo_12:370, condo_13_39:410, condo_40_60:460, condo_60plus:520,
  seniors_ind:340, seniors_assisted:350, seniors_complex:380, uni_residence:360,
  office_low_b:380, office_mid_b:430, office_high_a:520,
  retail_strip:290, retail_supermarket:310, retail_bigbox:260, retail_mall:390,
  hotel_budget:370, hotel_suite:410, hotel_full:490,
  warehouse:180, distribution:210, storage_urban:260,
  school_elem:390, school_sec:420,
  hospital:700,
};

const GREEN_STANDARDS = [
  {id:"necb2017",  label:"NECB 2017 (base)",            pct:0.0,  desc:"Pre-2020 baseline. Most existing buildings were designed to this or earlier."},
  {id:"necb2020",  label:"NECB 2020 Tier 1",            pct:1.5,  desc:"Current national model code, Tier 1 compliance. 4-tier structure; higher tiers carry higher premiums."},
  {id:"leed_s",    label:"LEED Silver",                  pct:2.0,  desc:"Market standard for institutional and commercial. Premium is a floor — varies by project."},
  {id:"leed_g",    label:"LEED Gold",                    pct:3.5,  desc:"Required by many municipalities and federal programs. Premium is a floor."},
  {id:"leed_p",    label:"LEED Platinum",                pct:5.5,  desc:"Net-zero-ready envelope and systems. Premium is a floor."},
  {id:"step5",     label:"BC Step Code 5 / Zero Carbon", pct:7.0,  desc:"Highest BC performance tier. Approaches net-zero operations. Premium is a floor."},
  {id:"cagbc_zc",  label:"CAGBC Zero Carbon Building",   pct:10.0, desc:"Operational carbon neutral. High-performance envelope + renewables. Real-world range: 8–15%+."},
];

const PROV_INCENTIVES = {
  bc: [
    {name:"BC Hydro PowerSmart for Business",  desc:"Up to $500K for commercial, $50K for multi-unit residential. Custom engineering study required.",                                                url:"https://www.bchydro.com/powersmart/business.html"},
    {name:"CleanBC Better Homes",              desc:"Heat pump incentives up to $10,000 per unit for residential. Income-qualified top-ups available.",                                              url:"https://www.gov.bc.ca/cleanbc-better-homes"},
    {name:"BC Hydro EEIP",                     desc:"Energy Efficiency and Innovation Program — deep energy retrofits and custom incentives for large commercial buildings.",                         url:"https://www.bchydro.com/powersmart/business/programs/energy-efficiency-innovation-program.html"},
    {name:"Canada Greener Homes Loan",         desc:"Interest-free loans up to $40,000 for residential energy retrofits. Must pair with EnerGuide evaluation.",                                     url:"https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/canada-greener-homes-loan/24286"},
  ],
  on: [
    {name:"Enbridge Savings by Design",        desc:"Free consulting + up to $200K incentive for above-code multi-unit residential and commercial new construction.",                                url:"https://www.savingsbydesign.ca"},
    {name:"IESO Conservation Programs",        desc:"Custom industrial and commercial demand reduction incentives. Application-based; larger projects qualify for study funding.",                    url:"https://www.ieso.ca/en/Get-Involved/Funding-Programs/Overview"},
    {name:"Toronto Green Standard",            desc:"TGS Tier 2–4 compliance may unlock density bonusing under City of Toronto planning policy.",                                                    url:"https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/toronto-green-standard/"},
    {name:"Canada Greener Homes Loan",         desc:"Interest-free loans up to $40,000 for residential energy retrofits nationally.",                                                               url:"https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/canada-greener-homes-loan/24286"},
  ],
  qc: [
    {name:"Transition énergétique Québec",     desc:"Biomass, geothermal, and solar incentives for commercial buildings. Reno-Climat and ÉcoPerformance programs.",                                 url:"https://transitionenergetique.gouv.qc.ca/en/buildings"},
    {name:"Hydro-Québec Bâtiments",            desc:"Up to $400/kW demand reduction for commercial. Custom projects eligible for tailored incentive amounts.",                                       url:"https://www.hydroquebec.com/business/customer-space/rates-and-billing/demand-management.html"},
    {name:"RénoClimat",                        desc:"Provincial residential retrofit grants including insulation, air sealing, heating systems.",                                                    url:"https://www.quebec.ca/en/housing/renovation-and-adaptation/financial-assistance-for-home-renovation/renovclimat"},
  ],
  ab: [
    {name:"Emissions Reduction Alberta (ERA)", desc:"Large emitter industrial programs; funded technology demonstrations. Limited direct residential applicability.",                                  url:"https://eralberta.ca"},
    {name:"Enmax / EPCOR DSM Programs",        desc:"Commercial lighting, HVAC, and building envelope incentives for Enmax and EPCOR service territory customers.",                                  url:"https://www.enmax.com/for-home/energy-efficiency/programs"},
    {name:"Canada Greener Homes Loan",         desc:"Interest-free loans up to $40,000 for residential energy retrofits nationally.",                                                               url:"https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/canada-greener-homes-loan/24286"},
  ],
  mb: [
    {name:"Manitoba Hydro Power Smart",        desc:"Commercial energy efficiency incentives up to $250K. Prescriptive and custom paths available.",                                                 url:"https://www.hydro.mb.ca/your_home/energy_efficiency/"},
    {name:"Manitoba Hydro New Building Program",desc:"Incentives for new construction exceeding NECB. Eligible for prescriptive measures including envelope and lighting.",                         url:"https://www.hydro.mb.ca/business/programs_and_incentives/new_construction/"},
  ],
  ns: [
    {name:"EfficiencyOne",                     desc:"Heat pump incentives, commercial EE programs, and energy audits. Administers Efficiency Nova Scotia programs.",                                 url:"https://www.efficiencyone.ca"},
    {name:"Nova Scotia Affordable Energy Fund", desc:"Targeted support for lower-income households. Insulation, heating systems, air sealing.",                                                     url:"https://www.efficiencyone.ca/programs/affordable-energy-fund/"},
  ],
  nb: [
    {name:"NB Power Commercial Programs",      desc:"Custom energy efficiency incentives for commercial and industrial customers. Application required.",                                            url:"https://www.nbpower.com/en/save-energy/for-your-business/rebates-incentives/"},
    {name:"Énergie NB Power Residential",      desc:"Heat pump and insulation incentives for residential customers.",                                                                               url:"https://www.nbpower.com/en/save-energy/for-your-home/rebates-incentives/"},
  ],
};

const CITY_PROV = {
  tor:"on", ott:"on", mtl:"qc", van:"bc",
  cal:"ab", edm:"ab", win:"mb", hal:"ns", stj:"nb"
};

const CARBON_PRICE_2025 = 95;
const CARBON_PRICE_2030 = 170;