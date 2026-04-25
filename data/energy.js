/**
 * data/energy.js
 * LCCA inputs. ENERGY holds EUI baselines (ekWh/sf/yr), city electricity and gas
 * rates ($/kWh, $/sf-equivalent), and the electric/gas split by category.
 * MAINT gives O&M cost as a fraction of replacement value. REPLACEMENTS lists
 * major building system renewal cycles and percent of hard cost per cycle.
 * Exposes: ENERGY, MAINT, REPLACEMENTS.
 * Depends on: nothing (pure data).
 */
const ENERGY = {
  eui: {
    residential:    16.5,
    commercial:     22.0,
    institutional:  26.0,
    industrial:     18.0,
    parking:         3.0,
    infrastructure:  0
  },
  elecRate: {
    tor:0.13, ott:0.13, mtl:0.085, cal:0.165,
    edm:0.165, van:0.095, win:0.10, hal:0.175, stj:0.14
  },
  gasRate: {
    tor:0.035, ott:0.035, mtl:0.028, cal:0.025,
    edm:0.025, van:0.032, win:0.030, hal:0.04, stj:0.038
  },
  elecShare: {
    residential:0.45, commercial:0.55, institutional:0.50,
    industrial:0.60, parking:0.90, infrastructure:0
  }
};

const MAINT = {
  low:      0.015,
  standard: 0.025,
  high:     0.04
};

const REPLACEMENTS = [
  {name:"Roofing",             cycle:22, pct:0.06},
  {name:"HVAC Systems",        cycle:18, pct:0.12},
  {name:"Building Envelope",   cycle:30, pct:0.08},
  {name:"Elevators",           cycle:25, pct:0.05},
  {name:"Plumbing Systems",    cycle:28, pct:0.04},
  {name:"Electrical Systems",  cycle:30, pct:0.05},
  {name:"Interior Fitout",     cycle:12, pct:0.10},
  {name:"Flooring",            cycle:15, pct:0.03}
];