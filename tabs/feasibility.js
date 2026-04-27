/**
 * tabs/feasibility.js
 * Feasibility tab. Development proforma layered on top of the construction
 * estimate. Three revenue models:
 *   - Rental:   apartment / office / industrial / retail — NOI ÷ cap rate
 *   - For-sale: condo / townhouse / SFR — sellout − costs
 *   - Hotel:    budget / suite / full — RevPAR build-up → NOI ÷ cap rate
 *
 * Layout (top → bottom):
 *   1. Asset class header + revenue model selector (auto-detected, overridable)
 *   2. Cost Stack — hard + soft + land + financing + contingency + dev fee
 *   3. Revenue Model — class-specific inputs and revenue calc
 *   4. Operating (rental + hotel only) — NOI build-up
 *   5. Returns — yield-on-cost, residual land value, untrended cap rate,
 *               developer margin (for-sale)
 *   6. Sensitivity — 5×5 table of yield-on-cost vs ±rent/sellout × ±cap/cost
 *   7. Sources & Uses — debt + equity waterfall
 *   8. Verdict — go/conditional/no-go vs target spread
 *
 * Live-updating, no Generate button. Following the sustain.js pattern:
 * one render function rebuilds the whole panel; inputs call setFeas() which
 * mutates scenario state and re-renders.
 *
 * FOCUS PRESERVATION: every input has a data-feas-field attribute. Before
 * each re-render we capture which field has focus and its caret position,
 * then restore it after innerHTML is rewritten. Inputs use type="text" with
 * inputmode hints rather than type="number" so caret state survives.
 *
 * Exposes: renderFeasibility, setFeas, applyFeasMarketDefaults,
 *          setRevenueModelOverride.
 * Depends on: getCurrentScenario, getCurrentType (core/state.js),
 *             computeEstimate (core/compute.js),
 *             FEAS_RENT, FEAS_OPEX, FEAS_CAP, FEAS_VACANCY, FEAS_CONDO_PSF,
 *             FEAS_HOTEL, FEAS_DEFAULTS, mapAssetClass, getMarketDefaults
 *               (data/feasibility.js),
 *             CITIES (data/building-types.js),
 *             fmt, fmtM, fmtN, switchTab, refreshAll (core/ui.js).
 */

// ---------------------------------------------------------------------------
// State plumbing
// ---------------------------------------------------------------------------
function getFeasState() {
  const s = getCurrentScenario();
  if (!s.feas) {
    s.feas = JSON.parse(JSON.stringify(FEAS_DEFAULTS));
    s.feas.modelOverride = null;  // null = auto-detect from typeId
    s.feas.rent = 0;
    s.feas.opex = 0;
    s.feas.cap = 0;
    s.feas.vacancy = 0;
    s.feas.condoPsf = 0;
    s.feas.adr = 0;
    s.feas.occ = 0;
  }
  return s.feas;
}

function setFeas(field, val) {
  const f = getFeasState();
  f[field] = val;
  renderFeasibility();
  if (typeof saveState === "function") saveState();
}

function applyFeasMarketDefaults() {
  const s = getCurrentScenario();
  const f = getFeasState();
  const cls = resolveAssetClass();
  const md = getMarketDefaults(s.city, cls);
  if (!md) { showToast("No market defaults for this asset class"); return; }
  if (md.kind === "rental") {
    f.rent = md.rent; f.opex = md.opex;
    f.cap = md.cap; f.vacancy = md.vacancy;
  } else if (md.kind === "for-sale") {
    f.condoPsf = md.condoPsf;
  } else if (md.kind === "hotel") {
    f.adr = md.adr; f.occ = md.occ; f.cap = md.cap;
  }
  trackEvent && trackEvent("feasibility-defaults-applied");  // ANALYTICS
  showToast("Market defaults applied");
  renderFeasibility();
}

function setRevenueModelOverride(model) {
  const f = getFeasState();
  f.modelOverride = model === "auto" ? null : model;
  // Reset class-specific values when switching kinds — avoid stale numbers
  f.rent = 0; f.opex = 0; f.cap = 0; f.vacancy = 0;
  f.condoPsf = 0; f.adr = 0; f.occ = 0;
  renderFeasibility();
}

// Resolve the active asset class: user override wins, else auto from typeId.
function resolveAssetClass() {
  const s = getCurrentScenario();
  const f = getFeasState();
  if (f.modelOverride) return f.modelOverride;
  return mapAssetClass(s.typeId);
}

// ---------------------------------------------------------------------------
// Input helpers — single source of truth for input markup
// ---------------------------------------------------------------------------
// Numeric input that survives re-render. type="text" + inputmode is used
// instead of type="number" so caret position can be saved and restored.
// `parser` runs on the raw string before being passed to setFeas.
//
// Use feasNumInput for plain numbers (rates, percentages, $/sf).
// Use feasIntInput for integer-only fields (months, occupancy, keys).
// Use feasMoneyInput for the formatted thousands-separated land cost field.
function feasNumInput(field, value, opts = {}) {
  const {placeholder = "0", style = ""} = opts;
  return `<input type="text" inputmode="decimal" data-feas-field="${field}"
    value="${value}" placeholder="${placeholder}"
    oninput="setFeas('${field}', parseFloat(this.value)||0)"
    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-family:var(--mono);font-size:13px;color:var(--text);${style}">`;
}

