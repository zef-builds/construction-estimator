/**
 * tabs/estimate.js
 * Estimate tab. Largest file in the app. Renders the input form for the
 * selected building type (driven by getTypeFields), the live total summary
 * with cost breakdown, derived chips (FSR, floorplate, units, GFA from
 * keys/beds/students/NLA), and the cross-market rate comparison bar chart.
 * Field renderers branch on field name: gfa, tnUnits, siteArea, unitMix,
 * garage, parking, officeNla, clearHeight, retailTier, hotelKeys,
 * hospitalBeds, schoolCapacity, quality, softCost.
 * Exposes: renderEstimate, renderField, renderEstimateDerived,
 *          renderLiveSummary, renderCrossMarket, updateInput, updateParkingType,
 *          updateQuality, updateSoft, handleNumInput, formatNumInput,
 *          toggleAdvanced, applyParkingRatio.
 * Depends on: getCurrentScenario, getCurrentType (core/state.js),
 *             computeEstimate (core/compute.js), getTypeFields,
 *             getGarageLabel (data/defaults.js),
 *             getParkingRatioSuggestion (data/parking.js),
 *             CITIES, TYPES (data/building-types.js),
 *             fmt, fmtM, fmtN, fmtRange, lerp, getUnit, switchTab,
 *             updateTabBadges, showToast (core/ui.js).
 */
function updateInput(field, val) {
  const s = getCurrentScenario();
  // ANALYTICS: fire a one-time "estimate-generated" event the first time
  // a user actually engages with inputs after picking a building type.
  // We use a per-scenario flag so it doesn't fire on every keystroke.
  if (s.typeId && !s._estimateTracked) {
    s._estimateTracked = true;
    trackEvent && trackEvent("estimate-engaged");
  }
  if (["bachelor","one","two","three"].includes(field)) {
    s.inputs.unitMix[field] = val;
  } else {
    s.inputs[field] = val;
  }
  renderLiveSummary();
  renderEstimateDerived();
  renderCrossMarket();
  updateTabBadges();
}

function updateParkingType(p) {
  const s = getCurrentScenario();
  s.inputs.parkingType = p;
  if (p !== "none" && !s.inputs.parkingStalls) s.inputs.parkingStalls = 100;
  renderEstimate();
}

function updateQuality(v) {
  const s = getCurrentScenario();
  s.inputs.quality = v;
  document.getElementById("q-val").textContent = v + "%";
  renderLiveSummary();
  renderCrossMarket();
  updateTabBadges();
}

function updateSoft(v) {
  const s = getCurrentScenario();
  s.inputs.softPct = v;
  document.getElementById("soft-val").textContent = v + "%";
  renderLiveSummary();
  updateTabBadges();
}

function handleNumInput(el, field) {
  const raw = el.value.replace(/[^\d]/g, "");
  const val = raw ? parseInt(raw, 10) : 0;
  updateInput(field, val);
}

function formatNumInput(el, field) {
  const s = getCurrentScenario();
  const val = s.inputs[field];
  el.value = val > 0 ? fmtN(val) : "";
}

function toggleAdvanced(el) {
  el.classList.toggle("open");
  el.nextElementSibling.classList.toggle("open");
}

function applyParkingRatio(stalls) {
  getCurrentScenario().inputs.parkingStalls = stalls;
  renderEstimate();
  showToast(`${stalls} stalls applied`);
}

