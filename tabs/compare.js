function renderCompare() {
  const el = document.getElementById("comparePanel");
  const validScenarios = scenarios.filter(s => s.typeId);
  if (validScenarios.length < 2) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></div>
      <div class="empty-title">Need at least 2 scenarios</div>
      <div class="empty-text">Add a second scenario from the top of the page, configure it, then return here to see a side-by-side comparison across all dimensions.</div>
      <button class="link-btn" onclick="addScenario()" style="max-width:220px;margin:0 auto"><span>Add Scenario</span><span class="link-btn-arrow">+</span></button>
    </div>`;
    return;
  }

  if (validScenarios.length === 2) {
    const [a, b] = validScenarios.map(s => ({...s, est: computeEstimate(s)}));
    const delta    = b.est.grandTotal - a.est.grandTotal;
    const deltaPct = (delta / a.est.grandTotal * 100);
    const deltaSign  = delta > 0 ? "+" : "";
    const deltaClass = delta > 0 ? "delta-up" : delta < 0 ? "delta-down" : "delta-zero";

    let html = `<div class="compare-view">
      <div class="compare-title">
        <span>${a.name} vs ${b.name}</span>
        <span class="compare-delta-val ${deltaClass}" style="font-size:13px">${deltaSign}${fmtM(delta)} (${deltaSign}${deltaPct.toFixed(1)}%)</span>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <div class="compare-col-label">${a.name}</div>
          <div class="compare-col-val">${fmtM(a.est.grandTotal)}</div>
          <div class="compare-col-sub">${a.est.type.label}</div>
          <div class="compare-col-sub">${CITIES.find(c=>c.id===a.city).label} · ${fmtN(a.est.area)} ${a.est.type.perLM ? 'lin.m' : a.est.type.perSM ? 'sq.m' : a.est.type.perUnit ? 'units' : a.est.type.perAcre ? 'acres' : 'sf'}</div>
        </div>
        <div class="compare-col">
          <div class="compare-col-label">${b.name}</div>
          <div class="compare-col-val">${fmtM(b.est.grandTotal)}</div>
          <div class="compare-col-sub">${b.est.type.label}</div>
          <div class="compare-col-sub">${CITIES.find(c=>c.id===b.city).label} · ${fmtN(b.est.area)} ${b.est.type.perLM ? 'lin.m' : b.est.type.perSM ? 'sq.m' : b.est.type.perUnit ? 'units' : b.est.type.perAcre ? 'acres' : 'sf'}</div>
        </div>
      </div>
      <div style="margin-top:10px">
        ${[
         {label:"Rate ($/"+( a.est.type.perLM||b.est.type.perLM ? 'lin.m' : a.est.type.perSM||b.est.type.perSM ? 'sq.m' : 'sf')+")", a:"$"+fmtN(a.est.rate), b:"$"+fmtN(b.est.rate), delta:b.est.rate - a.est.rate, prefix:"$"},
          {label:"Hard Cost",   a:fmt(a.est.hardTotal),  b:fmt(b.est.hardTotal),  delta:b.est.hardTotal  - a.est.hardTotal,  money:true},
          {label:"Soft Cost",   a:fmt(a.est.softCost),   b:fmt(b.est.softCost),   delta:b.est.softCost   - a.est.softCost,   money:true},
          {label:"Parking Cost",a:fmt(a.est.parkCost),   b:fmt(b.est.parkCost),   delta:b.est.parkCost   - a.est.parkCost,   money:true},
          {label:"Storeys",     a:a.inputs.storeys,       b:b.inputs.storeys,       delta:b.inputs.storeys  - a.inputs.storeys,  unit:""},
          {label:"Quality",     a:a.inputs.quality+"%",   b:b.inputs.quality+"%",   delta:b.inputs.quality  - a.inputs.quality,  unit:"%"},
          ...(a.est.unitCount > 0 || b.est.unitCount > 0
            ? [{label:"Units", a:a.est.unitCount, b:b.est.unitCount, delta:b.est.unitCount - a.est.unitCount, unit:""}]
            : []),
          ...(a.est.fsr > 0 || b.est.fsr > 0
            ? [{label:"FSR", a:a.est.fsr.toFixed(2), b:b.est.fsr.toFixed(2), delta:(b.est.fsr - a.est.fsr).toFixed(2), unit:""}]
            : [])
        ].map(row => {
          const d = parseFloat(row.delta);
          const dCls  = d > 0 ? "delta-up" : d < 0 ? "delta-down" : "delta-zero";
          const dSign = d > 0 ? "+" : "";
          let dStr;
          if (row.money)        dStr = dSign + fmtM(d);
          else if (row.prefix === "$") dStr = dSign + "$" + fmtN(d);
          else                  dStr = dSign + d + (row.unit || "");
          return `<div class="compare-delta-row">
            <div class="compare-delta-label">${row.label}</div>
            <div style="display:flex;align-items:center;gap:14px;font-family:var(--mono);font-size:11.5px">
              <span style="color:var(--text-dim);min-width:60px;text-align:right">${row.a}</span>
              <span style="color:var(--text-faint)">→</span>
              <span style="color:var(--text);min-width:60px;text-align:right">${row.b}</span>
              <span class="${dCls}" style="min-width:70px;text-align:right;font-weight:600">${dStr}</span>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
    el.innerHTML = html;
    return;
  }

  // 3+ scenarios: compact grid
  let html = `<div class="compare-view">
    <div class="compare-title"><span>Comparing ${validScenarios.length} scenarios</span></div>`;
  validScenarios.forEach(s => {
    const est = computeEstimate(s);
    html += `<div style="padding:10px 0;border-bottom:1px solid var(--surface-h)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600">${s.name}</div>
          <div style="font-size:10.5px;color:var(--text-dim);margin-top:2px">${est.type.label} · ${CITIES.find(c=>c.id===est.city).label}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--accent)">${fmtM(est.grandTotal)}</div>
          <div style="font-size:10.5px;color:var(--text-faint);font-family:var(--mono)">$${est.rate}/${est.type.perLM ? 'lin.m' : est.type.perSM ? 'sq.m' : 'sf'} · ${fmtN(est.area)} ${est.type.perLM ? 'lin.m' : est.type.perSM ? 'sq.m' : est.type.perUnit ? 'units' : est.type.perAcre ? 'acres' : 'sf'}</div>
      </div>
    </div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}