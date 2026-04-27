/**
 * tabs/report.js
 * Report tab. Renders a print-formatted document of all valid scenarios with
 * full estimate breakdown, LCCA summary (if applicable), sustainability summary,
 * notes, and photos. The same DOM is what prints — print stylesheet hides the
 * rest of the app and shows only #reportPanel.
 *
 * Triggers the system print dialog (Save as PDF on macOS/iOS/Windows/Android).
 *
 * Exposes: renderReport, printReport.
 * Depends on: scenarios (core/state.js), computeEstimate (core/compute.js),
 *             CITIES (data/building-types.js),
 *             ENERGY, MAINT, REPLACEMENTS (data/energy.js),
 *             EC_INTENSITY (data/sustainability.js),
 *             lccaPeriod, lccaDiscount, lccaEnergyEsc, lccaMaintTier (core/state.js),
 *             sustainStandard (core/state.js),
 *             fmt, fmtM, fmtN (core/ui.js).
 */

function printReport() {
  trackEvent && trackEvent("pdf-print-attempted");  // ANALYTICS
  // Set a sensible filename via document.title (browsers prefill this).
  const orig = document.title;
  const stamp = new Date().toISOString().slice(0, 10);
  document.title = `ZEF Estimate ${stamp}`;
  // Ensure latest content is rendered before print.
  renderReport();
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = orig; }, 500);
  }, 50);
}

function renderReport() {
  const el = document.getElementById("reportPanel");
  if (!el) return;
  const valid = scenarios.filter(s => s.typeId);

  if (valid.length === 0) {
    el.innerHTML = `<div class="empty no-print">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <div class="empty-title">No estimates to report yet</div>
      <div class="empty-text">Create at least one estimate, then return here to preview and print a PDF report.</div>
      <button class="link-btn" onclick="switchTab('estimate')" style="max-width:240px;margin:0 auto"><span>Back to Estimate</span><span class="link-btn-arrow">→</span></button>
    </div>`;
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { year:"numeric", month:"long", day:"numeric" });

  // --- Top bar: print button + meta ---
  let html = `
    <div class="report-toolbar no-print">
      <div class="report-toolbar-meta">
        <a href="#" onclick="event.preventDefault();switchTab('estimate')" style="display:inline-block;font-size:12px;color:var(--text-dim);text-decoration:none;margin-bottom:4px">← Back to Estimate</a>
        <div class="report-toolbar-title">Report Preview</div>
        <div class="report-toolbar-sub">${valid.length} scenario${valid.length>1?"s":""} · ${today}</div>
      </div>
      <button class="report-print-btn" onclick="printReport()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>Print / Save as PDF</span>
      </button>
    </div>
    <div class="report-hint no-print">
      Click <strong>Print / Save as PDF</strong> to open your browser's print dialog. Choose <strong>Save as PDF</strong> as the destination. Photos and notes below are included.
    </div>
  `;

  // --- The printable document itself ---
  html += `<div class="report-doc">`;

  // Cover header
  html += `
    <div class="report-cover">
      <div class="report-cover-mark">
        <div class="report-cover-dot"></div>
        <div>
          <div class="report-cover-title">ZEF Estimator <span>/ Canada</span></div>
          <div class="report-cover-sub">2026 Altus Cost Guide · Feasibility-Stage Estimate (±15%)</div>
        </div>
      </div>
      <div class="report-cover-meta">
        <div><span class="report-meta-lbl">Date</span><span class="report-meta-val">${today}</span></div>
        <div><span class="report-meta-lbl">Scenarios</span><span class="report-meta-val">${valid.length}</span></div>
      </div>
    </div>
  `;

  // Side-by-side summary of all scenarios at the top
  html += renderReportSummaryGrid(valid);

  // One section per scenario
  valid.forEach((s, i) => {
    html += renderReportScenario(s, i, valid.length);
  });

  // Disclaimer footer
  html += `
    <div class="report-disclaimer">
      <div class="report-disclaimer-title">Limits and assumptions</div>
      <div class="report-disclaimer-body">
        Rates from the 2026 Altus Group Canadian Cost Guide. CIQS measured area
        (apply 8–18% gross-up for zoning GFA). Excludes GST/HST, tariffs, and land.
        2026 rates do not include the impact of potential tariffs.
        Estimating bands are ±15%. This report is for feasibility analysis only —
        not a quantity surveyor's takeoff. For lender or developer review,
        confirm material assumptions with a QS or general contractor before commitment.
      </div>
    </div>
  `;

  html += `</div>`; // .report-doc
  el.innerHTML = html;
}

