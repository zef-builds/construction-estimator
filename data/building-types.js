/**
 * data/building-types.js
 * Master catalog. CITIES (9 Canadian markets) and TYPES (60+ building/parking/infra types).
 * Each TYPE entry: id, label, sector (private/public/infrastructure), cat (residential/
 * commercial/industrial/parking/institutional/infrastructure), rates by city ($/sf low–high
 * pulled from 2026 Altus Group Canadian Cost Guide), and an optional unit flag
 * (perStall, perLM, perSM, perUnit, perAcre) — absent means /sf and treated as a building.
 * Exposes: CITIES, TYPES.
 * Depends on: nothing (pure data).
 */
const CITIES = [
  {id:"tor",label:"Toronto",prov:"ON"},
  {id:"ott",label:"Ottawa",prov:"ON"},
  {id:"mtl",label:"Montreal",prov:"QC"},
  {id:"cal",label:"Calgary",prov:"AB"},
  {id:"edm",label:"Edmonton",prov:"AB"},
  {id:"van",label:"Vancouver",prov:"BC"},
  {id:"win",label:"Winnipeg",prov:"MB"},
  {id:"hal",label:"Halifax",prov:"NS"},
  {id:"stj",label:"St. John's",prov:"NL"}
];

const TYPES = [
  {id:"condo_12",label:"Condominium / Apartment (Up to 12 Storeys)",sector:"private",cat:"residential",rates:{van:[330,400],cal:[305,375],edm:[305,375],win:[305,375],tor:[245,390],ott:[260,320],mtl:[275,335],hal:[250,345],stj:[260,360]}},
  {id:"condo_13_39",label:"Condominium / Apartment (13–39 Storeys)",sector:"private",cat:"residential",rates:{van:[340,435],cal:[315,385],edm:[315,385],win:[315,380],tor:[280,350],ott:[300,330],mtl:[320,330],hal:[305,375],stj:[290,360]}},
  {id:"condo_40_60",label:"Condominium / Apartment (40–60 Storeys)",sector:"private",cat:"residential",rates:{van:[350,465],cal:[325,395],edm:[325,395],win:[325,390],tor:[320,410],ott:[310,360],mtl:[330,375],hal:[300,360],stj:[295,355]}},
  {id:"condo_60plus",label:"Condominium / Apartment (60+ Storeys)",sector:"private",cat:"residential",rates:{van:[370,480],cal:[355,460],edm:[350,450],win:[345,445],tor:[350,480],ott:[345,445],mtl:[330,425],hal:[320,415],stj:[315,410]}},
  {id:"townhouse_row",label:"Row Townhouse (Unfinished Basement)",sector:"private",cat:"residential",rates:{van:[195,295],cal:[190,255],edm:[185,250],win:[185,250],tor:[155,265],ott:[150,190],mtl:[145,195],hal:[145,210],stj:[160,210]}},
  {id:"townhouse_stacked",label:"3-Storey Stacked Townhouse",sector:"private",cat:"residential",rates:{van:[210,300],cal:[200,265],edm:[195,265],win:[190,260],tor:[180,270],ott:[180,220],mtl:[165,215],hal:[175,220],stj:[165,220]}},
  {id:"condo_wood",label:"Wood Frame Condo (Up to 6 Storeys)",sector:"private",cat:"residential",rates:{van:[255,360],cal:[245,365],edm:[240,365],win:[235,360],tor:[210,330],ott:[230,290],mtl:[225,290],hal:[205,255],stj:[240,310]}},
  {id:"sfr",label:"Single Family Residential (Unfinished Basement)",sector:"private",cat:"residential",rates:{van:[200,315],cal:[180,275],edm:[175,275],win:[170,260],tor:[150,275],ott:[160,230],mtl:[155,215],hal:[150,225],stj:[160,220]}},
  {id:"custom_home",label:"Custom Built Single Family Residential",sector:"private",cat:"residential",rates:{van:[490,1250],cal:[495,1135],edm:[495,1135],win:[490,1095],tor:[500,1130],ott:[500,1000],mtl:[465,900],hal:[365,750],stj:[375,750]}},
  {id:"seniors_ind",label:"Seniors: Independent / Supportive Living",sector:"private",cat:"residential",rates:{van:[330,430],cal:[270,370],edm:[270,370],win:[265,365],tor:[250,385],ott:[280,340],mtl:[225,340],hal:[255,335],stj:[270,350]}},
  {id:"seniors_assisted",label:"Seniors: Assisted Living Residences",sector:"private",cat:"residential",rates:{van:[320,455],cal:[305,395],edm:[305,395],win:[300,390],tor:[290,405],ott:[320,370],mtl:[260,350],hal:[280,375],stj:[300,385]}},
  {id:"seniors_complex",label:"Seniors: Complex Care Residences",sector:"private",cat:"residential",rates:{van:[415,615],cal:[350,595],edm:[350,595],win:[345,590],tor:[375,590],ott:[360,540],mtl:[390,555],hal:[385,605],stj:[420,585]}},
  {id:"office_low_b",label:"Office Under 5 Storeys (Class B)",sector:"private",cat:"commercial",rates:{van:[300,380],cal:[250,340],edm:[250,340],win:[245,335],tor:[260,355],ott:[230,300],mtl:[210,285],hal:[200,260],stj:[205,355]}},
  {id:"office_mid_b",label:"Office 6–30 Storeys (Class B)",sector:"private",cat:"commercial",rates:{van:[300,375],cal:[255,350],edm:[255,350],win:[250,345],tor:[270,380],ott:[240,330],mtl:[220,295],hal:[205,295],stj:[205,285]}},
  {id:"office_a",label:"Office 5–30 Storeys (Class A)",sector:"private",cat:"commercial",rates:{van:[345,425],cal:[280,395],edm:[280,395],win:[275,390],tor:[305,450],ott:[290,380],mtl:[280,375],hal:[230,330],stj:[225,320]}},
  {id:"office_high_a",label:"Office 31–60 Storeys (Class A)",sector:"private",cat:"commercial",rates:{van:[370,460],cal:[315,455],edm:[315,455],win:[310,450],tor:[355,510],ott:[340,460],mtl:[335,465],hal:[310,430],stj:[310,425]}},
  {id:"office_fitout_b",label:"Office Interior Fitout (Class B)",sector:"private",cat:"commercial",rates:{van:[90,175],cal:[85,130],edm:[85,130],win:[80,125],tor:[110,150],ott:[100,150],mtl:[95,140],hal:[75,125],stj:[75,115]}},
  {id:"office_fitout_a",label:"Office Interior Fitout (Class A)",sector:"private",cat:"commercial",rates:{van:[165,295],cal:[120,225],edm:[120,225],win:[115,220],tor:[160,265],ott:[150,250],mtl:[150,205],hal:[110,185],stj:[110,185]}},
  {id:"retail_strip",label:"Retail Strip Plaza",sector:"private",cat:"commercial",rates:{van:[210,300],cal:[225,315],edm:[225,315],win:[220,310],tor:[220,295],ott:[170,240],mtl:[165,235],hal:[145,195],stj:[150,200]}},
  {id:"retail_supermarket",label:"Retail Supermarket",sector:"private",cat:"commercial",rates:{van:[205,260],cal:[220,275],edm:[220,275],win:[215,270],tor:[165,260],ott:[180,260],mtl:[185,240],hal:[175,235],stj:[180,225]}},
  {id:"retail_bigbox",label:"Retail Big Box Store",sector:"private",cat:"commercial",rates:{van:[200,250],cal:[210,270],edm:[210,270],win:[205,265],tor:[155,240],ott:[160,220],mtl:[175,230],hal:[185,245],stj:[190,240]}},
  {id:"retail_mall",label:"Retail Enclosed Mall",sector:"private",cat:"commercial",rates:{van:[350,460],cal:[280,445],edm:[280,445],win:[275,440],tor:[260,480],ott:[245,315],mtl:[260,350],hal:[235,335],stj:[250,330]}},
  {id:"hotel_budget",label:"Hotel (Budget)",sector:"private",cat:"commercial",rates:{van:[240,320],cal:[250,340],edm:[250,340],win:[245,335],tor:[235,325],ott:[220,280],mtl:[205,280],hal:[220,270],stj:[230,285]}},
  {id:"hotel_suite",label:"Hotel (Suite)",sector:"private",cat:"commercial",rates:{van:[350,460],cal:[310,430],edm:[310,430],win:[305,425],tor:[325,420],ott:[290,380],mtl:[260,340],hal:[240,340],stj:[290,415]}},
  {id:"hotel_full",label:"Hotel (4-Star Full Service)",sector:"private",cat:"commercial",rates:{van:[400,570],cal:[330,455],edm:[330,455],win:[325,450],tor:[365,565],ott:[340,500],mtl:[330,480],hal:[295,380],stj:[350,485]}},
  {id:"warehouse",label:"Warehouse",sector:"private",cat:"industrial",rates:{van:[120,200],cal:[130,175],edm:[130,175],win:[125,170],tor:[75,180],ott:[120,170],mtl:[120,185],hal:[125,195],stj:[115,180]}},
  {id:"distribution",label:"Distribution Facility",sector:"private",cat:"industrial",rates:{van:[200,485],cal:[155,475],edm:[155,475],win:[150,470],tor:[170,480],ott:[165,445],mtl:[170,460],hal:[165,430],stj:[185,480]}},
  {id:"storage_urban",label:"Urban Storage Facility",sector:"private",cat:"industrial",rates:{van:[120,175],cal:[145,195],edm:[145,195],win:[140,190],tor:[90,195],ott:[105,195],mtl:[110,175],hal:[110,175],stj:[110,170]}},
  {id:"parkade_ug",label:"Parking – Underground Garage",sector:"private",cat:"parking",rates:{van:[65325,100500],cal:[55275,77050],edm:[55275,77050],win:[53600,75375],tor:[55275,95475],ott:[67000,93800],mtl:[51925,68675],hal:[50250,68675],stj:[51925,73700]},perStall:true},
  {id:"parkade_ag",label:"Parking – Above Grade Garage",sector:"private",cat:"parking",rates:{van:[45500,73500],cal:[42000,64750],edm:[42000,64750],win:[40250,63000],tor:[42000,70000],ott:[43750,56000],mtl:[38500,57750],hal:[42000,52500],stj:[43750,59500]},perStall:true},
  {id:"surface_lot",label:"Parking – Surface Lot",sector:"private",cat:"parking",rates:{van:[4290,9900],cal:[3960,9900],edm:[3960,9900],win:[3960,9900],tor:[4620,9900],ott:[3960,8250],mtl:[3960,8250],hal:[4950,9900],stj:[3960,8250]},perStall:true},
  {id:"school_elem",label:"Elementary School",sector:"public",cat:"institutional",rates:{van:[425,600],cal:[370,580],edm:[370,580],win:[345,570],tor:[385,700],ott:[340,440],mtl:[395,490],hal:[370,445],stj:[350,485]}},
  {id:"school_sec",label:"Secondary School",sector:"public",cat:"institutional",rates:{van:[445,610],cal:[410,605],edm:[410,605],win:[375,600],tor:[440,750],ott:[360,460],mtl:[415,495],hal:[375,480],stj:[375,500]}},
  {id:"uni_teaching",label:"University / College – Teaching & Lecture Hall",sector:"public",cat:"institutional",rates:{van:[750,1250],cal:[600,995],edm:[600,995],win:[575,990],tor:[900,1250],ott:[650,950],mtl:[690,935],hal:[665,775],stj:[680,780]}},
  {id:"uni_labs",label:"University / College – Laboratories (Level 1 & 2)",sector:"public",cat:"institutional",rates:{van:[925,1400],cal:[775,1315],edm:[775,1315],win:[750,1310],tor:[1150,1600],ott:[950,1250],mtl:[935,1225],hal:[770,1120],stj:[850,1200]}},
  {id:"uni_residence",label:"University / College – Student Residence",sector:"public",cat:"residential",rates:{van:[395,580],cal:[320,440],edm:[320,440],win:[310,435],tor:[590,800],ott:[360,460],mtl:[375,470],hal:[335,425],stj:[300,390]}},
  {id:"hospital",label:"General Hospital / Acute Care",sector:"public",cat:"institutional",rates:{van:[1000,1550],cal:[1000,1600],edm:[1000,1600],win:[945,1590],tor:[1030,1620],ott:[1000,1600],mtl:[905,1305],hal:[795,1380],stj:[850,1300]}},
  {id:"medical_clinic",label:"Medical Clinic / Treatment Centre",sector:"public",cat:"institutional",rates:{van:[550,950],cal:[395,950],edm:[395,950],win:[390,945],tor:[460,800],ott:[475,650],mtl:[375,545],hal:[420,680],stj:[410,560]}},
  {id:"airport_regional",label:"Airport Terminal – Regional",sector:"public",cat:"institutional",rates:{van:[430,625],cal:[520,800],edm:[520,800],win:[515,795],tor:[535,640],ott:[400,500],mtl:[395,485],hal:[400,495],stj:[375,515]}},
  {id:"airport_intl",label:"Airport Terminal – International",sector:"public",cat:"institutional",rates:{van:[850,1200],cal:[825,1200],edm:[825,1200],win:[820,1195],tor:[885,1175],ott:[800,1000],mtl:[790,930],hal:[775,955],stj:[800,965]}},
  {id:"bus_terminal",label:"Bus Terminal / Garage",sector:"public",cat:"institutional",rates:{van:[400,510],cal:[395,550],edm:[395,550],win:[390,545],tor:[460,750],ott:[350,450],mtl:[350,410],hal:[325,425],stj:[300,395]}},
  {id:"fire_ems",label:"Fire / EMS Station",sector:"public",cat:"institutional",rates:{van:[600,865],cal:[575,750],edm:[575,750],win:[570,745],tor:[620,860],ott:[550,650],mtl:[545,623],hal:[425,515],stj:[450,550]}},
  {id:"police_local",label:"Police Station – Local Detachment",sector:"public",cat:"institutional",rates:{van:[550,600],cal:[500,750],edm:[500,750],win:[495,745],tor:[600,735],ott:[540,600],mtl:[520,560],hal:[460,560],stj:[460,525]}},
  {id:"police_regional",label:"Police Station – Regional Headquarters",sector:"public",cat:"institutional",rates:{van:[500,620],cal:[495,690],edm:[495,690],win:[490,685],tor:[525,625],ott:[470,570],mtl:[475,540],hal:[485,635],stj:[400,500]}},
  {id:"courthouse",label:"Court House",sector:"public",cat:"institutional",rates:{van:[540,750],cal:[630,970],edm:[630,970],win:[625,965],tor:[640,820],ott:[550,750],mtl:[520,680],hal:[495,595],stj:[500,600]}},
  {id:"facilities_maint",label:"Facilities Maintenance Building",sector:"public",cat:"institutional",rates:{van:[450,550],cal:[325,490],edm:[325,490],win:[320,485],tor:[600,745],ott:[485,555],mtl:[440,520],hal:[305,355],stj:[350,400]}},
  {id:"penitentiary",label:"Penitentiary / Correctional Facility",sector:"public",cat:"institutional",rates:{van:[575,720],cal:[600,790],edm:[600,790],win:[595,785],tor:[635,770],ott:[510,640],mtl:[490,598],hal:[450,615],stj:[500,610]}},
  {id:"municipal_office",label:"Municipal Office (Including Fit-Up)",sector:"public",cat:"institutional",rates:{van:[450,530],cal:[425,500],edm:[425,500],win:[420,495],tor:[445,580],ott:[380,480],mtl:[365,445],hal:[345,400],stj:[375,425]}},
  {id:"library",label:"Library",sector:"public",cat:"institutional",rates:{van:[455,800],cal:[440,840],edm:[440,840],win:[435,835],tor:[550,1100],ott:[650,850],mtl:[475,750],hal:[420,685],stj:[425,625]}},
  {id:"ice_arena",label:"Ice Arena",sector:"public",cat:"institutional",rates:{van:[395,510],cal:[390,595],edm:[390,595],win:[385,590],tor:[355,655],ott:[350,450],mtl:[360,445],hal:[350,400],stj:[350,410]}},
  {id:"aquatic",label:"Community Aquatic Facility",sector:"public",cat:"institutional",rates:{van:[560,930],cal:[580,850],edm:[580,850],win:[575,845],tor:[610,940],ott:[575,785],mtl:[545,700],hal:[660,835],stj:[550,605]}},
  {id:"rec_centre",label:"Multi-Use Recreational Centre",sector:"public",cat:"institutional",rates:{van:[600,1075],cal:[475,765],edm:[475,765],win:[470,760],tor:[670,1190],ott:[600,750],mtl:[570,660],hal:[565,695],stj:[500,625]}},
  {id:"performing_arts",label:"Performing Arts Building",sector:"public",cat:"institutional",rates:{van:[890,1250],cal:[680,1250],edm:[680,1250],win:[675,1245],tor:[940,1270],ott:[625,980],mtl:[550,920],hal:[505,655],stj:[495,650]}},
  {id:"museum",label:"Museum / Gallery",sector:"public",cat:"institutional",rates:{van:[555,1200],cal:[610,1200],edm:[610,1200],win:[605,1195],tor:[660,1200],ott:[615,755],mtl:[540,725],hal:[485,630],stj:[500,675]}},
  {id:"road_local",label:"Road – Local (8m width)",sector:"infrastructure",cat:"infrastructure",rates:{van:[3000,4100],cal:[3450,4000],edm:[3450,4000],win:[3450,4000],tor:[4350,6000],ott:[3300,4400],mtl:[3400,4450],hal:[3075,3900],stj:[3500,4300]},perLM:true},
  {id:"road_arterial",label:"Road – Arterial (12m width)",sector:"infrastructure",cat:"infrastructure",rates:{van:[4000,4700],cal:[4370,5050],edm:[4370,5050],win:[4370,5050],tor:[5300,6900],ott:[4500,5500],mtl:[4700,5670],hal:[4200,5050],stj:[4400,4900]},perLM:true},
  {id:"bridge",label:"Bridge (per sq.m of deck area)",sector:"infrastructure",cat:"infrastructure",sourceNote:"industry",rates:{van:[6200,12500],cal:[5500,11000],edm:[5500,11000],win:[5200,10500],tor:[6000,12000],ott:[5500,11000],mtl:[5200,10500],hal:[5400,10800],stj:[5500,11000]},perSM:true},
  {id:"water_main",label:"Watermain",sector:"infrastructure",cat:"infrastructure",sourceNote:"industry",rates:{van:[1600,3600],cal:[1400,3200],edm:[1400,3200],win:[1300,3000],tor:[1500,3500],ott:[1400,3200],mtl:[1300,3000],hal:[1350,3100],stj:[1400,3200]},perLM:true},
  {id:"sewer",label:"Sanitary / Storm Sewer",sector:"infrastructure",cat:"infrastructure",sourceNote:"industry",rates:{van:[1900,4200],cal:[1650,3700],edm:[1650,3700],win:[1550,3500],tor:[1800,4000],ott:[1650,3700],mtl:[1550,3500],hal:[1600,3600],stj:[1650,3700]},perLM:true},
  {id:"road_arterial_9m",label:"Road – Arterial (9m width)",sector:"infrastructure",cat:"infrastructure",rates:{van:[3100,4400],cal:[3640,4200],edm:[3640,4200],win:[3640,4200],tor:[4500,6200],ott:[3400,4900],mtl:[3750,5250],hal:[3275,4325],stj:[3600,4600]},perLM:true},
  {id:"road_private",label:"Road – Private (6m width)",sector:"infrastructure",cat:"infrastructure",rates:{van:[2600,3000],cal:[2700,3575],edm:[2700,3575],win:[2700,3575],tor:[3000,4000],ott:[2600,3500],mtl:[2790,3675],hal:[2575,3200],stj:[2900,3400]},perLM:true},
  {id:"servicing_tn",label:"Site Servicing – Residential Townhouse",sector:"infrastructure",cat:"infrastructure",rates:{van:[20500,32000],cal:[20485,31750],edm:[20485,31750],win:[20485,31750],tor:[24800,35800],ott:[24800,33400],mtl:[23700,33800],hal:[20750,29250],stj:[24000,32000]},perUnit:true},
  {id:"servicing_ind",label:"Site Servicing – Industrial (per acre)",sector:"infrastructure",cat:"infrastructure",rates:{van:[136600,250000],cal:[145000,241500],edm:[145000,241500],win:[145000,241500],tor:[165000,252300],ott:[150000,233000],mtl:[154000,235000],hal:[130000,205000],stj:[155000,225000]},perAcre:true},
  {id:"servicing_comm",label:"Site Servicing – Commercial (per acre)",sector:"infrastructure",cat:"infrastructure",rates:{van:[173300,355000],cal:[175000,327500],edm:[175000,327500],win:[175000,327500],tor:[221300,370800],ott:[205000,347400],mtl:[207000,349000],hal:[177000,283000],stj:[200000,325000]},perAcre:true}
];