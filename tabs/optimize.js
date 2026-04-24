function renderOptimize() {
  const el = document.getElementById("optimizePanel");
  const s = getCurrentScenario();
  if (!optTool) {
    const tools = [
      {id:"threshold", name:"Structural Thresholds", desc:"See where height triggers a structural system change and a cost jump.",
       icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20V8m6 12V4m6 16v-8m6 8V12"/></svg>`},
      {id:"parking",   name:"Parking Mix",           desc:"Model underground, above-grade, and surface configurations side-by-side.",
       icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`},
      {id:"shape",     name:"Shape Efficiency",      desc:"Compare square, rectangular, L, U, and tower floorplate premiums.",
       icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>`},
      {id:"area",      name:"CIQS vs Zoning GFA",    desc:"Convert between measured floor area and zoning GFA across common grossing factors.",
       icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3M21 12H3M21 18H3"/></svg>`}
    ];
    let html = `<div class="est-hint" style="margin-bottom:12px">Select a tool to analyze design tradeoffs. All tools pull from your current scenario.</div>`;
    html += tools.map(t => `<div class="opt-card" onclick="optTool='${t.id}';renderOptimize()">
      <div class="opt-card-icon">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
      </div>
    </div>`).join("");
    if (hasEstimate()) {
      const est = computeEstimate(s);
      html += `<div style="margin-top:14px;padding:12px 14px;background:var(--surface);border-radius:10px;border:1px solid var(--border);font-size:11px;color:var(--text-dim)">
        <span style="color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-size:10px">Using</span>
        ${est.type.label} · ${CITIES.find(c=>c.id===est.city).label} · ${fmtN(est.area)} sf
      </div>`;
    }
    el.innerHTML = html;
    return;
  }
  let html = `<button class="chev-btn" onclick="optTool=null;renderOptimize()" style="margin-bottom:14px">← All tools</button>`;
  if (optTool === "threshold") html += renderThreshold();
  else if (optTool === "parking") html += renderParkingOpt();
  else if (optTool === "shape")   html += renderShapeOpt();
  else if (optTool === "area")    html += renderAreaOpt();
  el.innerHTML = html;
}

function renderThreshold() {
  const s = getCurrentScenario();
  const city = s.city;
  const est = computeEstimate(s);
  const area = est ? est.area : s.inputs.gfa;
  const q = s.inputs.quality;
  const tiers = [
    {label:"Up to 12 Storeys",  id:"condo_12",      system:"Wood / Concrete, Post-Tension",        floors:"1–12",  note:"Most economical system. Wood frame up to 6 storeys."},
    {label:"13–39 Storeys",     id:"condo_13_39",   system:"Reinforced Concrete / Shear Wall",     floors:"13–39", note:"Major cost jump at 13 storeys. Deeper foundations, extended crane time."},
    {label:"40–60 Storeys",     id:"condo_40_60",   system:"High-Strength Concrete / Outrigger",   floors:"40–60", note:"Premium engineering. Wind tunnel testing typically required."},
    {label:"60+ Storeys",       id:"condo_60plus",  system:"High-Strength Concrete / Steel Hybrid", floors:"60+",  note:"Toronto and Vancouver only. Damping, specialized formwork."}
  ];
  const tierData = tiers.map(t => {
    const type = TYPES.find(x => x.id === t.id);
    const rate = lerp(type.rates[city][0], type.rates[city][1], q);
    return {...t, rate, totalCost: rate * area};
  });
  const baseRate = tierData[0].rate;
  const maxRate  = tierData[tierData.length-1].rate;
  let html = `<div style="font-size:14px;font-weight:600;margin-bottom:3px">Structural Thresholds</div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px">${CITIES.find(c=>c.id===city).label} · ${fmtN(area)} sf · ${q}% quality · Residential</div>`;
  html += `<div class="opt-result" style="margin-top:0">`;
  tierData.forEach((t, i) => {
    const jump    = i === 0 ? null : t.rate - tierData[i-1].rate;
    const jumpPct = i === 0 ? null : ((t.rate - tierData[i-1].rate) / tierData[i-1].rate * 100);
    const barW    = (t.rate / maxRate * 100).toFixed(0);
    const colors  = ["var(--green)","var(--accent)","var(--orange)","var(--red)"];
    html += `<div style="padding:13px 0;${i>0?'border-top:1px solid var(--surface-h)':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${t.label}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${t.system} · Floors ${t.floors}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-family:var(--mono);font-size:15px;font-weight:600;color:var(--accent)">$${t.rate}/sf</div>
          ${i > 0
            ? `<div class="savings-tag tag-cost" style="margin-top:3px">+$${jump} (+${jumpPct.toFixed(0)}%)</div>`
            : `<div class="savings-tag tag-neutral" style="margin-top:3px">Baseline</div>`}
        </div>
      </div>
      <div style="margin-top:8px"><div class="comp-track"><div class="comp-bar" style="width:${barW}%;background:${colors[i]};opacity:1"></div></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <div style="font-size:11px;color:var(--text-dim);padding-right:12px">${t.note}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap">${fmtM(t.totalCost)}</div>
      </div>
    </div>`;
  });
  const biggestJump = tierData[2].rate - tierData[1].rate;
  html += `<div class="insight">
    <div class="insight-label">Key Insight</div>
    <div class="insight-text">Biggest jump is at the 12→13 storey transition (+$${biggestJump}/sf). For a ${fmtN(area)} sf project, choosing 12 storeys instead of 13 saves approximately ${fmtM(biggestJump * area)} in hard costs.</div>
  </div></div>`;
  return html;
}

function renderParkingOpt() {
  const s = getCurrentScenario();
  const city = s.city;
  const q = s.inputs.quality;
  const stalls = s.inputs.parkingStalls || 100;
  const scenarios = [
    {label:"100% Underground",     mix:{ug:1.0, ag:0,   sf:0}},
    {label:"100% Above Grade",     mix:{ug:0,   ag:1.0, sf:0}},
    {label:"50 / 50 UG + Above",   mix:{ug:0.5, ag:0.5, sf:0}},
    {label:"70 UG / 30 Surface",   mix:{ug:0.7, ag:0,   sf:0.3}},
    {label:"50 Above / 50 Surface",mix:{ug:0,   ag:0.5, sf:0.5}},
    {label:"100% Surface",         mix:{ug:0,   ag:0,   sf:1.0}}
  ];
  const ugType = TYPES.find(x => x.id === "parkade_ug");
  const agType = TYPES.find(x => x.id === "parkade_ag");
  const sfType = TYPES.find(x => x.id === "surface_lot");
  const ugRate = lerp(ugType.rates[city][0], ugType.rates[city][1], q);
  const agRate = lerp(agType.rates[city][0], agType.rates[city][1], q);
  const sfRate = lerp(sfType.rates[city][0], sfType.rates[city][1], q);
  const data = scenarios.map(sc => {
    const cost = stalls * (sc.mix.ug * ugRate + sc.mix.ag * agRate + sc.mix.sf * sfRate);
    return {...sc, cost, perStall: cost / stalls};
  });
  const minCost = Math.min(...data.map(x => x.cost));
  const maxCost = Math.max(...data.map(x => x.cost));
  let html = `<div style="font-size:14px;font-weight:600;margin-bottom:3px">Parking Mix</div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">${CITIES.find(c=>c.id===city).label} · ${stalls} stalls · ${q}% quality</div>
    <div style="font-size:10.5px;color:var(--text-faint);margin-bottom:14px;font-family:var(--mono)">UG $${fmtN(ugRate)} · AG $${fmtN(agRate)} · Surface $${fmtN(sfRate)}</div>`;
  html += `<div class="opt-result" style="margin-top:0">`;
  data.forEach(sc => {
    const isMin = sc.cost === minCost;
    const isMax = sc.cost === maxCost;
    const savings = sc.cost - minCost;
    html += `<div class="scenario-row">
      <div style="flex:1">
        <div class="scenario-label">${sc.label}</div>
        <div style="font-size:10.5px;color:var(--text-faint);margin-top:2px">$${fmtN(sc.perStall)}/stall avg</div>
      </div>
      <div style="text-align:right">
        <div class="scenario-val" style="color:${isMin?'var(--green)':isMax?'var(--red)':'var(--text)'}">${fmtM(sc.cost)}</div>
        ${isMin ? `<div class="savings-tag tag-save">Lowest</div>` : `<div class="savings-tag tag-cost">+${fmtM(savings)}</div>`}
      </div>
    </div>`;
  });
  const ugTotal = stalls * ugRate;
  const potentialSaving = ugTotal - minCost;
  html += `<div class="insight">
    <div class="insight-label">Key Insight</div>
    <div class="insight-text">Switching from fully underground to surface-only saves ${fmtM(potentialSaving)} (${((potentialSaving/ugTotal)*100).toFixed(0)}%). Each underground stall costs ~${(ugRate/sfRate).toFixed(0)}× a surface stall.</div>
  </div></div>`;
  return html;
}

function renderShapeOpt() {
  const s = getCurrentScenario();
  const city = s.city;
  const est = computeEstimate(s);
  const area = est ? est.area : s.inputs.gfa;
  const rate = est ? est.rate : 300;
  const shapes = [
    {id:"square",   label:"Square",        ratio:1.00, desc:"Most efficient. Minimum perimeter for given area."},
    {id:"rect_2_1", label:"Rectangle 2:1", ratio:1.06, desc:"Slight premium. Common for site constraints."},
    {id:"rect_3_1", label:"Rectangle 3:1", ratio:1.15, desc:"Noticeable wall cost increase. Narrow sites."},
    {id:"lshape",   label:"L-Shape",       ratio:1.18, desc:"More exterior wall. Common for corner sites."},
    {id:"ushape",   label:"U-Shape",       ratio:1.25, desc:"High envelope cost. Courtyard amenity benefit."},
    {id:"tower",    label:"Point Tower",   ratio:1.12, desc:"Compact but all-exterior. Higher wind loads."}
  ];
  const envelopePct = 0.17;
  const baseCost = rate * area;
  const data = shapes.map(s => {
    const envelopePremium = baseCost * envelopePct * (s.ratio - 1);
    return {...s, envelopePremium, totalCost: baseCost + envelopePremium, effectiveRate: (baseCost + envelopePremium) / area};
  });
  let html = `<div style="font-size:14px;font-weight:600;margin-bottom:3px">Shape Efficiency</div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px">${CITIES.find(c=>c.id===city).label} · ${fmtN(area)} sf at $${rate}/sf · Envelope ~17% of construction</div>`;
  html += `<div class="opt-result" style="margin-top:0">`;
  data.forEach((s, i) => {
    const barW  = Math.min(100, (s.ratio / 1.30 * 100)).toFixed(0);
    const color = s.ratio <= 1.0 ? 'var(--green)' : s.ratio <= 1.10 ? 'var(--accent)' : s.ratio <= 1.18 ? 'var(--orange)' : 'var(--red)';
    html += `<div style="padding:12px 0;${i>0?'border-top:1px solid var(--surface-h)':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${s.label}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${s.desc}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-family:var(--mono);font-size:14px;font-weight:600">$${Math.round(s.effectiveRate)}/sf</div>
          ${s.envelopePremium > 0
            ? `<div class="savings-tag tag-cost">+${fmtM(s.envelopePremium)}</div>`
            : `<div class="savings-tag tag-save">Baseline</div>`}
        </div>
      </div>
      <div style="margin-top:6px"><div class="comp-track" style="height:12px"><div class="comp-bar" style="width:${barW}%;background:${color};opacity:1"></div></div></div>
    </div>`;
  });
  const worstPremium = data[4].envelopePremium;
  html += `<div class="insight">
    <div class="insight-label">Key Insight</div>
    <div class="insight-text">A U-shape costs ~${fmtM(worstPremium)} more than a square footprint due to added exterior wall. For irregular shapes forced by site constraints, budget an extra 15–25% for envelope premiums.</div>
  </div></div>`;
  return html;
}

function renderAreaOpt() {
  const s = getCurrentScenario();
  const est = computeEstimate(s);
  const area = est ? est.area : s.inputs.gfa;
  let html = `<div style="font-size:14px;font-weight:600;margin-bottom:3px">CIQS vs Zoning GFA</div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px">Grossing-up factor between measured construction area and zoning GFA</div>`;
  html += `<div class="opt-result" style="margin-top:0">
    <div class="est-section">
      <div class="est-label">CIQS Measured Area (sq ft)</div>
      <input type="number" inputmode="numeric" class="opt-input" id="ciqsInput" value="${area}" min="1000" step="1000" oninput="updateAreaCalc()">
      <div class="est-hint">Total enclosed area measured to exterior face of walls.</div>
    </div>`;
  const factors = [
    {label:"Residential Condo", factor:1.15, note:"Balconies, mechanical penthouses, amenity counted differently"},
    {label:"Office",            factor:1.10, note:"Mechanical floors, loading docks may be excluded"},
    {label:"Mixed-Use",         factor:1.18, note:"Multiple uses trigger different zoning calculations"},
    {label:"Retail / Commercial",factor:1.08, note:"Storage, receiving areas may be excluded"}
  ];
  html += `<div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Common Factors</div>`;
  factors.forEach(f => {
    const zoning = Math.round(area / f.factor);
    html += `<div style="padding:10px 0;border-bottom:1px solid var(--surface-h)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${f.label}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${f.note}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-family:var(--mono);font-size:13px;font-weight:600">${f.factor.toFixed(2)}×</div>
          <div style="font-size:10.5px;color:var(--text-faint)">Zoning: ${fmtN(zoning)} sf</div>
        </div>
      </div>
    </div>`;
  });
  html += `<div class="est-section" style="margin-top:14px">
    <div class="est-label">Custom Factor</div>
    <div style="display:flex;gap:10px;align-items:center">
      <input type="number" class="opt-input" id="customFactor" value="1.15" min="1.0" max="1.5" step="0.01" oninput="updateAreaCalc()" style="max-width:120px">
      <div style="font-size:12px;color:var(--text-dim)">→ Zoning GFA: <span id="customZoning" style="font-family:var(--mono);color:var(--accent);font-weight:600">${fmtN(Math.round(area/1.15))}</span> sf</div>
    </div>
  </div>
  <div class="insight">
    <div class="insight-label">Why It Matters</div>
    <div class="insight-text">Cost estimating uses CIQS (measured area). Zoning uses GFA (excludes certain areas). When a developer says "50,000 sf of GFA approved," actual construction area is typically 8–18% larger. Getting this wrong means underestimating cost from day one.</div>
  </div></div>`;
  return html;
}

function updateAreaCalc() {
  const c = document.getElementById("ciqsInput");
  const f = document.getElementById("customFactor");
  const z = document.getElementById("customZoning");
  if (c && f && z) {
    z.textContent = fmtN(Math.round((parseFloat(c.value)||50000) / (parseFloat(f.value)||1.15)));
  }
}