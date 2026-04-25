/**
 * tabs/sustain.js
 * Sustain tab. Four panels:
 *   - Energy & Carbon Standard picker (NECB 2017 → CAGBC ZCB)
 *   - Green Premium Calculator: hard cost × standard premium % + simple payback
 *   - Embodied Carbon Estimator: GFA × single kgCO₂e/m² benchmark × OBPS price
 *   - Energy Code Compliance Cost Tracker: side-by-side premium for each tier
 *   - Provincial Incentive Finder: programs filtered by city → province
 * Embodied carbon model is top-down (one number per type), not material-level.
 * Exposes: renderSustain.
 * Depends on: getCurrentScenario, sustainStandard (core/state.js),
 *             computeEstimate (core/compute.js),
 *             EC_INTENSITY, GREEN_STANDARDS, PROV_INCENTIVES, CITY_PROV,
 *             CARBON_PRICE_2025, CARBON_PRICE_2030 (data/sustainability.js),
 *             fmt (core/ui.js).
 */
function renderSustain() {
  const panel = document.getElementById("sustainPanel");
  const s = getCurrentScenario();
  const est = s.typeId ? computeEstimate(s) : null;

  if (!est) {
    panel.innerHTML = `<div style="padding:40px 0;text-align:center;color:var(--text-dim)">
      <div style="font-size:24px;margin-bottom:12px">🌿</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">Select a building type first</div>
      <div style="font-size:11.5px;color:var(--text-faint)">Browse the catalog and pick a type, then return here for sustainability analysis.</div>
    </div>`;
    return;
  }

  const std = GREEN_STANDARDS.find(g => g.id === sustainStandard) || GREEN_STANDARDS[0];
  const hardCost     = est.hardTotal;
  const greenPremium = Math.round(hardCost * std.pct / 100);
  const greenTotal   = hardCost + greenPremium;

  const ecIntensity    = EC_INTENSITY[s.typeId] ?? null;
  const hasEC          = ecIntensity !== null;
  const gfaSF          = est.area;
  const gfaM2          = gfaSF * 0.0929;
  const totalEC        = hasEC ? Math.round(gfaM2 * ecIntensity) : 0;
  const totalEC_tonnes = hasEC ? (totalEC / 1000).toFixed(0) : 0;
  const carbonPrice    = CARBON_PRICE_2025;
  const ecCostImpact   = hasEC ? Math.round(totalEC * carbonPrice / 1000) : 0;

  const savingsPct = {
    necb2017:0, necb2020:0.20, leed_s:0.25, leed_g:0.35,
    leed_p:0.50, step5:0.65, cagbc_zc:0.80
  }[sustainStandard] || 0;

  const isCom = ["commercial","industrial"].includes(est.type.cat);
  const baseEnergyCost = gfaSF * (isCom ? 3.0 : 1.5);
  const annualSaving   = baseEnergyCost * savingsPct;
  const payback        = greenPremium > 0 && annualSaving > 0
    ? (greenPremium / annualSaving).toFixed(1)
    : null;

  const prov       = CITY_PROV[s.city] || "on";
  const incentives = PROV_INCENTIVES[prov] || [];

  const codeTiers = [
    {id:"necb2017", label:"NECB 2017",                   tier:"Baseline"},
    {id:"necb2020", label:"NECB 2020 Tier 1",            tier:"Current Code"},
    {id:"leed_s",   label:"LEED Silver",                 tier:"Above Code"},
    {id:"leed_g",   label:"LEED Gold",                   tier:"High Performance"},
    {id:"leed_p",   label:"LEED Platinum",               tier:"Near Zero"},
    {id:"step5",    label:"BC Step 5 / ZCB-Performance", tier:"Zero Carbon Ready"},
    {id:"cagbc_zc", label:"CAGBC ZCB",                   tier:"Zero Carbon"},
  ];

  const cityNames = {
    tor:"Toronto", van:"Vancouver", cal:"Calgary", edm:"Edmonton",
    win:"Winnipeg", ott:"Ottawa", mtl:"Montréal", hal:"Halifax", stj:"St. John's"
  };

  panel.innerHTML = `
    <div style="padding:16px 0 8px">
      <div style="font-size:15px;font-weight:700;letter-spacing:-0.3px;margin-bottom:2px">Sustainability Analysis</div>
      <div style="font-size:11px;color:var(--text-faint)">${est.type.label} · ${cityNames[s.city]}</div>
    </div>

    <div class="est-section">
      <div class="est-label">Energy & Carbon Standard</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${GREEN_STANDARDS.map(g => `
          <button onclick="sustainStandard='${g.id}';renderSustain()" style="text-align:left;padding:10px 14px;border-radius:10px;border:1px solid ${sustainStandard===g.id?'var(--border-a)':'var(--border)'};background:${sustainStandard===g.id?'var(--accent-dim)':'var(--surface)'};cursor:pointer;font-family:var(--sans);transition:all .15s">
            <div style="font-size:12px;font-weight:600;color:${sustainStandard===g.id?'var(--accent)':'var(--text)'};">${g.label}</div>
            <div style="font-size:10.5px;color:var(--text-faint);margin-top:2px">${g.desc}</div>
          </button>`).join("")}
      </div>
    </div>

    <div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
      <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Green Premium Calculator</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span style="font-size:13px;color:var(--text-mid)">Base Hard Cost</span>
        <span style="font-family:var(--mono);font-size:13px">${fmt(hardCost)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span style="font-size:13px;color:var(--orange)">${std.label} Premium (+${std.pct}%)</span>
        <span style="font-family:var(--mono);font-size:13px;color:var(--orange)">${greenPremium > 0 ? '+' + fmt(greenPremium) : 'No premium'}</span>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:8px;display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:13px;font-weight:600">Green-Adjusted Total</span>
        <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent)">${fmt(greenTotal)}</span>
      </div>
      ${payback ? `<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(104,211,145,0.08);border:1px solid rgba(104,211,145,0.2)">
        <span style="font-size:11.5px;color:var(--green)">Estimated simple payback: <strong>${payback} years</strong> · ${Math.round(savingsPct*100)}% energy reduction vs NECB 2017 · $${Math.round(annualSaving/1000)}K/yr savings</span>
      </div>` : ''}
    </div>

    <div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
      <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Embodied Carbon Estimator</div>
      ${!hasEC
        ? `<div style="font-size:12px;color:var(--text-faint)">Embodied carbon intensity data is not available for this building type.</div>`
        : `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <span style="font-size:13px;color:var(--text-mid)">Carbon Intensity</span>
            <span style="font-family:var(--mono);font-size:12px">${ecIntensity} kgCO₂e / m²</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <span style="font-size:13px;color:var(--text-mid)">Total Embodied Carbon</span>
            <span style="font-family:var(--mono);font-size:13px;font-weight:600">${Number(totalEC_tonnes).toLocaleString()} tCO₂e</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="font-size:13px;color:var(--text-mid)">Carbon Cost @ $${carbonPrice}/t</span>
            <span style="font-family:var(--mono);font-size:13px;color:var(--orange)">${fmt(ecCostImpact)}</span>
          </div>
          <div style="margin-top:10px;font-size:10.5px;color:var(--text-faint)">Based on typical whole-life embodied carbon (structure + envelope, A1–A5) for ${est.type.label}. Intensity in kgCO₂e/m²; converted from your GFA. Carbon cost uses the federal industrial OBPS price: $${CARBON_PRICE_2025}/t (2025) → $${CARBON_PRICE_2030}/t (2030). Note: the consumer carbon fuel charge was eliminated April 1, 2025 — this figure reflects industrial pricing exposure only.</div>`
      }
    </div>

    <div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
      <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Energy Code Compliance Cost Tracker</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${codeTiers.map(ct => {
          const ctStd     = GREEN_STANDARDS.find(g => g.id === ct.id);
          const ctPremium = ctStd ? Math.round(hardCost * ctStd.pct / 100) : 0;
          const isActive  = ct.id === sustainStandard;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:${isActive?'var(--accent-dim)':'transparent'};border:1px solid ${isActive?'var(--border-a)':'transparent'}">
            <div>
              <span style="font-size:12px;font-weight:${isActive?700:500};color:${isActive?'var(--accent)':'var(--text-mid)'};">${ct.label}</span>
              <span style="font-size:10px;color:var(--text-faint);margin-left:6px">${ct.tier}</span>
            </div>
            <span style="font-family:var(--mono);font-size:12px;color:${isActive?'var(--accent)':'var(--text-dim)'};">${ctPremium > 0 ? '+' + fmt(ctPremium) : 'Baseline'}</span>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="est-section" style="border:1px solid var(--border);border-radius:12px;padding:14px;background:var(--surface)">
      <div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px">Provincial Incentive Finder · ${cityNames[s.city]}</div>
      ${incentives.length > 0 ? incentives.map(inc => `
        <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--surface-h)">
          <div style="margin-bottom:3px">
            ${inc.url
              ? `<a href="${inc.url}" target="_blank" rel="noopener noreferrer"
                    style="font-size:12.5px;font-weight:600;color:var(--green);text-decoration:none;display:inline-flex;align-items:center;gap:4px">
                    ${inc.name}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;flex-shrink:0">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>`
              : `<span style="font-size:12.5px;font-weight:600;color:var(--green)">${inc.name}</span>`}
          </div>
          <div style="font-size:11.5px;color:var(--text-mid)">${inc.desc}</div>
        </div>`).join("")
      : `<div style="font-size:12px;color:var(--text-faint)">No specific programs catalogued for this region yet.</div>`}
      <div style="font-size:10px;color:var(--text-faint);margin-top:4px">Programs current as of 2026. Verify eligibility and program availability directly with administrators before relying on these figures.</div>
    </div>
  `;
}