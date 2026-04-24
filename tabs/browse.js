function getCategories() {
  const cats = {};
  TYPES.forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + 1; });
  return [
    {id:"all", label:"All", count:TYPES.length},
    ...Object.entries(cats).map(([k,v]) => ({id:k, label:k, count:v}))
  ];
}

function renderBrowse() {
  const s = getCurrentScenario();
  const panel = document.getElementById("browsePanel");
  let html = `<div class="search-wrap">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    <input type="text" class="search-input" id="searchInput" placeholder="Search building types..." oninput="renderTypeList()" value="">
  </div>
  <div class="cat-bar" id="catBar">
    ${getCategories().map(c =>
      `<button class="cat-pill ${browseCategory===c.id?'active':''}" onclick="setBrowseCategory('${c.id}')">${c.label}<span class="cat-count">${c.count}</span></button>`
    ).join("")}
  </div>
  <div id="typeList"></div>`;
  panel.innerHTML = html;
  renderTypeList();
}

function setBrowseCategory(id) {
  browseCategory = id;
  renderBrowse();
}

function renderTypeList() {
  const s = getCurrentScenario();
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const filtered = TYPES.filter(t => {
    const matchQ = t.label.toLowerCase().includes(q);
    const matchCat = browseCategory === "all" || t.cat === browseCategory;
    return matchQ && matchCat;
  });
  const container = document.getElementById("typeList");
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty">
      <div class="empty-title">No matching types</div>
      <div class="empty-text">Try a different search term or clear the category filter.</div>
    </div>`;
    return;
  }
  container.innerHTML = filtered.map(t => {
    const r = t.rates[s.city];
    const unit = getUnit(t);
    const sel = s.typeId === t.id ? " selected" : "";
    const sectorCls = t.sector === "private" ? "tag-private" : t.sector === "public" ? "tag-public" : "tag-infra";
    const srcBadge = t.sourceNote === "industry"
      ? `<span class="src-badge" title="Rate is industry estimate, not from Altus published guide">est</span>`
      : "";
    return `<div class="type-card${sel}" onclick="selectType('${t.id}')">
      <div class="type-name">${t.label}${srcBadge}</div>
      <div class="type-meta">
        <span class="sector-tag ${sectorCls}">${t.sector}</span>
        <span>${t.cat}</span>
      </div>
      <div class="type-range">
        <span>$${fmtN(r[0])} — $${fmtN(r[1])} ${unit}</span>
        <span class="type-range-bar"></span>
      </div>
    </div>`;
  }).join("");
}

function selectType(id) {
  const s = getCurrentScenario();
  if (s.typeId !== id) {
    applyTypeDefaults(s, id);
  }
  s.typeId = id;
  switchTab("estimate");
}