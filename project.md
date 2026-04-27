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
│   ├── state.js            App state, scenarios, notes, photos, localStorage persistence.
│   ├── compute.js          Pure cost calculation engine (computeEstimate).
│   └── ui.js               Formatters, tab switching, master refreshAll, PDF FAB.
│
├── data/                   Pure data and lookup helpers.
│   ├── building-types.js   CITIES and TYPES catalog (60+ types, 9 cities).
│   ├── defaults.js         TYPE_DEFAULTS, TYPE_FIELDS, garage data.
│   ├── energy.js           ENERGY (EUI, rates), MAINT, REPLACEMENTS for LCCA.
│   ├── parking.js          PARKING_RATIOS, CITY_PARKING_ADJ, suggestion logic.
│   ├── sustainability.js   EC_INTENSITY, GREEN_STANDARDS, incentives, carbon prices.
│   └── feasibility.js      Market anchors per city: rents, opex, cap rates, sellouts, ADR/occ.
│
└── tabs/                   One file per tab. Each owns its render* function.
    ├── browse.js           Catalog browser. Search + category pills.
    ├── estimate.js         Main input form. Largest file.
    ├── lcca.js             Life-cycle cost analysis with PV chart.
    ├── optimize.js         Four design-tradeoff tools.
    ├── feasibility.js      Development proforma: cost stack, revenue, returns, S&U, verdict.
    ├── compare.js          Side-by-side scenario comparison.
    ├── sustain.js          Green premium, embodied carbon, incentives.
    ├── notes-photos.js     Notes textarea + photo upload UI (used in Estimate tab).
    └── report.js           Report tab — all-scenarios summary, print-to-PDF stylesheet.
```

## File responsibilities (one-liner each)

| File | What it does |
|---|---|
| core/state.js | Owns scenarios, active tab, LCCA settings, sustain standard, notes/photos, feas block. Save/load with quota handling. |
| core/compute.js | Pure function: scenario → estimate object. No DOM, no state writes. |
| core/ui.js | Formatters (fmt, fmtM, fmtN, fmtRange), lerp, tab switching, refreshAll, PDF FAB toggle. |
| data/building-types.js | CITIES list + master TYPES catalog with Altus 2026 rates. |
| data/defaults.js | Per-type starting inputs, field schemas, garage cost data. |
| data/energy.js | LCCA inputs: EUI, energy rates, maintenance, replacement cycles. |
| data/parking.js | Stall-count suggestions by type and city transit context. |
| data/sustainability.js | Embodied carbon benchmarks, green premium %, provincial incentives. |
| data/feasibility.js | Market anchors per city × asset class: rent $/sf NLA, opex, cap rates, vacancy, condo $/sf, hotel ADR/occ. Asset-class mapper. |
| tabs/browse.js | Type catalog with search and category filtering. |
| tabs/estimate.js | Input form (per-type fields), live total, derived chips, cross-market chart. |
| tabs/lcca.js | 25/30/40/50-year present-value cost analysis with stacked bar chart. |
| tabs/optimize.js | Four tools: structural thresholds, parking mix, shape, CIQS vs zoning. |
| tabs/feasibility.js | Development proforma. Three revenue models (rental / for-sale / hotel) with auto-detect. Cost stack, revenue, NOI/margin, sensitivity table, sources & uses, go/no-go verdict, residual land value. |
| tabs/compare.js | A vs B delta table (2 scenarios) or compact list (3+). |
| tabs/sustain.js | Green standards, embodied carbon, code tiers, incentives. |
| tabs/notes-photos.js | Notes textarea (≤2000 chars) + photo upload (≤3 photos, 1200px JPEG). Used inside Estimate tab. |
| tabs/report.js | All-scenarios side-by-side summary with print-to-PDF stylesheet. |

## Load order (matters)

`index.html` must load files in this order so globals are defined before they're used:

1. `data/building-types.js` (CITIES, TYPES — referenced by everything)
2. `data/defaults.js` (TYPE_DEFAULTS, getTypeFields)
3. `data/energy.js`
4. `data/parking.js`
5. `data/sustainability.js`
6. `data/feasibility.js`
7. `core/state.js` (uses TYPES from data layer)
8. `core/compute.js` (uses TYPES, getTypeFields)
9. `core/ui.js` (orchestrates renderers)
10. `tabs/browse.js`
11. `tabs/estimate.js`
12. `tabs/lcca.js`
13. `tabs/optimize.js`
14. `tabs/feasibility.js`
15. `tabs/compare.js`
16. `tabs/sustain.js`
17. `tabs/notes-photos.js`
18. `tabs/report.js`

## Cost model

**Hard cost** = base rate × area × clearHeightMod × retailTierMod + parking + garage
**Base rate** = lerp(low, high, quality%) from the city's rate range in TYPES
**Effective GFA** is derived from keys (hotel), beds (hospital), students (school), NLA ÷ efficiency (office), or unitCount × unitSize (townhouse).
**Soft cost** = hardTotal × softPct (default 20% buildings, 15% non-buildings).
**Excludes**: GST/HST, tariffs, land. Uses CIQS measured area (not zoning GFA).

## Feasibility model

**Cost stack** = construction (hard + soft) + land + contingency + developer fee + interest carry. Interest = facility × avg-draw % × rate × term/12.
**Rental returns** = NOI ÷ Total Project Cost (yield-on-cost). Verdict goes if YoC ≥ market cap + target spread (default 150 bps).
**For-sale returns** = (Net Revenue − Total Project Cost) ÷ Net Revenue (margin). Verdict goes if margin ≥ target (default 15%).
**Hotel returns** = same shape as rental, with NOI built from RevPAR × keys × 365 grossed up to total revenue by tier-typical room share, then GOP minus mgmt fee and FF&E reserve.
**Residual land value** is the land cost at which the project hits exactly the target return.
**Excludes**: HST/GST recovery timing, refinancing fees, lease-up reserves. ±15% accuracy band on construction cost flows through.

## Scope and limits (be honest with users)

- Embodied carbon is one whole-building benchmark per type. Not material-level. Not EPD-driven.
- Rates are 2026 Altus Canadian Cost Guide. No tariff impact baked in.
- Estimating bands are ±15%. Feasibility-stage tool, not a quantity surveyor's takeoff.
- GTA is the primary calibrated market. Other cities use Altus regional ranges.
- Feasibility market defaults (rent, cap, ADR) are 2026 anchors from CBRE/Altus/Colliers reports — calibrated for feasibility-stage decisions, not lender-grade underwriting.

## Roadmap (next milestones)

1. PDF export polish — fix Report tab print button, add feasibility section to printout.
2. Material-level embodied carbon (structural system toggle: concrete / steel / mass timber).
3. User-customizable pricing database.
4. Field reporting pipeline (iPhone → server → AI-generated progress reports).

## Working with this codebase

- Edit in VS Code, commit and push via GitHub Desktop, deploys to GitHub Pages on push.
- Each JS file has a header comment block describing its purpose, exports, and dependencies.
- No build step. Refresh the browser after pushing to see changes live.