function feasIntInput(field, value, opts = {}) {
  const {placeholder = "0", style = ""} = opts;
  return `<input type="text" inputmode="numeric" data-feas-field="${field}"
    value="${value}" placeholder="${placeholder}"
    oninput="setFeas('${field}', parseInt(this.value.replace(/[^\\d]/g,''))||0)"
    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-family:var(--mono);font-size:13px;color:var(--text);${style}">`;
}

function feasMoneyInput(field, value, opts = {}) {
  const {style = ""} = opts;
  return `<input type="text" inputmode="numeric" data-feas-field="${field}"
    value="${(+value).toLocaleString()}"
    oninput="setFeas('${field}', parseInt(this.value.replace(/[^\\d]/g,''))||0)"
    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-family:var(--mono);font-size:13px;color:var(--text);${style}">`;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function renderFeasibility() {
  const panel = document.getElementById("feasPanel");
  if (!panel) return;

  // ----- Capture focus state before innerHTML is rewritten -----
  const active = document.activeElement;
  let focusedField = null, selStart = null, selEnd = null;
  if (active && panel.contains(active) && active.dataset && active.dataset.feasField) {
    focusedField = active.dataset.feasField;
    // selectionStart only exists on text-type inputs, which is what we use
    try {
      selStart = active.selectionStart;
      selEnd   = active.selectionEnd;
    } catch (e) { /* some input types throw; ignore */ }
  }

  const s = getCurrentScenario();
  if (!s.typeId) {
    panel.innerHTML = `<div class="empty">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg></div>
      <div class="empty-title">No estimate yet</div>
      <div class="empty-text">Configure a project in the Estimate tab, then return here for a development proforma.</div>
      <button class="link-btn" onclick="switchTab('estimate')" style="max-width:220px;margin:0 auto"><span>Build Estimate</span><span class="link-btn-arrow">→</span></button>
    </div>`;
    return;
  }

  const est = computeEstimate(s);
  const cls = resolveAssetClass();
  const cityLabel = CITIES.find(c => c.id === s.city).label;
  const f = getFeasState();

  if (!cls) {
    panel.innerHTML = renderHeader(est, cityLabel) +
      renderModelSelector(cls) +
      `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface);margin-top:10px">
        <div style="font-size:12px;color:var(--text-faint);text-align:center;padding:20px 10px">
          ${est.type.label} doesn't have a built-in revenue model.<br>
          <span style="color:var(--text-dim);font-size:11px">Pick a revenue model above to apply a proforma anyway, or use this tab with a building type that maps to apartment, office, industrial, retail, condo, townhouse, SFR, or hotel.</span>
        </div>
      </div>`;
    restoreFeasFocus(panel, focusedField, selStart, selEnd);
    return;
  }

  // Cost stack — shared across all models
  const costStack = computeCostStack(est, f);

  // Revenue / operating / returns vary by class
  let revenueBlock = "";
  let operatingBlock = "";
  let returnsBlock = "";
  let sensitivityBlock = "";
  let verdictBlock = "";

  if (["apartment","office","industrial","retail"].includes(cls)) {
    const r = computeRental(est, f, cls);
    revenueBlock    = renderRevenueRental(r, f, cls);
    operatingBlock  = renderOperatingRental(r);
    returnsBlock    = renderReturnsRental(r, costStack, f);
    sensitivityBlock= renderSensitivityRental(r, costStack, f);
    verdictBlock    = renderVerdictRental(r, costStack, f);
  } else if (["condo","townhouse","sfr"].includes(cls)) {
    const r = computeForSale(est, f, cls);
    revenueBlock    = renderRevenueForSale(r, f, cls);
    returnsBlock    = renderReturnsForSale(r, costStack, f);
    sensitivityBlock= renderSensitivityForSale(r, costStack, f);
    verdictBlock    = renderVerdictForSale(r, costStack, f);
  } else if (cls.startsWith("hotel-")) {
    const r = computeHotel(est, f, cls);
    revenueBlock    = renderRevenueHotel(r, f, cls);
    operatingBlock  = renderOperatingHotel(r);
    returnsBlock    = renderReturnsRental(r, costStack, f); // same shape: NOI / cap
    sensitivityBlock= renderSensitivityRental(r, costStack, f);
    verdictBlock    = renderVerdictRental(r, costStack, f);
  }

  panel.innerHTML =
    renderHeader(est, cityLabel) +
    renderModelSelector(cls) +
    renderCostStack(costStack, f) +
    revenueBlock +
    operatingBlock +
    returnsBlock +
    sensitivityBlock +
    renderSourcesUses(costStack, f) +
    verdictBlock +
    renderFooter();

  // ----- Restore focus after re-render -----
  restoreFeasFocus(panel, focusedField, selStart, selEnd);
}

// Restores focus and caret position to whichever input had focus before
// renderFeasibility rewrote the panel HTML.
function restoreFeasFocus(panel, focusedField, selStart, selEnd) {
  if (!focusedField) return;
  const next = panel.querySelector(`[data-feas-field="${focusedField}"]`);
  if (!next) return;
  next.focus();
  if (selStart !== null && selEnd !== null) {
    // For money/integer inputs, the formatted value length may have changed
    // (e.g. "5" → "5" still 1 char, but "1000" → "1,000" gains a comma).
    // Clamp to the new value length so the caret lands sensibly.
    const len = next.value.length;
    const start = Math.min(selStart, len);
    const end   = Math.min(selEnd, len);
    try { next.setSelectionRange(start, end); } catch (e) { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Header + model selector
// ---------------------------------------------------------------------------
function renderHeader(est, cityLabel) {
  return `<div class="est-header">
    <div style="flex:1;min-width:0">
      <div class="est-header-name">${est.type.label}</div>
      <div class="est-header-meta">
        <span>${cityLabel}</span>
        <span style="color:var(--text-faint)">·</span>
        <span>${fmtN(est.area)} sf GFA</span>
        <span style="color:var(--text-faint)">·</span>
        <span>${fmtM(est.grandTotal)} construction</span>
      </div>
    </div>
  </div>`;
}

function renderModelSelector(cls) {
  const opts = [
    {id:"auto",        label:"Auto"},
    {id:"apartment",   label:"Rental Apt"},
    {id:"office",      label:"Office"},
    {id:"industrial",  label:"Industrial"},
    {id:"retail",      label:"Retail"},
    {id:"condo",       label:"Condo"},
    {id:"townhouse",   label:"Townhouse"},
    {id:"sfr",         label:"SFR"},
    {id:"hotel-budget",label:"Hotel · Budget"},
    {id:"hotel-suite", label:"Hotel · Suite"},
    {id:"hotel-full",  label:"Hotel · Full"},
  ];
  const f = getFeasState();
  const active = f.modelOverride || "auto";
  return `<div class="est-section">
    <div class="est-label">Revenue Model</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${opts.map(o => `<button onclick="setRevenueModelOverride('${o.id}')" style="padding:6px 10px;border-radius:8px;border:1px solid ${active===o.id?'var(--border-a)':'var(--border)'};background:${active===o.id?'var(--accent-dim)':'var(--surface)'};color:${active===o.id?'var(--accent)':'var(--text-mid)'};font-size:11px;font-weight:${active===o.id?600:500};cursor:pointer;font-family:var(--sans)">${o.label}</button>`).join("")}
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
      <button onclick="applyFeasMarketDefaults()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--accent);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--sans)">Apply ${cls ? cls.split('-')[0] : ''} market defaults</button>
      <span style="font-size:10.5px;color:var(--text-faint)">Auto-detected: ${cls || "—"}</span>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Cost Stack
// ---------------------------------------------------------------------------
function computeCostStack(est, f) {
  const hard         = est.hardTotal;
  const soft         = est.softCost;
  const construction = hard + soft;
  const contingency  = Math.round(hard * f.contingencyPct / 100);
  const land         = Math.max(0, +f.landCost || 0);
  // Pre-financing total ex dev fee — base for financing calcs
  const preFee       = construction + contingency + land;
  const devFee       = Math.round(preFee * f.developerFeePct / 100);
  const facility     = Math.round((construction + contingency) * (f.ltcPct / 100));
  const avgOutstanding = facility * (f.avgDrawPct / 100);
  const interestCost = Math.round(avgOutstanding * (f.interestRate / 100) * (f.constructionMo / 12));
  const totalCost    = preFee + devFee + interestCost;
  const equityReq    = totalCost - facility;
  return {hard, soft, construction, contingency, land, devFee, interestCost,
          facility, avgOutstanding, totalCost, equityReq, preFee};
}

function renderCostStack(c, f) {
  const row = (label, value, opts={}) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;${opts.indent?'padding-left:10px;':''}">
      <span style="font-size:${opts.bold?13:12.5}px;font-weight:${opts.bold?600:400};color:${opts.bold?'var(--text)':'var(--text-mid)'}">${label}</span>
      <span style="font-family:var(--mono);font-size:${opts.bold?13:12.5}px;font-weight:${opts.bold?600:500};color:${opts.color||'var(--text)'}">${typeof value === 'number' ? fmt(value) : value}</span>
    </div>`;

  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Cost Stack</div>
    ${row("Hard cost",  c.hard, {indent:true})}
    ${row("Soft cost",  c.soft, {indent:true})}
    <div style="margin:6px 0;padding:6px 0;border-top:1px solid var(--surface-h)"></div>
    ${row("Construction subtotal", c.construction, {bold:true})}
    <div class="est-section" style="margin:10px 0 4px;padding:0">
      <div class="est-label" style="margin-bottom:4px">Land Cost ($)</div>
      ${feasMoneyInput("landCost", f.landCost)}
    </div>
    <div class="est-section" style="margin:8px 0 4px;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Contingency %</div>
        ${feasNumInput("contingencyPct", f.contingencyPct)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Developer Fee %</div>
        ${feasNumInput("developerFeePct", f.developerFeePct)}
      </div>
    </div>
    <div class="est-section" style="margin:8px 0 4px;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">LTC %</div>
        ${feasNumInput("ltcPct", f.ltcPct)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Interest Rate %</div>
        ${feasNumInput("interestRate", f.interestRate)}
      </div>
    </div>
    <div class="est-section" style="margin:8px 0 14px;padding:0">
      <div class="est-label" style="margin-bottom:4px">Construction Term (months)</div>
      ${feasIntInput("constructionMo", f.constructionMo)}
    </div>
    ${row("Land",          c.land, {indent:true})}
    ${row("Contingency",   c.contingency, {indent:true})}
    ${row("Developer fee", c.devFee, {indent:true})}
    ${row("Interest carry",c.interestCost, {indent:true, color:"var(--orange)"})}
    <div style="margin:6px 0;padding:6px 0;border-top:1px solid var(--border)"></div>
    ${row("Total Project Cost", c.totalCost, {bold:true, color:"var(--accent)"})}
    <div style="margin-top:6px;font-size:10.5px;color:var(--text-faint)">Interest carry assumes ${f.avgDrawPct}% avg facility outstanding × ${f.interestRate}% × ${f.constructionMo} months. Land entered at acquisition cost; financing on land not modelled separately.</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Rental revenue model
// ---------------------------------------------------------------------------
function computeRental(est, f, cls) {
  // NLA derivation: respect explicit input where the estimator has it, else
  // apply efficiency factor. Office uses inp.officeNla if set; apartment maps
  // to ~85% of GFA; industrial ~95%; retail ~90% (mid-points).
  const inp = est.inputs;
  const effDefault = {apartment:85, office:f.nlaEfficiency, industrial:95, retail:90}[cls];
  let nla;
  if (cls === "office" && inp.officeNla > 0) {
    nla = inp.officeNla;
  } else {
    nla = Math.round(est.area * effDefault / 100);
  }
  const gpr      = nla * f.rent;                    // gross potential rent
  const vacancy  = gpr * f.vacancy / 100;
  const egi      = gpr - vacancy;                   // effective gross income
  const opex     = nla * f.opex;
  const noi      = egi - opex;
  const valueAtCap = f.cap > 0 ? Math.round(noi / (f.cap / 100)) : 0;
  return {kind:"rental", cls, nla, gpr, vacancy, egi, opex, noi, valueAtCap};
}

function renderRevenueRental(r, f, cls) {
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Revenue · ${cls.charAt(0).toUpperCase()+cls.slice(1)} Rental</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Market Rent ($/sf NLA / yr)</div>
        ${feasNumInput("rent", f.rent)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Vacancy %</div>
        ${feasNumInput("vacancy", f.vacancy)}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">NLA</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtN(r.nla)} sf</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Gross Potential Rent</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmt(r.gpr)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Less: Vacancy (${f.vacancy}%)</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:var(--orange)">−${fmt(r.vacancy)}</span>
    </div>
    <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-size:13px;font-weight:600">Effective Gross Income</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:600">${fmt(r.egi)}</span>
    </div>
  </div>`;
}

function renderOperatingRental(r) {
  const f = getFeasState();
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Operating</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Effective Gross Income</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmt(r.egi)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Less: Operating Expenses</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:var(--orange)">−${fmt(r.opex)}</span>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-size:13px;font-weight:700;color:var(--accent)">Net Operating Income</span>
      <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent)">${fmt(r.noi)}</span>
    </div>
    <div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:var(--bg)">
      <div class="est-label" style="margin-bottom:4px">Operating Expense Override ($/sf NLA / yr)</div>
      ${feasNumInput("opex", f.opex, {style:"background:var(--surface)"})}
    </div>
  </div>`;
}

function renderReturnsRental(r, c, f) {
  const yoc = c.totalCost > 0 ? (r.noi / c.totalCost * 100) : 0;
  const spreadBps = Math.round((yoc - f.cap) * 100);
  // Residual land value: solve for land such that yoc = market cap + spread.
  // land = NOI / (cap+spread) − (totalCost−land)
  const targetReturn = (f.cap + f.targetSpreadBps / 100) / 100;
  const nonLand = c.totalCost - c.land;
  const residualLand = targetReturn > 0 ? Math.round(r.noi / targetReturn - nonLand) : 0;
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Returns</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Market Cap Rate %</div>
        ${feasNumInput("cap", f.cap)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Target Spread (bps)</div>
        ${feasIntInput("targetSpreadBps", f.targetSpreadBps)}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Yield on Cost</span>
      <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:${yoc>=f.cap+f.targetSpreadBps/100?'var(--green)':yoc>=f.cap?'var(--orange)':'var(--red)'}">${yoc.toFixed(2)}%</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Spread vs Market Cap</span>
      <span style="font-family:var(--mono);font-size:12.5px">${spreadBps>=0?'+':''}${spreadBps} bps</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Stabilized Value @ Cap</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtM(r.valueAtCap)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Profit (Value − Cost)</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:${r.valueAtCap-c.totalCost>=0?'var(--green)':'var(--red)'}">${fmt(r.valueAtCap - c.totalCost)}</span>
    </div>
    <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline;margin-top:6px">
      <span style="font-size:13px;font-weight:600">Residual Land Value</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:${residualLand>=c.land?'var(--accent)':'var(--orange)'}">${fmt(residualLand)}</span>
    </div>
    <div style="margin-top:6px;font-size:10.5px;color:var(--text-faint)">RLV is the land cost at which the project hits exactly market cap + ${f.targetSpreadBps} bps yield-on-cost. If your actual land cost (${fmt(c.land)}) is below this, the deal pencils above target.</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// For-sale revenue model (condo / townhouse / SFR)
// ---------------------------------------------------------------------------
function computeForSale(est, f, cls) {
  const nsa = Math.round(est.area * f.condoEfficiency / 100);
  const grossSellout = nsa * f.condoPsf;
  const sgaCost      = Math.round(grossSellout * f.condoSGA / 100);
  const netRevenue   = grossSellout - sgaCost;
  return {kind:"for-sale", cls, nsa, grossSellout, sgaCost, netRevenue};
}

function renderRevenueForSale(r, f, cls) {
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Revenue · ${cls.charAt(0).toUpperCase()+cls.slice(1)} Sellout</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Sellout $/sf NSA</div>
        ${feasNumInput("condoPsf", f.condoPsf)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">NSA / GFA Efficiency %</div>
        ${feasNumInput("condoEfficiency", f.condoEfficiency)}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Sales/Marketing/G&A %</div>
        ${feasNumInput("condoSGA", f.condoSGA)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Target Margin %</div>
        ${feasNumInput("condoMargin", f.condoMargin)}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">NSA</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtN(r.nsa)} sf</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Gross Sellout</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtM(r.grossSellout)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Less: Sales / G&A (${f.condoSGA}%)</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:var(--orange)">−${fmt(r.sgaCost)}</span>
    </div>
    <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-size:13px;font-weight:600">Net Revenue</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:600">${fmtM(r.netRevenue)}</span>
    </div>
  </div>`;
}

function renderReturnsForSale(r, c, f) {
  const profit = r.netRevenue - c.totalCost;
  const margin = r.netRevenue > 0 ? (profit / r.netRevenue * 100) : 0;
  const profitOnCost = c.totalCost > 0 ? (profit / c.totalCost * 100) : 0;
  // Residual land: land that yields exactly target margin
  // margin = (netRevenue − totalCost) / netRevenue
  // → totalCost = netRevenue × (1 − margin)
  // → land = netRevenue × (1 − margin) − (totalCost − land)
  const targetTotalCost = r.netRevenue * (1 - f.condoMargin / 100);
  const residualLand = Math.round(targetTotalCost - (c.totalCost - c.land));
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Returns</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Net Revenue</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtM(r.netRevenue)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Total Project Cost</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtM(c.totalCost)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Profit</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:${profit>=0?'var(--green)':'var(--red)'}">${fmtM(profit)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:13px;font-weight:600">Margin on Revenue</span>
      <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:${margin>=f.condoMargin?'var(--green)':margin>=10?'var(--orange)':'var(--red)'}">${margin.toFixed(1)}%</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Profit on Cost</span>
      <span style="font-family:var(--mono);font-size:12.5px">${profitOnCost.toFixed(1)}%</span>
    </div>
    <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline;margin-top:6px">
      <span style="font-size:13px;font-weight:600">Residual Land Value</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:${residualLand>=c.land?'var(--accent)':'var(--orange)'}">${fmt(residualLand)}</span>
    </div>
    <div style="margin-top:6px;font-size:10.5px;color:var(--text-faint)">RLV is the land cost at which the project hits exactly the ${f.condoMargin}% margin target.</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Hotel revenue model — RevPAR build-up
// ---------------------------------------------------------------------------
function computeHotel(est, f, cls) {
  const inp = est.inputs;
  // Keys: prefer explicit hotelKeys input, else derive from GFA / sqft-per-key
  const SQFT_PER_KEY = {budget:550, suite:750, full:1100};
  const tier = cls.split("-")[1];
  const sqftPerKey = SQFT_PER_KEY[tier] || 700;
  const keys = inp.hotelKeys > 0 ? inp.hotelKeys : Math.max(1, Math.round(est.area / sqftPerKey));
  const revpar      = f.adr * (f.occ / 100);
  const roomRev     = Math.round(keys * 365 * revpar);
  const totalRev    = Math.round(roomRev / 0.65); // assume rooms are 65% of total revenue (typical full-service); for budget this skews higher
  // Refine: budget hotels are nearly all room revenue
  const roomShare   = {budget:0.95, suite:0.85, full:0.65}[tier] || 0.75;
  const totalRevAdj = Math.round(roomRev / roomShare);
  const gop         = Math.round(totalRevAdj * f.hotelGOPpct / 100);
  const mgmtFee     = Math.round(totalRevAdj * f.hotelMgmtFee / 100);
  const ffeReserve  = Math.round(totalRevAdj * f.hotelFFEReserve / 100);
  const noi         = gop - mgmtFee - ffeReserve;
  const valueAtCap  = f.cap > 0 ? Math.round(noi / (f.cap / 100)) : 0;
  // Adapter for the rental returns/sensitivity renderers, which key on:
  //   nla, gpr, vacancy, egi, opex, noi, valueAtCap.
  return {kind:"hotel", cls, tier, keys, revpar, roomRev, totalRev:totalRevAdj,
          gop, mgmtFee, ffeReserve, noi, valueAtCap,
          // adapter fields
          nla:keys, gpr:totalRevAdj, vacancy:0, egi:totalRevAdj,
          opex:totalRevAdj-gop+mgmtFee+ffeReserve};
}

function renderRevenueHotel(r, f, cls) {
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Revenue · Hotel ${r.tier.charAt(0).toUpperCase()+r.tier.slice(1)} (RevPAR Build-Up)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="est-label" style="margin-bottom:4px">Average Daily Rate ($)</div>
        ${feasNumInput("adr", f.adr)}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Stabilized Occupancy %</div>
        ${feasNumInput("occ", f.occ)}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Keys</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmtN(r.keys)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">RevPAR ($/key/night)</span>
      <span style="font-family:var(--mono);font-size:12.5px">$${r.revpar.toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Annual Room Revenue</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmt(r.roomRev)}</span>
    </div>
    <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-size:13px;font-weight:600">Total Annual Revenue</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:600">${fmt(r.totalRev)}</span>
    </div>
    <div style="margin-top:6px;font-size:10.5px;color:var(--text-faint)">Total revenue grosses up rooms by tier-typical share (budget ~95%, suite ~85%, full-service ~65%) to capture F&B, parking, and ancillary income.</div>
  </div>`;
}

function renderOperatingHotel(r) {
  const f = getFeasState();
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Operating</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Total Revenue</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmt(r.totalRev)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">GOP @ ${f.hotelGOPpct}%</span>
      <span style="font-family:var(--mono);font-size:12.5px">${fmt(r.gop)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Less: Mgmt Fee (${f.hotelMgmtFee}%)</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:var(--orange)">−${fmt(r.mgmtFee)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <span style="font-size:12.5px;color:var(--text-mid)">Less: FF&E Reserve (${f.hotelFFEReserve}%)</span>
      <span style="font-family:var(--mono);font-size:12.5px;color:var(--orange)">−${fmt(r.ffeReserve)}</span>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:6px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-size:13px;font-weight:700;color:var(--accent)">Net Operating Income</span>
      <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent)">${fmt(r.noi)}</span>
    </div>
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div>
        <div class="est-label" style="margin-bottom:4px">GOP %</div>
        ${feasNumInput("hotelGOPpct", f.hotelGOPpct, {style:"padding:6px 8px;border-radius:6px;font-size:12px"})}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">Mgmt %</div>
        ${feasNumInput("hotelMgmtFee", f.hotelMgmtFee, {style:"padding:6px 8px;border-radius:6px;font-size:12px"})}
      </div>
      <div>
        <div class="est-label" style="margin-bottom:4px">FF&E %</div>
        ${feasNumInput("hotelFFEReserve", f.hotelFFEReserve, {style:"padding:6px 8px;border-radius:6px;font-size:12px"})}
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Sensitivity tables
// ---------------------------------------------------------------------------
function renderSensitivityRental(r, c, f) {
  // 5×5: rent shocks (rows: −10/−5/0/+5/+10%) × cap shocks (cols: −50/−25/0/+25/+50 bps)
  // For hotel: rent shock = total revenue shock
  const rentDeltas = [-10,-5,0,5,10];
  const capDeltas  = [-50,-25,0,25,50];
  const baseNoi    = r.noi;
  const baseRev    = r.gpr || r.totalRev || 0;
  // For rental, NOI scales as: (rent×(1+d) − vacancy× (1+d)... ) − opex.
  // Simplification: NOI shock ≈ rentShock × (gpr − vacancy) − 0 = rentShock × egi
  // More accurate: new EGI = egi × (1+d); new NOI = newEGI − opex
  const buildRow = (d) => {
    const newEgi = (r.egi || baseRev) * (1 + d/100);
    const newNoi = newEgi - (r.opex || (r.totalRev - r.gop + r.mgmtFee + r.ffeReserve));
    return capDeltas.map(cd => {
      const newCap = (f.cap + cd/100) / 100;
      const yoc = c.totalCost > 0 ? (newNoi / c.totalCost * 100) : 0;
      const target = f.cap + f.targetSpreadBps/100 + cd/100;
      const cls = yoc >= target ? "go" : (yoc >= f.cap + cd/100 ? "warn" : "no");
      return {yoc, cls, newCap:newCap*100};
    });
  };
  const rows = rentDeltas.map(d => ({d, cells:buildRow(d)}));
  const colorFor = (cls) => cls==="go"?"var(--green)":cls==="warn"?"var(--orange)":"var(--red)";
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Sensitivity · Yield-on-Cost (%)</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px">
        <thead>
          <tr>
            <th style="padding:6px 4px;text-align:left;color:var(--text-faint);font-weight:600;font-size:10px;border-bottom:1px solid var(--surface-h)">Rev Δ ↓ / Cap Δ →</th>
            ${capDeltas.map(cd => `<th style="padding:6px 4px;text-align:right;color:var(--text-faint);font-weight:600;font-size:10px;border-bottom:1px solid var(--surface-h)">${cd>0?'+':''}${cd}bp</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>
            <td style="padding:6px 4px;color:var(--text-mid);font-weight:600">${row.d>0?'+':''}${row.d}%</td>
            ${row.cells.map(c => `<td style="padding:6px 4px;text-align:right;color:${colorFor(c.cls)};font-weight:${c.d===0&&row.d===0?700:500}">${c.yoc.toFixed(2)}</td>`).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div style="margin-top:8px;font-size:10.5px;color:var(--text-faint)"><span style="color:var(--green)">Green</span> = above target spread. <span style="color:var(--orange)">Orange</span> = positive but below target. <span style="color:var(--red)">Red</span> = below market cap.</div>
  </div>`;
}

function renderSensitivityForSale(r, c, f) {
  // 5×5: sellout $/sf shocks × hard-cost shocks
  const revDeltas  = [-10,-5,0,5,10];
  const costDeltas = [-10,-5,0,5,10];
  const buildRow = (d) => {
    const newRev = r.netRevenue * (1 + d/100);
    return costDeltas.map(cd => {
      const newCost = c.totalCost * (1 + cd/100);
      const margin  = newRev > 0 ? ((newRev - newCost) / newRev * 100) : 0;
      const cls = margin >= f.condoMargin ? "go" : (margin >= 10 ? "warn" : "no");
      return {margin, cls};
    });
  };
  const rows = revDeltas.map(d => ({d, cells:buildRow(d)}));
  const colorFor = (cls) => cls==="go"?"var(--green)":cls==="warn"?"var(--orange)":"var(--red)";
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Sensitivity · Margin (%)</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px">
        <thead>
          <tr>
            <th style="padding:6px 4px;text-align:left;color:var(--text-faint);font-weight:600;font-size:10px;border-bottom:1px solid var(--surface-h)">Sellout Δ ↓ / Cost Δ →</th>
            ${costDeltas.map(cd => `<th style="padding:6px 4px;text-align:right;color:var(--text-faint);font-weight:600;font-size:10px;border-bottom:1px solid var(--surface-h)">${cd>0?'+':''}${cd}%</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>
            <td style="padding:6px 4px;color:var(--text-mid);font-weight:600">${row.d>0?'+':''}${row.d}%</td>
            ${row.cells.map(cell => `<td style="padding:6px 4px;text-align:right;color:${colorFor(cell.cls)};font-weight:500">${cell.margin.toFixed(1)}</td>`).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div style="margin-top:8px;font-size:10.5px;color:var(--text-faint)"><span style="color:var(--green)">Green</span> = at or above ${f.condoMargin}% target. <span style="color:var(--orange)">Orange</span> = 10–${f.condoMargin}%. <span style="color:var(--red)">Red</span> = below 10% (thin or negative).</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Sources & Uses
// ---------------------------------------------------------------------------
function renderSourcesUses(c, f) {
  const debt   = c.facility;
  const equity = c.equityReq;
  const total  = c.totalCost;
  const debtPct   = total>0 ? (debt/total*100) : 0;
  const equityPct = total>0 ? (equity/total*100) : 0;
  const usesRows = [
    ["Land",                c.land,         "var(--text)"],
    ["Hard Cost",           c.hard,         "var(--text)"],
    ["Soft Cost",           c.soft,         "var(--text)"],
    ["Contingency",         c.contingency,  "var(--text)"],
    ["Developer Fee",       c.devFee,       "var(--text)"],
    ["Financing (Interest)",c.interestCost, "var(--orange)"],
  ];
  return `<div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
    <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Sources & Uses</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px">Sources</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px">Construction Loan</span>
          <span style="font-family:var(--mono);font-size:12px">${fmt(debt)}</span>
        </div>
        <div style="font-size:10px;color:var(--text-faint);margin-bottom:8px;padding-left:2px">${debtPct.toFixed(0)}% LTC · ${f.interestRate}%</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px">Equity</span>
          <span style="font-family:var(--mono);font-size:12px;color:var(--accent)">${fmt(equity)}</span>
        </div>
        <div style="font-size:10px;color:var(--text-faint);margin-bottom:8px;padding-left:2px">${equityPct.toFixed(0)}% of TPC</div>
        <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:600">Total Sources</span>
          <span style="font-family:var(--mono);font-size:12px;font-weight:600">${fmt(total)}</span>
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px">Uses</div>
        ${usesRows.map(([lbl,val,col]) => `<div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px;color:${col}">${lbl}</span>
          <span style="font-family:var(--mono);font-size:12px;color:${col}">${fmt(val)}</span>
        </div>`).join("")}
        <div style="border-top:1px solid var(--surface-h);padding-top:6px;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:600">Total Uses</span>
          <span style="font-family:var(--mono);font-size:12px;font-weight:600">${fmt(total)}</span>
        </div>
      </div>
    </div>
    <div style="margin-top:10px;height:6px;border-radius:3px;background:var(--bg);overflow:hidden;display:flex">
      <div style="height:100%;background:var(--accent);width:${debtPct}%"></div>
      <div style="height:100%;background:var(--green);width:${equityPct}%"></div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Verdict (go/conditional/no-go)
// ---------------------------------------------------------------------------
function renderVerdictRental(r, c, f) {
  const yoc = c.totalCost > 0 ? (r.noi / c.totalCost * 100) : 0;
  const target = f.cap + f.targetSpreadBps / 100;
  let verdict, color, text;
  if (f.cap === 0 || c.totalCost === 0) {
    verdict = "INPUT NEEDED"; color = "var(--text-faint)";
    text = "Enter a market cap rate to see the verdict.";
  } else if (yoc >= target) {
    verdict = "GO"; color = "var(--green)";
    text = `Yield-on-cost of ${yoc.toFixed(2)}% clears the ${target.toFixed(2)}% target (market cap + ${f.targetSpreadBps}bps spread). The deal pencils.`;
  } else if (yoc >= f.cap) {
    verdict = "CONDITIONAL"; color = "var(--orange)";
    text = `Yield-on-cost of ${yoc.toFixed(2)}% is above market cap (${f.cap.toFixed(2)}%) but below target spread. Pencils on a build-to-core basis but won't generate development profit at exit.`;
  } else {
    verdict = "NO-GO"; color = "var(--red)";
    text = `Yield-on-cost of ${yoc.toFixed(2)}% is below market cap (${f.cap.toFixed(2)}%). Project is value-destructive at current assumptions — re-cut land cost, density, or revenue model.`;
  }
  return verdictBox(verdict, color, text);
}

function renderVerdictForSale(r, c, f) {
  const margin = r.netRevenue > 0 ? ((r.netRevenue - c.totalCost) / r.netRevenue * 100) : -100;
  let verdict, color, text;
  if (r.netRevenue === 0) {
    verdict = "INPUT NEEDED"; color = "var(--text-faint)";
    text = "Enter a sellout $/sf to see the verdict.";
  } else if (margin >= f.condoMargin) {
    verdict = "GO"; color = "var(--green)";
    text = `Margin of ${margin.toFixed(1)}% clears the ${f.condoMargin}% target. Project pencils.`;
  } else if (margin >= 10) {
    verdict = "CONDITIONAL"; color = "var(--orange)";
    text = `Margin of ${margin.toFixed(1)}% is positive but below the ${f.condoMargin}% target. Tighten land basis, hard cost, or sellout to clear target.`;
  } else if (margin >= 0) {
    verdict = "THIN"; color = "var(--orange)";
    text = `Margin of ${margin.toFixed(1)}% is barely positive — no buffer for cost overruns or absorption risk.`;
  } else {
    verdict = "NO-GO"; color = "var(--red)";
    text = `Margin of ${margin.toFixed(1)}% — sellout doesn't cover total cost. Project is loss-making at current assumptions.`;
  }
  return verdictBox(verdict, color, text);
}

function verdictBox(verdict, color, text) {
  return `<div class="est-section" style="border:2px solid ${color};border-radius:14px;padding:18px;background:var(--surface);margin-top:14px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
      <div style="width:46px;height:46px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;letter-spacing:0.5px;text-align:center;line-height:1.05;padding:4px">${verdict.split(' ').join('<br>')}</div>
      <div style="flex:1;font-size:13px;line-height:1.45;color:var(--text)">${text}</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function renderFooter() {
  return `<div style="margin-top:18px;padding:12px 14px;border-radius:10px;background:var(--bg);border:1px solid var(--surface-h);font-size:10.5px;color:var(--text-faint);line-height:1.5">
    <strong style="color:var(--text-mid)">Methodology.</strong> Cost stack uses the construction estimate (hard + soft) plus user-entered land, contingency, developer fee, and an interest carry of avg-outstanding × rate × term. Rental returns are NOI ÷ Total Project Cost. For-sale returns are (Net Revenue − Total Project Cost) ÷ Net Revenue. Hotel returns build NOI from RevPAR × keys × 365, grossed up to total revenue by tier-typical room share, then GOP minus mgmt fee and FF&E reserve. Market defaults are 2026 anchors from CBRE, Altus, Colliers reports — calibrated for feasibility-stage decisions, not lender-grade underwriting. Excludes HST/GST recovery timing, refinancing fees, and lease-up reserves. ±15% accuracy band on construction cost flows through to all downstream numbers.
  </div>`;
}