function renderEstimate() {
  const panel = document.getElementById("estimatePanel");
  const s = getCurrentScenario();
  if (!s.typeId) {
    panel.innerHTML = `<div class="empty">
      <div class="empty-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </div>
      <div class="empty-title">Pick a building type first</div>
      <div class="empty-text">Browse the catalog to select a building type, then return here to configure your project.</div>
      <button class="link-btn" onclick="switchTab('browse')" style="max-width:200px;margin:0 auto"><span>Browse Types</span><span class="link-btn-arrow">→</span></button>
    </div>`;
    return;
  }
  const t = getCurrentType();
  const r = t.rates[s.city];
  const unit = getUnit(t);
  const isBuilding = !t.perStall && !t.perLM && !t.perSM && !t.perUnit && !t.perAcre;
  const inp = s.inputs;
  const cityLabel = CITIES.find(c => c.id === s.city).label;
  const fields = getTypeFields(t);
  let html = `
  <div class="est-header">
    <div style="flex:1;min-width:0">
      <div class="est-header-name">${t.label}${t.sourceNote === "industry" ? `<span class="src-badge" title="Rate is industry estimate, not from Altus published guide">est</span>` : ""}</div>
      <div class="est-header-meta">
        <span>${cityLabel}</span>
        <span style="color:var(--text-faint)">·</span>
        <span>${t.cat}</span>
      </div>
      <div class="est-header-range">$${fmtN(r[0])} — $${fmtN(r[1])} ${unit}</div>
    </div>
    <button class="chev-btn" onclick="switchTab('browse')">Change</button>
  </div>
  <div id="liveSummary"></div>
  `;
  const advancedFields = [];
  const mainFields = [];
  fields.forEach(f => {
    if (f === "softCost") advancedFields.push(f);
    else mainFields.push(f);
  });
  mainFields.forEach(f => { html += renderField(f, s, t); });
  if (advancedFields.length > 0) {
    html += `<div class="adv-toggle" onclick="toggleAdvanced(this)">
      <span class="adv-toggle-icon">▸</span>
      <span>Advanced settings</span>
    </div>
    <div class="adv-content">`;
    advancedFields.forEach(f => { html += renderField(f, s, t); });
    html += `</div>`;
  }
  if (isBuilding) html += `<div id="crossMarket"></div>`;
  html += `<div id="notesPhotosBlock"></div>`;
  panel.innerHTML = html;
  renderLiveSummary();
  renderEstimateDerived();
  renderCrossMarket();
  renderNotesPhotos();
  updateTabBadges();
}

