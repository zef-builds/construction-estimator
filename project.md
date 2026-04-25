# Construction Cost Estimator — Project Map

A web-based construction cost estimator for the Canadian market. Built around the 2026 Altus Group Canadian Cost Guide. Live at https://zef-builds.github.io/construction-estimator.

## What this file is

A bird's-eye map of every file in this repo. Update it when structure changes. Paste it into a new Claude session for instant orientation.

## Stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no package manager. Loaded as a static site on GitHub Pages. State persists in `localStorage` under the key `zef_estimator_v2`.

## Directory structure

```
construction-estimator/
├── index.html              Main app shell. Loads all CSS and JS in order.
├── lcca.html               Standalone LCCA page (legacy / secondary entry point).
├── styles.css              All app styling. Single stylesheet.
├── README.md
├── License
├── altus 2025 cost data.pdf  Source data reference (not loaded by the app).
│
├── core/                   Engine and shared infrastructure.
│   ├── state.js            App state, scenarios, localStorage persistence.
│   ├── compute.js          Pure cost calculation engine (computeEstimate).
│   └── ui.js               Formatters, tab switching, master refreshAll.
│
├── data/                   Pure data and lookup helpers.
│   ├── building-types.js   CITIES and TYPES catalog (60+ types, 9 cities).
│   ├── defaults.js         TYPE_DEFAULTS, TYPE_FIELDS, garage data.
│   ├── energy.js           ENERGY (EUI, rates), MAINT, REPLACEMENTS for LCCA.
│   ├── parking.js          PARKING_RATIOS, CITY_PARKING_ADJ, suggestion logic.
│   └── sustainability.js   EC_INTENSITY, GREEN_STANDARDS, incentives, carbon prices.
│
└── tabs/                   One file per tab. Each owns its render* function.
    ├── browse.js           Catalog browser. Search + category pills.
    ├── estimate.js         Main input form. Largest file.
    ├── lcca.js             Life-cycle cost analysis with PV chart.
    ├── optimize.js         Four design-tradeoff tools.
    ├── compare.js          Side-by-side scenario comparison.
    └── sustain.js          Green premium, embodied carbon, incentives.
```

## File responsibilities (one-liner each)

| File | What it does |
|---|---|
| core/state.js | Owns scenarios, active tab, LCCA settings, sustain standard. Save/load. |
| core/compute.js | Pure function: scenario → estimate object. No DOM, no state writes. |
| core/ui.js | Formatters (fmt, fmtM, fmtN, fmtRange), lerp, tab switching, refreshAll. |
| data/building-types.js | CITIES list + master TYPES catalog with Altus 2026 rates. |
| data/defaults.js | Per-type starting inputs, field schemas, garage cost data. |
| data/energy.js | LCCA inputs: EUI, energy rates, maintenance, replacement cycles. |
| data/parking.js | Stall-count suggestions by type and city transit context. |
| data/sustainability.js | Embodied carbon benchmarks, green premium %, provincial incentives. |
| tabs/browse.js | Type catalog with search and category filtering. |
| tabs/estimate.js | Input form (per-type fields), live total, derived chips, cross-market chart. |
| tabs/lcca.js | 25/30/40/50-year present-value cost analysis with stacked bar chart. |
| tabs/optimize.js | Four tools: structural thresholds, parking mix, shape, CIQS vs zoning. |
| tabs/compare.js | A vs B delta table (2 scenarios) or compact list (3+). |
| tabs/sustain.js | Green standards, embodied carbon, code tiers, incentives. |

## Load order (matters)

`index.html` must load files in this order so globals are defined before they're used:

1. `data/building-types.js` (CITIES, TYPES — referenced by everything)
2. `data/defaults.js` (TYPE_DEFAULTS, getTypeFields)
3. `data/energy.js`
4. `data/parking.js`
5. `data/sustainability.js`
6. `core/state.js` (uses TYPES from data layer)
7. `core/compute.js` (uses TYPES, getTypeFields)
8. `core/ui.js` (orchestrates renderers)
9. `tabs/browse.js`
10. `tabs/estimate.js`
11. `tabs/lcca.js`
12. `tabs/optimize.js`
13. `tabs/compare.js`
14. `tabs/sustain.js`

## Cost model

**Hard cost** = base rate × area × clearHeightMod × retailTierMod + parking + garage
**Base rate** = lerp(low, high, quality%) from the city's rate range in TYPES
**Effective GFA** is derived from keys (hotel), beds (hospital), students (school), NLA ÷ efficiency (office), or unitCount × unitSize (townhouse).
**Soft cost** = hardTotal × softPct (default 20% buildings, 15% non-buildings).
**Excludes**: GST/HST, tariffs, land. Uses CIQS measured area (not zoning GFA).

## Scope and limits (be honest with users)

- Embodied carbon is one whole-building benchmark per type. Not material-level. Not EPD-driven.
- Rates are 2026 Altus Canadian Cost Guide. No tariff impact baked in.
- Estimating bands are ±15%. Feasibility-stage tool, not a quantity surveyor's takeoff.
- GTA is the primary calibrated market. Other cities use Altus regional ranges.

## Roadmap (next milestones)

1. Feasibility tab — development proforma (land, financing, yield-on-cost, go/no-go).
2. PDF export for lender and developer meetings.
3. Material-level embodied carbon (structural system toggle: concrete / steel / mass timber).
4. User-customizable pricing database.
5. Field reporting pipeline (iPhone → server → AI-generated progress reports).

## Working with this codebase

- Edit in VS Code, commit and push via GitHub Desktop, deploys to GitHub Pages on push.
- Each JS file has a header comment block describing its purpose, exports, and dependencies.
- No build step. Refresh the browser after pushing to see changes live.