// --- Top summary grid: every scenario at a glance ------------------------

function renderReportSummaryGrid(valid) {
  let html = `<div class="report-section report-summary-section">
    <div class="report-section-title">Scenario Summary</div>
    <table class="report-summary-table">
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Building Type</th>
          <th>City</th>
          <th class="num">Area</th>
          <th class="num">Rate</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>`;
  valid.forEach(s => {
    const est = computeEstimate(s);
    const cityLbl = CITIES.find(c => c.id === s.city).label;
    const unit = est.type.perLM ? "lin.m" : est.type.perSM ? "sq.m" : est.type.perUnit ? "units" : est.type.perAcre ? "acres" : est.type.perStall ? "stalls" : "sf";
    const rateUnit = est.type.perLM ? "/lin.m" : est.type.perSM ? "/sq.m" : est.type.perUnit ? "/unit" : est.type.perAcre ? "/acre" : est.type.perStall ? "/stall" : "/sf";
    html += `<tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>${escapeHtml(est.type.label)}</td>
      <td>${cityLbl}</td>
      <td class="num">${fmtN(est.area)} ${unit}</td>
      <td class="num">$${fmtN(est.rate)}${rateUnit}</td>
      <td class="num strong">${fmtM(est.grandTotal)}</td>
    </tr>`;
  });
  html += `</tbody></table>
    <div class="report-range-note">Range across scenarios at ±15% reflects feasibility-stage uncertainty.</div>
  </div>`;
  return html;
}

// --- One scenario block --------------------------------------------------