function renderField(field, s, t) {
  const inp = s.inputs;
  const r = t.rates[s.city];
  const unit = getUnit(t);

  if (field === "gfa") {
    return `<div class="est-section">
      <div class="est-label">Floor Area</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">GFA (sq ft)</div>
          <input type="text" inputmode="numeric" class="num-input" value="${fmtN(inp.gfa)}"
            oninput="handleNumInput(this,'gfa')" onblur="formatNumInput(this,'gfa')">
        </div>
        ${getTypeFields(t).includes("storeys") ? `<div class="field">
          <div class="field-small-label">Storeys</div>
          <input type="number" inputmode="numeric" class="num-input" value="${inp.storeys}" min="1" max="100" step="1"
            oninput="updateInput('storeys',+this.value||1)">
        </div>` : `<div></div>`}
      </div>
      ${getTypeFields(t).includes("storeys") ? `<div class="field-derived" id="floorplate-derived"></div>` : ""}
    </div>`;
  }

  if (field === "storeys") return "";

  if (field === "tnUnits") {
    return `<div class="est-section">
      <div class="est-label">Units</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">Number of Units</div>
          <input type="number" inputmode="numeric" class="num-input" value="${inp.unitCount}" min="1" max="500" step="1"
            oninput="updateInput('unitCount',+this.value||1)">
        </div>
        <div class="field">
          <div class="field-small-label">Avg. Unit Size (sf)</div>
          <input type="text" inputmode="numeric" class="num-input" value="${fmtN(inp.unitSize)}"
            oninput="handleNumInput(this,'unitSize')" onblur="formatNumInput(this,'unitSize')">
        </div>
      </div>
      <div class="field-derived" id="tn-derived"></div>
    </div>
    <div class="est-section">
      <div class="est-label">Storeys per Unit</div>
      <input type="number" inputmode="numeric" class="num-input" value="${inp.storeys}" min="1" max="6" step="1"
        oninput="updateInput('storeys',+this.value||1)" style="font-size:20px">
    </div>`;
  }

  if (field === "siteArea") {
    return `<div class="est-section">
      <div class="est-label">Site Area <span class="est-label-opt">· unlocks FSR</span></div>
      <input type="text" inputmode="numeric" class="num-input" value="${inp.siteArea > 0 ? fmtN(inp.siteArea) : ''}"
        placeholder="0"
        oninput="handleNumInput(this,'siteArea')" onblur="formatNumInput(this,'siteArea')">
      <div class="field-derived" id="fsr-derived"></div>
    </div>`;
  }

  if (field === "unitMix") {
    const mx = inp.unitMix;
    return `<div class="est-section">
      <div class="est-label">Unit Mix <span class="est-label-opt">· optional</span></div>
      <div class="unit-grid">
        ${[["bachelor","Bachelor"],["one","1 BR"],["two","2 BR"],["three","3 BR"]].map(([k,lbl])=>`
          <div class="unit-box">
            <label>${lbl}</label>
            <input type="number" inputmode="numeric" value="${mx[k]}" min="0" step="1"
              oninput="updateInput('${k}',+this.value||0)">
          </div>`).join("")}
      </div>
      <div class="field-derived" id="unit-derived"></div>
    </div>`;
  }

  if (field === "garage") {
    const g = inp.garage;
    const usesTnUnits = getTypeFields(t).includes("tnUnits");
    const helpText = usesTnUnits ? "Per unit. Multiplied by unit count." : "Attached garage built into the home.";
    return `<div class="est-section">
      <div class="est-label">Garage</div>
      <div class="pill-group">
        ${[["none","None"],["single","1 Car"],["double","2 Car"],["triple","3 Car"]].map(([k,lbl])=>
          `<button class="pill ${g===k?'active':''}" onclick="updateInput('garage','${k}');renderEstimate()">${lbl}</button>`).join("")}
      </div>
      <div class="est-hint">${helpText}</div>
    </div>`;
  }

  if (field === "parking") {
    const pt = inp.parkingType;
    const suggestion = getParkingRatioSuggestion(t, s);
    return `<div class="est-section">
      <div class="est-label">Parking</div>
      <div class="pill-group">
        ${[["none","None"],["surface","Surface"],["above","Above"],["underground","Underground"]].map(([p,lbl])=>
          `<button class="pill ${pt===p?'active':''}" onclick="updateParkingType('${p}')">${lbl}</button>`).join("")}
      </div>
      ${pt !== "none" ? `
      <div style="margin-top:14px">
        <div class="est-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>Number of Stalls</span>
          ${suggestion ? `<button onclick="applyParkingRatio(${suggestion.stalls})" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid var(--border-a);background:var(--accent-dim);color:var(--accent);cursor:pointer;font-family:var(--sans);font-weight:600">Use ${suggestion.stalls} · ${suggestion.label}</button>` : ''}
        </div>
        <input type="number" inputmode="numeric" class="num-input" value="${inp.parkingStalls||100}" min="1" step="10"
          oninput="updateInput('parkingStalls',+this.value||1)" style="font-size:20px">
        ${suggestion ? `<div class="est-hint" style="margin-top:6px">${suggestion.ratioLabel} · ${suggestion.cityNote}</div>` : ''}
      </div>` : ''}
    </div>`;
  }

  if (field === "officeNla") {
    const nla = inp.officeNla || 0;
    const eff = Math.max(50, Math.min(95, inp.officeEfficiency || 75));
    const derivedGfa = nla > 0 ? Math.round(nla / (eff / 100)) : 0;
    return `<div class="est-section">
      <div class="est-label">Rentable Area (NLA)</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">NLA (sq ft)</div>
          <input type="text" inputmode="numeric" class="num-input" value="${nla > 0 ? fmtN(nla) : ''}"
            placeholder="${fmtN(inp.gfa * 0.75)}"
            oninput="handleNumInput(this,'officeNla')" onblur="formatNumInput(this,'officeNla')">
        </div>
        <div class="field">
          <div class="field-small-label">Efficiency % (NLA/GFA)</div>
          <input type="number" inputmode="numeric" class="num-input" value="${eff}" min="50" max="95" step="1"
            oninput="updateInput('officeEfficiency',+this.value||75)">
        </div>
      </div>
      <div class="field-derived" id="nla-derived">
        ${derivedGfa > 0
          ? '<span class="chip">' + fmtN(derivedGfa) + ' sf derived GFA</span><span style="font-size:10.5px;color:var(--text-faint)">' + fmtN(nla) + ' sf NLA ÷ ' + eff + '% efficiency</span>'
          : '<span style="color:var(--text-faint);font-size:11px">Enter NLA to derive GFA · or use GFA tab directly</span>'}
      </div>
      <div class="est-hint">Typical office efficiency: 70–80% low-rise, 75–85% high-rise. Includes corridors, lobbies, mechanical.</div>
    </div>`;
  }

  if (field === "clearHeight") {
    const ch = inp.clearHeight || 28;
    const baseline = 28;
    const delta = ch - baseline;
    const mod = Math.max(0.85, Math.min(1.35, 1 + (delta / 4) * 0.025));
    const modPct = Math.round((mod - 1) * 100);
    const modLabel = modPct === 0 ? "baseline rate" : (modPct > 0 ? `+${modPct}% rate premium` : `${modPct}% rate discount`);
    const modColor = modPct > 0 ? "var(--orange)" : modPct < 0 ? "var(--green)" : "var(--text-faint)";
    return `<div class="est-section">
      <div class="slider-row">
        <span class="est-label">Clear Height</span>
        <span class="slider-val" id="ch-val">${ch} ft</span>
      </div>
      <input type="range" min="12" max="60" step="2" value="${ch}"
        oninput="updateInput('clearHeight',+this.value);document.getElementById('ch-val').textContent=this.value+' ft'">
      <div class="slider-anchors">
        <span>12 ft</span>
        <span class="slider-anchor-mid">28 ft (baseline)</span>
        <span>60 ft</span>
      </div>
      <div class="field-derived" style="margin-top:8px">
        <span class="chip" style="background:rgba(246,173,85,0.08);border-color:rgba(246,173,85,0.2);color:${modColor}">${modLabel}</span>
        <span style="font-size:10.5px;color:var(--text-faint)">${ch < 20 ? 'Mezzanine / storage' : ch < 28 ? 'Light industrial' : ch < 36 ? 'Standard warehouse' : ch < 48 ? 'High-bay distribution' : 'Mega-distribution / e-commerce'}</span>
      </div>
    </div>`;
  }

  if (field === "retailTier") {
    const tier = inp.retailTier || "shell";
    const tiers = [
      {id:"shell",    label:"Shell",    desc:"Base building only. Tenant does all interior work.",          mod:-35},
      {id:"landlord", label:"Landlord", desc:"Standard landlord work letter. Mechanical, electrical stub.", mod:0},
      {id:"turnkey",  label:"Turnkey",  desc:"Full tenant improvement. Ready for occupancy.",               mod:+35},
    ];
    const current = tiers.find(x => x.id === tier);
    return `<div class="est-section">
      <div class="est-label">Fit-Out Tier</div>
      <div class="pill-group">
        ${tiers.map(t2 => `<button class="pill ${tier===t2.id?'active':''}" onclick="updateInput('retailTier','${t2.id}')">${t2.label}</button>`).join("")}
      </div>
      <div class="est-hint" style="margin-top:8px">${current.desc}
        ${current.mod !== 0 ? ` <span style="color:${current.mod>0?'var(--orange)':'var(--green)'};">${current.mod>0?'+':''}${current.mod}% rate ${current.mod>0?'premium':'discount'}.</span>` : ' Landlord-standard rate.'}</div>
    </div>`;
  }

  if (field === "hotelKeys") {
    const keys = inp.hotelKeys || 0;
    const sqftPerKey = {hotel_budget:550, hotel_suite:750, hotel_full:1100};
    const sfpk = sqftPerKey[t.id] || 700;
    const derivedGfa = keys > 0 ? keys * sfpk : 0;
    return `<div class="est-section">
      <div class="est-label">Hotel Keys</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">Number of Keys</div>
          <input type="number" inputmode="numeric" class="num-input" value="${keys||''}" min="1" max="5000" step="1"
            placeholder="120"
            oninput="updateInput('hotelKeys',+this.value||0)">
        </div>
        <div class="field">
          <div class="field-small-label">Sq Ft / Key</div>
          <input type="number" class="num-input" value="${sfpk}" disabled style="opacity:.45;cursor:not-allowed">
        </div>
      </div>
      <div class="field-derived" id="hotel-derived">
        ${derivedGfa > 0
          ? `<span class="chip">${fmtN(derivedGfa)} sf derived GFA</span><span style="font-size:10.5px;color:var(--text-faint)">${keys} keys × ${fmtN(sfpk)} sf/key</span>`
          : '<span style="color:var(--text-faint);font-size:11px">Enter key count to derive GFA</span>'}
      </div>
    </div>`;
  }

  if (field === "hospitalBeds") {
    const beds = inp.hospitalBeds || 0;
    const sfpb = 1400;
    const derivedGfa = beds > 0 ? beds * sfpb : 0;
    return `<div class="est-section">
      <div class="est-label">Hospital Beds</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">Bed Count</div>
          <input type="number" inputmode="numeric" class="num-input" value="${beds||''}" min="1" max="2000" step="1"
            placeholder="300"
            oninput="updateInput('hospitalBeds',+this.value||0)">
        </div>
        <div class="field">
          <div class="field-small-label">Sq Ft / Bed</div>
          <input type="number" class="num-input" value="${sfpb}" disabled style="opacity:.45;cursor:not-allowed">
        </div>
      </div>
      <div class="field-derived" id="hospital-derived">
        ${derivedGfa > 0
          ? `<span class="chip">${fmtN(derivedGfa)} sf derived GFA</span><span style="font-size:10.5px;color:var(--text-faint)">${beds} beds × ${fmtN(sfpb)} sf/bed · acute care standard</span>`
          : '<span style="color:var(--text-faint);font-size:11px">Enter bed count to derive GFA</span>'}
      </div>
    </div>`;
  }

  if (field === "schoolCapacity") {
    const cap = inp.schoolCapacity || 0;
    const sqftPerStudent = {school_elem:100, school_sec:120};
    const sfps = sqftPerStudent[t.id] || 110;
    const typeLabel = t.id === "school_elem" ? "elementary" : "secondary";
    const derivedGfa = cap > 0 ? cap * sfps : 0;
    return `<div class="est-section">
      <div class="est-label">Student Capacity</div>
      <div class="field-grid">
        <div class="field">
          <div class="field-small-label">Students</div>
          <input type="number" inputmode="numeric" class="num-input" value="${cap||''}" min="1" max="5000" step="1"
            placeholder="${t.id === 'school_elem' ? '450' : '800'}"
            oninput="updateInput('schoolCapacity',+this.value||0)">
        </div>
        <div class="field">
          <div class="field-small-label">Sq Ft / Student</div>
          <input type="number" class="num-input" value="${sfps}" disabled style="opacity:.45;cursor:not-allowed">
        </div>
      </div>
      <div class="field-derived" id="school-derived">
        ${derivedGfa > 0
          ? `<span class="chip">${fmtN(derivedGfa)} sf derived GFA</span><span style="font-size:10.5px;color:var(--text-faint)">${fmtN(cap)} students × ${sfps} sf · ${typeLabel}</span>`
          : '<span style="color:var(--text-faint);font-size:11px">Enter student count to derive GFA</span>'}
      </div>
    </div>`;
  }

  if (field === "quality") {
    return `<div class="est-section">
      <div class="slider-row">
        <span class="est-label">Quality Level</span>
        <span class="slider-val" id="q-val">${inp.quality}%</span>
      </div>
      <input type="range" min="0" max="100" value="${inp.quality}"
        oninput="updateQuality(+this.value)">
      <div class="slider-anchors">
        <span>Base</span>
        <span class="slider-anchor-mid">Market Standard</span>
        <span>Premium</span>
      </div>
    </div>`;
  }

  if (field === "softCost") {
    return `<div class="est-section" style="padding-top:6px">
      <div class="slider-row">
        <span class="est-label">Soft Cost Allowance</span>
        <span class="slider-val" id="soft-val">${inp.softPct}%</span>
      </div>
      <input type="range" min="10" max="35" value="${inp.softPct}"
        oninput="updateSoft(+this.value)">
      <div class="est-hint">Design, permits, fees, project management</div>
    </div>`;
  }

  return "";
}

