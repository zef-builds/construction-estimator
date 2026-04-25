/**
 * core/ui.js
 * Shared UI utilities and global render orchestration.
 * Formatters (fmt, fmtM, fmtRange, fmtN), lerp, getUnit, toasts, tab switching,
 * scenario chip bar, city pill bar, and refreshAll (the master re-render).
 * Exposes: fmt, fmtM, fmtRange, fmtN, lerp, getUnit, showToast,
 *          switchTab, refreshAll, renderScenarios, renderCities, setCity, updateTabBadges.
 * Depends on: scenarios, activeScenarioIdx, currentTab, hasEstimate (core/state.js),
 *             CITIES (data/building-types.js), and all tab renderers (tabs/*.js).
 */
const fmt = n => "$" + Math.round(n).toLocaleString();

const fmtM = n => {
  if (n >= 1e9) return "$" + (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n/1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n/1e3).toFixed(0) + "K";
  return fmt(n);
};

const fmtRange = (n) => {
  const lo = n * 0.85, hi = n * 1.15;
  return `${fmtM(lo)} — ${fmtM(hi)}`;
};

const fmtN = n => Math.round(n).toLocaleString();

function lerp(low, high, t) { return Math.round(low + (high - low) * (t / 100)); }

function getUnit(type) {
  if (type.perStall) return "/stall";
  if (type.perLM)    return "/lin.m";
  if (type.perSM)    return "/sq.m";
  if (type.perUnit)  return "/unit";
  if (type.perAcre)  return "/acre";
  return "/sf";
}

function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function updateTabBadges() {
  const ready = hasEstimate();
  document.querySelectorAll('[data-tab="estimate"], [data-tab="lcca"], [data-tab="optimize"]').forEach(btn => {
    btn.classList.toggle("tab-ready", ready);
  });
  const compareTab = document.getElementById("compareTab");
  if (compareTab) {
    compareTab.style.display = scenarios.length > 1 ? "" : "none";
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  ["browse","estimate","lcca","optimize","compare","sustain","report"].forEach(t => {
    document.getElementById(t + "Panel").classList.toggle("hidden", tab !== t);
  });
  if (tab === "browse")   renderBrowse();
  if (tab === "estimate") renderEstimate();
  if (tab === "lcca")     renderLCCA();
  if (tab === "optimize") renderOptimize();
  if (tab === "compare")  renderCompare();
  if (tab === "sustain")  renderSustain();
  if (tab === "report")   renderReport();
  window.scrollTo({top:0, behavior:"smooth"});
}

function renderScenarios() {
  const bar = document.getElementById("scenarioBar");
  let html = scenarios.map((s, i) => {
    const active = i === activeScenarioIdx ? "active" : "";
    const safeLabel = s.name.replace(/</g, "&lt;");
    const closeBtn = scenarios.length > 1 && active
      ? `<span class="sc-chip-x" onclick="event.stopPropagation();removeScenario(${i})" title="Remove">×</span>`
      : "";
    const dblclick = active ? `ondblclick="event.stopPropagation();renameScenario(${i},this)"` : "";
    return `<button class="sc-chip ${active}" onclick="setActiveScenario(${i})">
      <span class="sc-chip-dot"></span>
      <span class="sc-chip-label" ${dblclick} title="${active?'Double-click to rename':''}">${safeLabel}</span>
      ${closeBtn}
    </button>`;
  }).join("");
  if (scenarios.length < 4) {
    html += `<button class="sc-chip sc-chip-new" onclick="addScenario()" title="Add scenario">+ Add</button>`;
  }
  const canCompare = scenarios.length >= 2 && scenarios.every(s => s.typeId);
  html += `<button class="sc-compare-btn" onclick="switchTab('compare')" ${canCompare?"":"disabled"}>Compare ${scenarios.length}</button>`;
  bar.innerHTML = html;
}

function renderCities() {
  const s = getCurrentScenario();
  document.getElementById("cityBar").innerHTML = CITIES.map(c =>
    `<button class="city-pill ${c.id===s.city?'active':''}" onclick="setCity('${c.id}')">${c.label}</button>`
  ).join("");
}

function setCity(id) {
  getCurrentScenario().city = id;
  refreshAll();
}

function refreshAll() {
  renderScenarios();
  renderCities();
  if (currentTab === "browse")   renderBrowse();
  if (currentTab === "estimate") renderEstimate();
  if (currentTab === "lcca")     renderLCCA();
  if (currentTab === "optimize") renderOptimize();
  if (currentTab === "compare")  renderCompare();
  if (currentTab === "sustain")  renderSustain();
  if (currentTab === "report")   renderReport();
  updateTabBadges();
  saveState();
}
