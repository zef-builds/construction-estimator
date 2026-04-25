/**
 * core/state.js
 * Owns app state: scenarios, active tab, LCCA settings, sustain standard.
 * Persists to localStorage via saveState/loadState (key: zef_estimator_v2).
 * Exposes: scenarios, activeScenarioIdx, getCurrentScenario, getCurrentType,
 *          addScenario, removeScenario, setActiveScenario, renameScenario.
 * Depends on: TYPES (data/building-types.js), refreshAll (core/ui.js), showToast (core/ui.js).
 */
const STORAGE_KEY = "zef_estimator_v2";

const makeScenario = (name) => ({
  name,
  city: "tor",
  typeId: null,
  inputs: {
    gfa: 50000, storeys: 8, siteArea: 0,
    unitCount: 0, unitSize: 1800,
    unitMix: {bachelor:0, one:0, two:0, three:0},
    parkingType: "none", parkingStalls: 0,
    garage: "none",
    quality: 50, softPct: 20,
    hotelKeys: 0,
    hospitalBeds: 0,
    schoolCapacity: 0,
    officeNla: 0,
    officeEfficiency: 75,
    clearHeight: 28,
    retailTier: "shell"
  }
});

let scenarios = [makeScenario("Scenario A")];
let activeScenarioIdx = 0;
let currentTab = "browse";
let browseCategory = "all";
let lccaPeriod = 30;
let lccaDiscount = 3.5;
let lccaEnergyEsc = 2.5;
let lccaMaintTier = "standard";
let lccaPreset = "standard";
let optTool = null;
let sustainStandard = "necb2020";

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      scenarios, activeScenarioIdx, currentTab, browseCategory,
      lccaPeriod, lccaDiscount, lccaEnergyEsc, lccaMaintTier, lccaPreset
    }));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const st = JSON.parse(raw);
    if (!st.scenarios || !st.scenarios.length) return false;
    scenarios = st.scenarios;
    activeScenarioIdx = Math.min(st.activeScenarioIdx || 0, scenarios.length - 1);
    currentTab = st.currentTab || "browse";
    browseCategory = st.browseCategory || "all";
    lccaPeriod = st.lccaPeriod ?? 30;
    lccaDiscount = st.lccaDiscount ?? 3.5;
    lccaEnergyEsc = st.lccaEnergyEsc ?? 2.5;
    lccaMaintTier = st.lccaMaintTier || "standard";
    lccaPreset = st.lccaPreset || "standard";
    return true;
  } catch(e) { return false; }
}

function getCurrentScenario() { return scenarios[activeScenarioIdx]; }

function getCurrentType() {
  const s = getCurrentScenario();
  return s.typeId ? TYPES.find(t => t.id === s.typeId) : null;
}

function hasEstimate() {
  const s = getCurrentScenario();
  return s.typeId !== null;
}

function addScenario() {
  if (scenarios.length >= 4) return;
  const letters = ["A","B","C","D","E"];
  const used = scenarios.map(s => s.name);
  let nextName = "Scenario " + letters[scenarios.length];
  for (const L of letters) {
    if (!used.includes("Scenario " + L)) { nextName = "Scenario " + L; break; }
  }
  const copy = JSON.parse(JSON.stringify(scenarios[activeScenarioIdx]));
  copy.name = nextName;
  scenarios.push(copy);
  activeScenarioIdx = scenarios.length - 1;
  refreshAll();
  showToast("Scenario added");
}

function removeScenario(i) {
  if (scenarios.length <= 1) return;
  scenarios.splice(i, 1);
  if (activeScenarioIdx >= scenarios.length) activeScenarioIdx = scenarios.length - 1;
  refreshAll();
}

function setActiveScenario(i) {
  activeScenarioIdx = i;
  refreshAll();
}

function renameScenario(i, el) {
  el.contentEditable = "true";
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  function commit() {
    el.contentEditable = "false";
    const newName = el.textContent.trim().slice(0, 24) || scenarios[i].name;
    scenarios[i].name = newName;
    el.removeEventListener("blur", commit);
    el.removeEventListener("keydown", onKey);
    refreshAll();
  }
  function onKey(e) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { el.textContent = scenarios[i].name; commit(); }
  }
  el.addEventListener("blur", commit);
  el.addEventListener("keydown", onKey);
}