function renderEstimateDerived() {
  const s = getCurrentScenario();
  const inp = s.inputs;
  const t = getCurrentType();
  if (!t) return;
  const isBuilding = !t.perStall && !t.perLM && !t.perSM && !t.perUnit && !t.perAcre;
  if (!isBuilding) return;
  const fields = getTypeFields(t);
  const usesTnUnits = fields.includes("tnUnits");

  const fpEl = document.getElementById("floorplate-derived");
  if (fpEl) {
    const effectiveGfa = usesTnUnits ? inp.unitCount * inp.unitSize : inp.gfa;
    const fp = inp.storeys > 0 ? Math.round(effectiveGfa / inp.storeys) : 0;
    fpEl.innerHTML = `<span class="chip">Floorplate ${fmtN(fp)} sf</span>`;
  }

  const tnEl = document.getElementById("tn-derived");
  if (tnEl) {
    const totalGfa = inp.unitCount * inp.unitSize;
    tnEl.innerHTML = `<span class="chip">${fmtN(totalGfa)} sf total GFA</span><span style="font-size:10.5px;color:var(--text-faint)">${inp.unitCount} units × ${fmtN(inp.unitSize)} sf</span>`;
  }

  const fsrEl = document.getElementById("fsr-derived");
  if (fsrEl) {
    const effectiveGfa = usesTnUnits ? inp.unitCount * inp.unitSize : inp.gfa;
    if (inp.siteArea > 0) {
      const fsr = (effectiveGfa / inp.siteArea).toFixed(2);
      fsrEl.innerHTML = `<span class="chip chip-orange">FSR ${fsr}</span><span style="font-size:10.5px;color:var(--text-faint)">Verify against zoning</span>`;
    } else {
      fsrEl.innerHTML = `<span style="color:var(--text-faint);font-size:10.5px">Add site area to calculate FSR</span>`;
    }
  }

  const uEl = document.getElementById("unit-derived");
  if (uEl) {
    const total = Object.values(inp.unitMix).reduce((a,b)=>a+b,0);
    if (total > 0) {
      const est = computeEstimate(s);
      uEl.innerHTML = `<span class="chip">${total} units</span><span style="font-size:10.5px;color:var(--text-dim)">~${fmt(est.grandTotal/total)} per unit</span>`;
    } else {
      uEl.innerHTML = `<span style="color:var(--text-faint);font-size:10.5px">Enter unit counts for per-unit cost</span>`;
    }
  }
}