function renderReportScenario(s, idx, total) {
  const est = computeEstimate(s);
  const cityLbl = CITIES.find(c => c.id === s.city).label;
  const unit = est.type.perLM ? "lin.m" : est.type.perSM ? "sq.m" : est.type.perUnit ? "units" : est.type.perAcre ? "acres" : est.type.perStall ? "stalls" : "sf";
  const rateUnit = est.type.perLM ? "/lin.m" : est.type.perSM ? "/sq.m" : est.type.perUnit ? "/unit" : est.type.perAcre ? "/acre" : est.type.perStall ? "/stall" : "/sf";

  // Force a page break before each scenario except the first
  const breakClass = idx === 0 ? "" : " report-page-break";

  let html = `<div class="report-scenario${breakClass}">
    <div class="report-scenario-head">
      <div>
        <div class="report-scenario-name">${escapeHtml(s.name)}</div>
        <div class="report-scenario-meta">${escapeHtml(est.type.label)} · ${cityLbl}</div>
      </div>
      <div class="report-scenario-total">
        <div class="report-meta-lbl">Total Estimate</div>
        <div class="report-scenario-total-val">${fmtM(est.grandTotal)}</div>
        <div class="report-scenario-total-range">Range ${fmtM(est.grandTotal*0.85)} — ${fmtM(est.grandTotal*1.15)}</div>
      </div>
    </div>`;

  // Inputs summary
  html += `<div class="report-block">
    <div class="report-block-title">Inputs</div>
    <table class="report-kv-table">
      <tbody>
        ${renderInputRows(s, est, unit)}
      </tbody>
    </table>
  </div>`;

  // Cost breakdown
  html += `<div class="report-block">
    <div class="report-block-title">Cost Breakdown</div>
    <table class="report-kv-table">
      <tbody>
        <tr><td>Building Hard Cost</td><td class="num-cell">${fmtN(est.area)} ${unit} × $${fmtN(est.rate)}${rateUnit}</td><td class="num-cell strong">${fmt(est.baseCost)}</td></tr>
        ${est.garageDetail ? `<tr><td>${escapeHtml(getGarageLabel(est.garageDetail.type))}</td><td class="num-cell">${est.garageDetail.units > 1 ? est.garageDetail.units + " units × " + fmt(est.garageDetail.perUnit) : "Attached"}</td><td class="num-cell strong">${fmt(est.garageCost)}</td></tr>` : ""}
        ${est.parkDetail ? `<tr><td>Parking — ${est.parkDetail.type === "surface" ? "Surface" : est.parkDetail.type === "above" ? "Above Grade" : "Underground"}</td><td class="num-cell">${est.parkDetail.stalls} stalls × ${fmt(est.parkDetail.rate)}/stall</td><td class="num-cell strong">${fmt(est.parkCost)}</td></tr>` : ""}
        <tr class="report-row-sub"><td><em>Hard Cost Subtotal</em></td><td></td><td class="num-cell strong">${fmt(est.hardTotal)}</td></tr>
        <tr><td>Soft Cost Allowance</td><td class="num-cell">${est.softPct}% of hard costs</td><td class="num-cell strong">${fmt(est.softCost)}</td></tr>
        <tr class="report-row-total"><td><strong>Grand Total</strong></td><td></td><td class="num-cell strong">${fmt(est.grandTotal)}</td></tr>
      </tbody>
    </table>
  </div>`;

  // LCCA snapshot (if buildings tab applies)
  if (est.isBuilding) {
    const lc = renderLccaBlock(s, est);
    if (lc) html += lc;
  }

  // Notes
  if (s.notes && s.notes.trim()) {
    html += `<div class="report-block">
      <div class="report-block-title">Notes</div>
      <div class="report-notes">${escapeHtml(s.notes).replace(/\n/g, "<br>")}</div>
    </div>`;
  }

  // Photos
  if (s.photos && s.photos.length > 0) {
    html += `<div class="report-block">
      <div class="report-block-title">Photos</div>
      <div class="report-photo-grid">
        ${s.photos.map(p => `
          <div class="report-photo">
            <img src="${p.dataUrl}" alt="${escapeHtml(p.caption || "")}">
            ${p.caption ? `<div class="report-photo-caption">${escapeHtml(p.caption)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>`;
  }

  html += `</div>`; // .report-scenario
  return html;
}

// --- Input rows: show only fields that apply to the scenario type --------

function renderInputRows(s, est, unit) {
  const inp = s.inputs;
  const t = est.type;
  const fields = est.fields;
  const rows = [];

  if (fields.includes("gfa")) {
    rows.push(["GFA", `${fmtN(est.effectiveGfa)} sf`]);
  }
  if (fields.includes("storeys") && inp.storeys > 0) {
    rows.push(["Storeys", inp.storeys]);
    if (est.floorplate > 0) rows.push(["Floorplate", `${fmtN(est.floorplate)} sf`]);
  }
  if (fields.includes("siteArea") && inp.siteArea > 0) {
    rows.push(["Site Area", `${fmtN(inp.siteArea)} sf`]);
    if (est.fsr > 0) rows.push(["FSR (CIQS)", est.fsr]);
  }
  if (fields.includes("tnUnits") && inp.unitCount > 0) {
    rows.push(["Units", `${inp.unitCount} × ${fmtN(inp.unitSize)} sf`]);
  }
  if (inp.hotelKeys > 0) rows.push(["Keys", `${inp.hotelKeys} (${fmt(est.grandTotal/inp.hotelKeys)}/key)`]);
  if (inp.hospitalBeds > 0) rows.push(["Beds", `${inp.hospitalBeds} (${fmt(est.grandTotal/inp.hospitalBeds)}/bed)`]);
  if (inp.schoolCapacity > 0) rows.push(["Students", `${inp.schoolCapacity} (${fmt(est.grandTotal/inp.schoolCapacity)}/student)`]);
  if (inp.officeNla > 0) rows.push(["Net Leasable Area", `${fmtN(inp.officeNla)} sf @ ${inp.officeEfficiency}% efficiency`]);

  const totalUnitMix = Object.values(inp.unitMix).reduce((a,b)=>a+b,0);
  if (totalUnitMix > 0 && !fields.includes("tnUnits")) {
    rows.push(["Unit Mix", `${totalUnitMix} units (${fmt(est.grandTotal/totalUnitMix)}/unit)`]);
  }

  rows.push(["Quality Level", `${inp.quality}%`]);

  if (fields.includes("clearHeight")) {
    rows.push(["Clear Height", `${inp.clearHeight} ft`]);
  }
  if (fields.includes("retailTier")) {
    const tierLbl = {shell:"Shell only", landlord:"Landlord standard", turnkey:"Turnkey"}[inp.retailTier] || inp.retailTier;
    rows.push(["Fit-Out Tier", tierLbl]);
  }
  if (fields.includes("garage") && inp.garage !== "none") {
    rows.push(["Garage", getGarageLabel(inp.garage)]);
  }
  if (fields.includes("parking") && inp.parkingType !== "none") {
    const ptLbl = {surface:"Surface", above:"Above grade", below:"Underground"}[inp.parkingType] || inp.parkingType;
    rows.push(["Parking", `${ptLbl} · ${inp.parkingStalls} stalls`]);
  }

  return rows.map(r => `<tr><td>${escapeHtml(String(r[0]))}</td><td colspan="2">${escapeHtml(String(r[1]))}</td></tr>`).join("");
}

// --- LCCA block ----------------------------------------------------------
// Mirrors tabs/lcca.js compute exactly so the report matches the LCCA tab.

function renderLccaBlock(s, est) {
  if (typeof ENERGY === "undefined" || typeof MAINT === "undefined" || typeof REPLACEMENTS === "undefined") return "";
  const cat = est.type.cat;
  // Skip non-conditioned categories — matches lcca.js behavior.
  if (cat === "infrastructure" || cat === "parking") return "";

  const period = lccaPeriod;
  const dr = lccaDiscount / 100;
  const ee = lccaEnergyEsc / 100;
  const me = 0.02;

  const eui = ENERGY.eui[cat] || 16.5;
  const elecR = ENERGY.elecRate[s.city];
  const gasR = ENERGY.gasRate[s.city];
  if (elecR == null || gasR == null) return "";
  const elecShare = ENERGY.elecShare[cat] ?? 0.5;
  const annualEnergy = est.area * eui * (elecShare * elecR + (1 - elecShare) * gasR);
  const annualMaint = est.hardTotal * MAINT[lccaMaintTier];

  let pvEnergy = 0, pvMaint = 0, pvReplace = 0;
  let replacementCount = 0;
  let firstReplacementYr = null;
  for (let yr = 1; yr <= period; yr++) {
    const eCost = annualEnergy * Math.pow(1 + ee, yr - 1);
    const mCost = annualMaint * Math.pow(1 + me, yr - 1);
    const pvFactor = 1 / Math.pow(1 + dr, yr);
    pvEnergy += eCost * pvFactor;
    pvMaint += mCost * pvFactor;
    REPLACEMENTS.forEach(comp => {
      if (yr % comp.cycle === 0) {
        const rCost = est.hardTotal * comp.pct * Math.pow(1 + me, yr - 1);
        pvReplace += rCost * pvFactor;
        replacementCount++;
        if (firstReplacementYr === null) firstReplacementYr = yr;
      }
    });
  }

  const pvTotal = est.grandTotal + pvEnergy + pvMaint + pvReplace;
  const opRatio = (pvEnergy + pvMaint + pvReplace) / est.grandTotal;
  const costPerSf = pvTotal / est.area;

  const presetLbl = lccaPreset === "custom"
    ? "Custom"
    : lccaPreset.charAt(0).toUpperCase() + lccaPreset.slice(1);

  return `<div class="report-block">
    <div class="report-block-title">Life-Cycle Costs (${period}-year present value · ${presetLbl})</div>
    <table class="report-kv-table">
      <tbody>
        <tr><td>Initial Construction</td><td class="num-cell">${((est.grandTotal/pvTotal)*100).toFixed(0)}% of total</td><td class="num-cell strong">${fmtM(est.grandTotal)}</td></tr>
        <tr><td>Energy (PV)</td><td class="num-cell">Year 1: ${fmt(annualEnergy)} · ${lccaEnergyEsc}%/yr escalation</td><td class="num-cell">${fmtM(pvEnergy)}</td></tr>
        <tr><td>Maintenance (PV)</td><td class="num-cell">${lccaMaintTier} tier · ${(MAINT[lccaMaintTier]*100).toFixed(1)}% of hard cost/yr</td><td class="num-cell">${fmtM(pvMaint)}</td></tr>
        <tr><td>Major Replacements (PV)</td><td class="num-cell">${replacementCount} event${replacementCount===1?"":"s"}${firstReplacementYr ? ", first at Yr " + firstReplacementYr : ""}</td><td class="num-cell">${fmtM(pvReplace)}</td></tr>
        <tr class="report-row-total"><td><strong>Total Cost of Ownership (${period}-yr PV)</strong></td><td></td><td class="num-cell strong">${fmtM(pvTotal)}</td></tr>
        <tr class="report-row-sub"><td><em>Operating-to-Construction Ratio</em></td><td class="num-cell">${opRatio.toFixed(1)}× construction cost over ${period} years</td><td class="num-cell">$${costPerSf.toFixed(0)}/sf PV</td></tr>
      </tbody>
    </table>
    <div class="report-lcca-note">Discount ${lccaDiscount}% · Energy ${lccaEnergyEsc}%/yr · Maintenance escalation 2%/yr. Energy from NRCan SCIEU 2019. Provincial rates blended commercial averages.</div>
  </div>`;
}

// --- Utility -------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}