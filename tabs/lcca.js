function setLccaPreset(preset) {
  lccaPreset = preset;
  if (preset === "conservative") { lccaDiscount = 2.0; lccaEnergyEsc = 1.5; lccaMaintTier = "low"; }
  else if (preset === "standard")    { lccaDiscount = 3.5; lccaEnergyEsc = 2.5; lccaMaintTier = "standard"; }
  else if (preset === "aggressive")  { lccaDiscount = 5.5; lccaEnergyEsc = 4.0; lccaMaintTier = "high"; }
  renderLCCA();
}

function renderLCCA() {
  const el = document.getElementById("lccaPanel");
  const s = getCurrentScenario();
  if (!s.typeId) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M7 14l4-4 4 4 6-6"/></svg></div>
      <div class="empty-title">No estimate yet</div>
      <div class="empty-text">Configure a project in the Estimate tab, then return here to see its 30-year cost.</div>
      <button class="link-btn" onclick="switchTab('estimate')" style="max-width:220px;margin:0 auto"><span>Build Estimate</span><span class="link-btn-arrow">→</span></button>
    </div>`;
    return;
  }
  const est = computeEstimate(s);
  const cityLabel = CITIES.find(c => c.id === est.city).label;
  let html = `<div class="est-header">
    <div style="flex:1;min-width:0">
      <div class="est-header-name">${est.type.label}</div>
      <div class="est-header-meta">
        <span>${cityLabel}</span>
        <span style="color:var(--text-faint)">·</span>
        <span>${fmtN(est.area)} ${est.type.perLM ? 'lin.m' : est.type.perSM ? 'sq.m' : est.type.perUnit ? 'units' : est.type.perAcre ? 'acres' : 'sf'}</span>
        <span style="color:var(--text-faint)">·</span>
        <span>${fmtM(est.grandTotal)}</span>
      </div>
    </div>
  </div>`;

  html += `<div class="est-section">
    <div class="est-label">Analysis Preset</div>
    <div class="preset-row">
      ${[["conservative","Conservative"],["standard","Standard"],["aggressive","Aggressive"]].map(([k,lbl])=>
        `<button class="preset-chip ${lccaPreset===k?'active':''}" onclick="setLccaPreset('${k}')">${lbl}</button>`
      ).join("")}
    </div>
    <div class="est-hint">Conservative: low inflation, gentle growth. Aggressive: higher energy and maintenance escalation.</div>
  </div>`;

  html += `<div class="est-section">
    <div class="est-label">Analysis Period</div>
    <div class="pill-group">
      ${[25,30,40,50].map(y =>
        `<button class="pill ${lccaPeriod===y?'active':''}" onclick="lccaPeriod=${y};renderLCCA()">${y} yrs</button>`
      ).join("")}
    </div>
  </div>`;

  html += `<div class="adv-toggle" onclick="toggleAdvanced(this)">
    <span class="adv-toggle-icon">▸</span>
    <span>Customize assumptions</span>
  </div>
  <div class="adv-content">
    <div class="est-section" style="padding-top:10px">
      <div class="est-label">Maintenance Tier</div>
      <div class="pill-group">
        ${["low","standard","high"].map(m =>
          `<button class="pill ${lccaMaintTier===m?'active':''}" onclick="lccaMaintTier='${m}';lccaPreset='custom';renderLCCA()">${m[0].toUpperCase()+m.slice(1)}</button>`
        ).join("")}
      </div>
    </div>
    <div class="est-section">
      <div class="slider-row"><span class="est-label">Discount Rate</span><span class="slider-val">${lccaDiscount}%</span></div>
      <input type="range" min="1" max="8" step="0.5" value="${lccaDiscount}"
        oninput="lccaDiscount=+this.value;lccaPreset='custom';renderLCCA()">
    </div>
    <div class="est-section">
      <div class="slider-row"><span class="est-label">Energy Escalation</span><span class="slider-val">${lccaEnergyEsc}%/yr</span></div>
      <input type="range" min="0" max="6" step="0.5" value="${lccaEnergyEsc}"
        oninput="lccaEnergyEsc=+this.value;lccaPreset='custom';renderLCCA()">
    </div>
  </div>`;

  const cat = est.type.cat;
  const eui = ENERGY.eui[cat] || 16.5;
  const elecR = ENERGY.elecRate[est.city];
  const gasR  = ENERGY.gasRate[est.city];
  const elecShare = ENERGY.elecShare[cat] || 0.5;
  const annualEnergy = est.area * eui * (elecShare * elecR + (1 - elecShare) * gasR);
  const annualMaint  = est.hardTotal * MAINT[lccaMaintTier];
  const dr = lccaDiscount / 100;
  const ee = lccaEnergyEsc / 100;
  const me = 0.02;

  let pvEnergy = 0, pvMaint = 0, pvReplace = 0;
  const yearlyData = [];
  let cumEnergy = 0, cumMaint = 0, cumReplace = 0;
  const replacementEvents = [];
  const sampleSet = new Set([1,2,3,5,7,10,15,20,25,30,35,40,45,50].filter(y => y <= lccaPeriod));
  sampleSet.add(lccaPeriod);

  for (let yr = 1; yr <= lccaPeriod; yr++) {
    const eCost = annualEnergy * Math.pow(1 + ee, yr - 1);
    const mCost = annualMaint  * Math.pow(1 + me, yr - 1);
    const pvFactor = 1 / Math.pow(1 + dr, yr);
    pvEnergy += eCost * pvFactor;
    pvMaint  += mCost * pvFactor;
    let yrReplace = 0;
    REPLACEMENTS.forEach(comp => {
      if (yr % comp.cycle === 0 && cat !== "parking" && cat !== "infrastructure") {
        const rCost = est.hardTotal * comp.pct * Math.pow(1 + me, yr - 1);
        yrReplace += rCost;
        pvReplace += rCost * pvFactor;
        replacementEvents.push({year:yr, name:comp.name, cost:rCost});
      }
    });
    cumEnergy  += eCost;
    cumMaint   += mCost;
    cumReplace += yrReplace;
    if (sampleSet.has(yr)) {
      yearlyData.push({yr, cumTotal:est.grandTotal + cumEnergy + cumMaint + cumReplace, cumEnergy, cumMaint, cumReplace});
    }
  }

  const pvTotal    = est.grandTotal + pvEnergy + pvMaint + pvReplace;
  const costPerSf  = pvTotal / est.area;
  const opRatio    = (pvEnergy + pvMaint + pvReplace) / est.grandTotal;
  const maxCum     = yearlyData[yearlyData.length - 1].cumTotal;
  const barColors  = {const:"#4fd1c5", energy:"#f6ad55", maint:"#b794f4", replace:"#fc8181"};

  html += `<div class="result-card" style="margin-top:14px">
    <div style="padding:16px 18px;border-bottom:1px solid var(--surface-h)">
      <div class="live-sum-label">Total Life-Cycle Cost (${lccaPeriod}yr, Present Value)</div>
      <div class="live-sum-total" style="margin-top:4px">${fmtM(pvTotal)}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:6px">${replacementEvents.length} major replacement events over ${lccaPeriod} years · First at Year ${replacementEvents[0]?.year || 'none'}</div>
    </div>
    <div style="padding:14px 18px">
      <div class="metric-grid">
        <div class="metric"><div class="m-label">Construction</div><div class="m-val" style="color:var(--accent)">${fmtM(est.grandTotal)}</div><div class="m-sub">${((est.grandTotal/pvTotal)*100).toFixed(0)}% of total</div></div>
        <div class="metric"><div class="m-label">Energy (PV)</div><div class="m-val" style="color:var(--orange)">${fmtM(pvEnergy)}</div><div class="m-sub">Yr 1: ${fmt(annualEnergy)}</div></div>
        <div class="metric"><div class="m-label">Maintenance (PV)</div><div class="m-val" style="color:var(--purple)">${fmtM(pvMaint)}</div><div class="m-sub">${lccaMaintTier} tier</div></div>
        <div class="metric"><div class="m-label">Replacements (PV)</div><div class="m-val" style="color:var(--red)">${fmtM(pvReplace)}</div><div class="m-sub">${replacementEvents.length} events</div></div>
      </div>
      <div style="margin-top:14px;padding:11px 13px;background:var(--surface-d);border-radius:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--text-dim)">Operating : Construction Ratio</span><span style="font-family:var(--mono);font-size:13px;font-weight:600">${opRatio.toFixed(1)}×</span></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:11px;color:var(--text-dim)">Total Cost / SF (PV)</span><span style="font-family:var(--mono);font-size:13px;font-weight:600">$${costPerSf.toFixed(0)}</span></div>
      </div>
    </div>
    <div style="padding:0 18px 16px">
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Cumulative Cost Buildup</div>
      <div class="bar-chart">
        ${yearlyData.map(d => {
          const constW = (est.grandTotal / maxCum * 100).toFixed(1);
          const eW     = (d.cumEnergy   / maxCum * 100).toFixed(1);
          const mW     = (d.cumMaint    / maxCum * 100).toFixed(1);
          const rW     = (d.cumReplace  / maxCum * 100).toFixed(1);
          return `<div class="bar-row-lc">
            <div style="font-size:10.5px;color:var(--text-dim);font-family:var(--mono)">Yr ${d.yr}</div>
            <div class="bar-track-lc">
              <div class="bar-seg" style="width:${constW}%;background:${barColors.const}"></div>
              <div class="bar-seg" style="width:${eW}%;background:${barColors.energy}"></div>
              <div class="bar-seg" style="width:${mW}%;background:${barColors.maint}"></div>
              <div class="bar-seg" style="width:${rW}%;background:${barColors.replace}"></div>
            </div>
            <div style="font-size:10px;color:var(--text-dim);font-family:var(--mono);text-align:right">${fmtM(d.cumTotal)}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:${barColors.const}"></div>Construction</div>
        <div class="legend-item"><div class="legend-dot" style="background:${barColors.energy}"></div>Energy</div>
        <div class="legend-item"><div class="legend-dot" style="background:${barColors.maint}"></div>Maintenance</div>
        <div class="legend-item"><div class="legend-dot" style="background:${barColors.replace}"></div>Replacements</div>
      </div>
    </div>
    ${replacementEvents.length ? `<div style="padding:0 18px 14px">
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Replacement Schedule</div>
      ${replacementEvents.slice(0,12).map(ev =>
        `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--surface-h);font-size:12px">
          <div><span style="color:var(--text-dim);font-family:var(--mono)">Yr ${ev.year}</span> <span style="margin-left:8px">${ev.name}</span></div>
          <div style="font-family:var(--mono);color:var(--red)">${fmt(ev.cost)}</div>
        </div>`).join("")}
      ${replacementEvents.length > 12 ? `<div style="font-size:10.5px;color:var(--text-faint);margin-top:8px">+ ${replacementEvents.length-12} more events</div>` : ""}
    </div>` : ""}
    <div class="result-footer">Energy from NRCan SCIEU 2019. Provincial rates blended commercial averages. Energy ${lccaEnergyEsc}%/yr, maintenance ~2%/yr, discount ${lccaDiscount}%. Component cycles are industry estimates. Planning only.</div>
  </div>`;

  el.innerHTML = html;
}