function renderLiveSummary() {
  const s = getCurrentScenario();
  const est = computeEstimate(s);
  const holder = document.getElementById("liveSummary");
  if (!holder || !est) return;
  const t = est.type;
  const unit = getUnit(t);
  const areaLabel = est.isBuilding ? fmtN(est.area) + " sf" : fmtN(est.area) + " " + unit.replace("/","");
  const perUnit = est.isBuilding && est.unitCount > 0 ? ` · ${fmt(est.grandTotal/est.unitCount)}/unit` : "";
  const inp2 = s.inputs;
  const perKey     = inp2.hotelKeys      > 0 ? ` · ${fmt(est.grandTotal/inp2.hotelKeys)}/key`         : "";
  const perBed     = inp2.hospitalBeds   > 0 ? ` · ${fmt(est.grandTotal/inp2.hospitalBeds)}/bed`       : "";
  const perStudent = inp2.schoolCapacity > 0 ? ` · ${fmt(est.grandTotal/inp2.schoolCapacity)}/student` : "";
  const unitMetric = perKey || perBed || perStudent || perUnit;

  holder.innerHTML = `<div class="live-summary">
    <button class="live-sum-export" onclick="switchTab('report')" title="Generate PDF Report" aria-label="Generate PDF Report">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      <span>PDF</span>
    </button>
    <div class="live-sum-row">
      <div>
        <div class="live-sum-label">Total Estimate</div>
        <div class="live-sum-total">${fmtM(est.grandTotal)}</div>
        <div class="live-sum-range">Range ${fmtRange(est.grandTotal)} <span class="acc-chip" style="margin-left:6px"><span class="acc-chip-dot"></span>±15%</span></div>
      </div>
      <div class="live-sum-per">
        <div class="live-sum-label">Rate</div>
        <div class="v">$${est.rate}${unit}</div>
        <div style="font-size:10.5px;color:var(--text-faint);margin-top:2px">${areaLabel}${unitMetric}</div>
      </div>
    </div>
  </div>
  <div class="result-card" style="margin-top:14px">
    <div class="result-body">
      <div class="result-row"><div><div class="lbl">Building Hard Cost</div><div class="sub">${fmtN(est.area)} ${est.isBuilding?"sf":unit.replace("/","")} × $${fmtN(est.rate)}${unit}</div></div><div class="val">${fmt(est.baseCost)}</div></div>
      ${est.garageDetail ? `<div class="result-row"><div><div class="lbl">${getGarageLabel(est.garageDetail.type)}</div><div class="sub">${est.garageDetail.units > 1 ? est.garageDetail.units + " units × " + fmt(est.garageDetail.perUnit) : "Attached, integrated"}</div></div><div class="val">${fmt(est.garageCost)}</div></div>` : ""}
      ${est.parkDetail ? `<div class="result-row"><div><div class="lbl">Parking (${est.parkDetail.type === "surface" ? "Surface" : est.parkDetail.type === "above" ? "Above Grade" : "Underground"})</div><div class="sub">${est.parkDetail.stalls} stalls × ${fmt(est.parkDetail.rate)}/stall</div></div><div class="val">${fmt(est.parkCost)}</div></div>` : ""}
      <div class="result-divider"></div>
      <div class="result-row"><div class="lbl" style="color:var(--text-dim)">Hard Cost Subtotal</div><div class="val val-dim">${fmt(est.hardTotal)}</div></div>
      <div class="result-row"><div><div class="lbl">Soft Cost Allowance</div><div class="sub">${est.softPct}% of hard costs</div></div><div class="val">${fmt(est.softCost)}</div></div>
      ${est.isBuilding && est.fsr > 0 ? `<div class="result-divider"></div><div class="result-row"><div><div class="lbl">FSR</div><div class="sub">Verify against zoning approval</div></div><div class="val" style="color:var(--orange)">${est.fsr}</div></div>` : ""}
    </div>
    <div class="result-footer">
      Altus Group 2026 Canadian Cost Guide. Note: 2026 rates do not include the impact of potential tariffs. CIQS floor area definition — apply 8–18% gross-up for zoning GFA. Excludes GST/HST, tariffs, land, soft costs unless added above. Estimating bands ±15%. For feasibility only.
    </div>
  </div>
  <button class="link-btn" onclick="switchTab('lcca')"><span>Run Life-Cycle Analysis</span><span class="link-btn-arrow">→</span></button>
  <button class="link-btn" onclick="switchTab('optimize')"><span>Explore Optimization Tools</span><span class="link-btn-arrow">→</span></button>
  `;
}

function renderCrossMarket() {
  const s = getCurrentScenario();
  const t = getCurrentType();
  if (!t) return;
  const isBuilding = !t.perStall && !t.perLM && !t.perSM && !t.perUnit && !t.perAcre;
  if (!isBuilding) { const cm = document.getElementById("crossMarket"); if (cm) cm.innerHTML = ""; return; }
  const q = s.inputs.quality;
  const allRates = CITIES.map(c => ({id:c.id, label:c.label, rate:lerp(t.rates[c.id][0], t.rates[c.id][1], q)}));
  const maxRate = Math.max(...allRates.map(x => x.rate));
  const minRate = Math.min(...allRates.map(x => x.rate));
  const cm = document.getElementById("crossMarket");
  if (!cm) return;
  cm.innerHTML = `<div class="comp-section">
    <div class="comp-title">
      <span>Rate Across Canada @ ${q}% Quality</span>
      <span style="text-transform:none;letter-spacing:0;font-family:var(--mono);color:var(--text-faint);font-weight:500">$${minRate}–$${maxRate}</span>
    </div>
    ${allRates.sort((a,b)=>b.rate-a.rate).map(c => {
      const w = (c.rate / maxRate * 100).toFixed(0);
      const isCurrent = c.id === s.city;
      return `<div class="comp-row">
        <div class="comp-city ${isCurrent?'current':''}">${c.label}</div>
        <div class="comp-track"><div class="comp-bar ${isCurrent?'current':''}" style="width:${w}%"></div></div>
        <div class="comp-val ${isCurrent?'current':''}">$${c.rate}</div>
      </div>`;
    }).join("")}
  </div>`;
}