/* ===========================================================
   Dashboard · Nelson Maia
   Multi-turma state + gender + PDF import
=========================================================== */

const STORE_KEY = "nelson-maia-dashboard-v6";

const SCHOOL_DEFAULT = {
  schoolName: "NELSON MAIA",
  schoolCity: "PONTO NOVO - BA",
  nte: "NTE-25"
};

// Build initial state from preset turmas (parsed from the 5 PDFs)
function buildDefaultState() {
  const turmas = {};
  for (const [k, v] of Object.entries(window.PRESET_TURMAS || {})) {
    turmas[k] = {
      label: v.label,
      sub: v.sub,
      total: v.total,
      disciplinas: v.disciplinas.map(d => ({
        nome: d.nome,
        ap: d.ap, rp: d.rp,
        apF: d.apF, apM: d.apM,
        rpF: d.rpF, rpM: d.rpM
      })),
      gender: { ...v.gender },
      students: (v.students || []).map(s => ({ idx: s.idx, name: s.name, gender: s.gender, g: s.g || [] }))
    };
  }
  // Ensure there's at least one turma
  if (Object.keys(turmas).length === 0) {
    turmas["default"] = blankTurma();
  }
  return {
    ...SCHOOL_DEFAULT,
    turmas,
    currentKey: Object.keys(turmas)[0]
  };
}

function blankTurma() {
  return {
    label: "NOVA TURMA",
    sub: "",
    total: 0,
    disciplinas: [],
    gender: { totalF: 0, totalM: 0, apF: 0, rpF: 0, apM: 0, rpM: 0 }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.turmas && Object.keys(parsed.turmas).length) {
        // Merge any new preset turmas that weren't in localStorage yet
        // (so the user gets new turmas when we add PDFs to preset-turmas.js)
        for (const [k, v] of Object.entries(window.PRESET_TURMAS || {})) {
          if (!parsed.turmas[k]) {
            parsed.turmas[k] = {
              label: v.label, sub: v.sub, total: v.total,
              disciplinas: v.disciplinas.map(d => ({ ...d })),
              gender: { ...v.gender },
              students: (v.students || []).map(s => ({ idx: s.idx, name: s.name, gender: s.gender, g: s.g || [] }))
            };
          }
        }
        return parsed;
      }
    }
  } catch (e) {}
  return buildDefaultState();
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

let state = loadState();

function currentTurma() {
  return state.turmas[state.currentKey] || Object.values(state.turmas)[0];
}

/* ============================================================
   HELPERS
============================================================ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[c]);
}
function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"
  })[c]);
}
function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

/* ============================================================
   RENDER HEADER + TOTAL
============================================================ */
function renderHeader() {
  const t = currentTurma();
  document.getElementById("turma-text").innerHTML =
    `${escapeHtml(t.label)}<br/>${escapeHtml(t.sub)}`;
  document.getElementById("school-name").textContent = state.schoolName;
  document.getElementById("school-city").textContent = state.schoolCity;
  document.getElementById("nte-badge").textContent = state.nte;
  document.getElementById("total-num").textContent = t.total;
  renderTurmaYearTabs();

  renderGenderFilter();
  renderGenderPanel();
}

function renderGenderFilter() {
  const t = currentTurma();
  const sel = document.getElementById("gender-filter");
  const prev = sel.value;
  let html = '<option value="__all__">TODAS AS DISCIPLINAS</option>';
  (t.disciplinas || []).forEach((d, i) => {
    html += `<option value="${i}">${escapeHtml(d.nome)}</option>`;
  });
  sel.innerHTML = html;
  // Restore selection if still valid
  if (prev === "__all__" || (t.disciplinas || [])[parseInt(prev, 10)]) {
    sel.value = prev;
  } else {
    sel.value = "__all__";
  }
}

function renderGenderPanel() {
  const t = currentTurma();
  const sel = document.getElementById("gender-filter");
  const val = sel.value;
  let totalF, totalM, apF, rpF, apM, rpM, labelSuffix = "";

  if (val === "__all__") {
    const g = t.gender || { totalF:0,totalM:0,apF:0,rpF:0,apM:0,rpM:0 };
    totalF = g.totalF; totalM = g.totalM;
    apF = g.apF; rpF = g.rpF; apM = g.apM; rpM = g.rpM;
  } else {
    const d = t.disciplinas[parseInt(val, 10)] || {};
    apF = d.apF || 0; rpF = d.rpF || 0;
    apM = d.apM || 0; rpM = d.rpM || 0;
    totalF = apF + rpF; totalM = apM + rpM;
    labelSuffix = " — " + (d.nome || "");
  }

  document.getElementById("gc-total-f").textContent = totalF;
  document.getElementById("gc-ap-f").textContent = apF;
  document.getElementById("gc-rp-f").textContent = rpF;
  document.getElementById("gc-total-m").textContent = totalM;
  document.getElementById("gc-ap-m").textContent = apM;
  document.getElementById("gc-rp-m").textContent = rpM;
}

document.getElementById("gender-filter").addEventListener("change", renderGenderPanel);

/* ============================================================
   TURMA MENU
============================================================ */
let turmaMenuYearFilter = null;

function turmaYear(t) {
  const match = String(t?.label || "").trim().match(/^([123])/);
  return match ? match[1] : "";
}

function renderTurmaYearTabs() {
  const tabs = document.getElementById("turma-year-tabs");
  if (!tabs) return;
  if (!turmaMenuYearFilter) {
    turmaMenuYearFilter = turmaYear(currentTurma()) || "1";
  }
  tabs.querySelectorAll(".turma-year-tab").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-year") === turmaMenuYearFilter);
  });
}

function renderTurmaMenu() {
  const menu = document.getElementById("turma-menu");
  if (!turmaMenuYearFilter) {
    turmaMenuYearFilter = turmaYear(currentTurma()) || "1";
  }
  renderTurmaYearTabs();

  const filteredTurmas = Object.entries(state.turmas).filter(([, t]) => {
    const year = turmaYear(t);
    return !year || year === turmaMenuYearFilter;
  });

  let html = "";
  for (const [key, t] of filteredTurmas) {
    const active = key === state.currentKey ? " active" : "";
    html += `<button class="menu-item${active}" data-key="${escapeAttr(key)}">
      <div>
        <div>${escapeHtml(t.label)}</div>
        <div class="sub">${escapeHtml(t.sub || "")}</div>
      </div>
      <div class="count">${t.total}</div>
    </button>`;
  }
  html += `<div class="menu-divider"></div>`;
  html += `<button class="menu-action" data-action="compare">📊 COMPARAR TURMAS DO MESMO ANO…</button>`;
  html += `<button class="menu-action" data-action="new">+ NOVA TURMA EM BRANCO</button>`;
  html += `<button class="menu-action" data-action="import">📄 IMPORTAR PDF…</button>`;
  menu.innerHTML = html;

  menu.querySelectorAll(".menu-item").forEach(el => {
    el.addEventListener("click", () => {
      state.currentKey = el.getAttribute("data-key");
      saveState();
      closeTurmaMenu();
      renderAll();
    });
  });
  menu.querySelector('[data-action="new"]').addEventListener("click", () => {
    const id = "turma-" + Date.now();
    state.turmas[id] = blankTurma();
    state.currentKey = id;
    saveState();
    closeTurmaMenu();
    renderAll();
    openDrawer();
  });
  menu.querySelector('[data-action="import"]').addEventListener("click", () => {
    closeTurmaMenu();
    openDrawer();
    switchTab("import");
  });
  const compareBtn = menu.querySelector('[data-action="compare"]');
  if (compareBtn) compareBtn.addEventListener("click", () => {
    window.location.href = 'Comparação entre Turmas.html';
  });
}

function openTurmaMenu() {
  turmaMenuYearFilter = turmaYear(currentTurma()) || turmaMenuYearFilter || "1";
  renderTurmaMenu();
  document.getElementById("turma-menu").classList.add("open");
}
function closeTurmaMenu() {
  document.getElementById("turma-menu").classList.remove("open");
}

document.getElementById("turma-card").addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = document.getElementById("turma-menu");
  if (menu.classList.contains("open")) closeTurmaMenu();
  else openTurmaMenu();
});
document.getElementById("turma-year-tabs").querySelectorAll(".turma-year-tab").forEach(el => {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    turmaMenuYearFilter = el.getAttribute("data-year");
    renderTurmaMenu();
    document.getElementById("turma-menu").classList.add("open");
  });
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".turma-selector")) closeTurmaMenu();
});

/* ============================================================
   BAR CHART
============================================================ */
function renderBars() {
  const svg = document.getElementById("bars");
  const t = currentTurma();
  const data = (t.disciplinas || []).filter(d => !d.hidden);

  const W = 1600, H = 440;
  const padL = 30, padR = 20, padT = 30, padB = 130;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length === 0) {
    svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" fill="#999">Sem disciplinas — importe um PDF ou edite a turma</text>`;
    return;
  }

  const maxVal = Math.max(t.total || 0, ...data.map(d => Math.max(d.ap || 0, d.rp || 0)), 10);
  const colCount = data.length;
  const colW = innerW / colCount;
  const barW = Math.min(28, colW * 0.55);
  const gapBetween = 2;

  let body = "";
  body += `<line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="#1a1a1a" stroke-width="1.5"/>`;

  data.forEach((d, i) => {
    const cx = padL + colW * i + colW / 2;
    const apH = ((d.ap || 0) / maxVal) * innerH;
    const rpH = ((d.rp || 0) / maxVal) * innerH;

    const apX = cx - barW - gapBetween / 2;
    const rpX = cx + gapBetween / 2;

    // Approved bar (green)
    body += `<rect x="${apX}" y="${padT + innerH - apH}" width="${barW}" height="${apH}" fill="#3f8a2f" stroke="#1a1a1a" stroke-width="0.6"/>`;
    if (apH > 0) {
      body += `<text x="${apX + barW/2}" y="${padT + innerH - apH - 6}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="13" font-weight="900" fill="#111">${d.ap || 0}</text>`;
    }

    // Failed bar (red)
    body += `<rect x="${rpX}" y="${padT + innerH - rpH}" width="${barW}" height="${rpH}" fill="#e21f25" stroke="#1a1a1a" stroke-width="0.6"/>`;
    if (rpH > 0) {
      const labelY = rpH > 22 ? (padT + innerH - rpH + 14) : (padT + innerH - rpH - 4);
      const labelFill = rpH > 22 ? "white" : "#111";
      body += `<text x="${rpX + barW/2}" y="${labelY}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="12" font-weight="900" fill="${labelFill}">${d.rp || 0}</text>`;
    }

    // X label rotated
    const lblY = padT + innerH + 12;
    body += `<g transform="translate(${cx}, ${lblY}) rotate(-58)">
      <text text-anchor="end" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#111">${escapeXml(d.nome)}</text>
    </g>`;
  });

  svg.innerHTML = body;
}

/* ============================================================
   DONUT "MAIS CRÍTICAS"
============================================================ */
function renderDonut() {
  const svg = document.getElementById("donut");
  const t = currentTurma();
  const VBW = 280, VBH = 140;
  const cx = 140, cy = 70;
  const rOuter = 38, rInner = 24;

  const critical = (t.disciplinas || [])
    .filter(d => !d.hidden && (d.rp || 0) > (d.ap || 0))
    .map(d => ({ nome: d.nome, rp: d.rp, ap: d.ap }));

  if (critical.length === 0) {
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${(rOuter+rInner)/2}" fill="none" stroke="#e2e2e2" stroke-width="${rOuter-rInner}"/>
      <text x="${cx}" y="${cy+2}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="8" fill="#3f8a2f">SEM ALERTAS</text>
      <text x="${cx}" y="${cy+12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="#666">Nenhuma disciplina crítica</text>
    `;
    return;
  }

  const total = critical.reduce((s, d) => s + d.rp, 0);
  critical.sort((a,b) => b.rp - a.rp);

  // Limit to top 6 to keep labels readable
  let top = critical.slice(0, 6);
  if (critical.length > 6) {
    const rest = critical.slice(6).reduce((s, d) => s + d.rp, 0);
    top.push({ nome: `+${critical.length - 6} outras`, rp: rest, ap: 0 });
  }
  const topTotal = top.reduce((s, d) => s + d.rp, 0);

  const palette = ["#2f5d27", "#d96b1f", "#e21f25", "#3f8a2f", "#7a3d12", "#8b1d20", "#57a447", "#f08a3a"];

  let acc = 0;
  let slicesSvg = "";
  let leaders = "";
  let labels = "";

  top.forEach((d, i) => {
    const frac = d.rp / topTotal;
    const start = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const end = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const color = palette[i % palette.length];

    if (frac >= 0.999) {
      slicesSvg += `<circle cx="${cx}" cy="${cy}" r="${(rOuter+rInner)/2}" fill="none" stroke="${color}" stroke-width="${rOuter - rInner}"/>`;
    } else {
      const x1 = cx + rOuter * Math.cos(start);
      const y1 = cy + rOuter * Math.sin(start);
      const x2 = cx + rOuter * Math.cos(end);
      const y2 = cy + rOuter * Math.sin(end);
      const x3 = cx + rInner * Math.cos(end);
      const y3 = cy + rInner * Math.sin(end);
      const x4 = cx + rInner * Math.cos(start);
      const y4 = cy + rInner * Math.sin(start);
      slicesSvg += `<path d="M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z" fill="${color}"/>`;
    }

    const mid = (start + end) / 2;
    const cosM = Math.cos(mid), sinM = Math.sin(mid);
    const isRight = cosM >= 0;
    const elbow = { x: cx + (rOuter + 6) * cosM, y: cy + (rOuter + 6) * sinM };
    const labelX = isRight ? VBW - 4 : 4;
    const lineEndX = isRight ? labelX - 1 : labelX + 1;

    const innerPt = { x: cx + (rOuter + 1) * cosM, y: cy + (rOuter + 1) * sinM };
    leaders += `<line x1="${innerPt.x.toFixed(2)}" y1="${innerPt.y.toFixed(2)}" x2="${elbow.x.toFixed(2)}" y2="${elbow.y.toFixed(2)}" stroke="${color}" stroke-width="0.6"/>`;
    leaders += `<line x1="${elbow.x.toFixed(2)}" y1="${elbow.y.toFixed(2)}" x2="${lineEndX}" y2="${elbow.y.toFixed(2)}" stroke="${color}" stroke-width="0.6"/>`;

    const anchor = isRight ? "end" : "start";
    const labelY = elbow.y;
    const pct = Math.round(frac * 100);
    const nameShort = shortenForDonut(d.nome);
    labels += `<text x="${labelX}" y="${labelY.toFixed(2)}" text-anchor="${anchor}" font-family="Arial Black, sans-serif" font-size="5.5" font-weight="900" fill="${color}" letter-spacing="0.2">${escapeXml(nameShort)}</text>`;
    labels += `<text x="${labelX}" y="${(labelY + 6).toFixed(2)}" text-anchor="${anchor}" font-family="Arial Black, sans-serif" font-size="5" font-weight="900" fill="#222">${pct}%</text>`;
  });

  svg.innerHTML = slicesSvg + leaders + labels;
}

/* Smart abbreviator for donut labels — keeps them readable inside the chart */
function shortenForDonut(name) {
  if (!name) return '';
  let n = name;
  // Common Brazilian school name abbreviations
  n = n.replace(/^ESTAÇÃO DO SABER\s+/i, 'EST. SABER ');
  n = n.replace(/^EDUCAÇÃO\s+/i, 'EDUC. ');
  n = n.replace(/^EDUCACAO\s+/i, 'EDUC. ');
  n = n.replace(/^LÍNGUA PORTUGUESA$/i, 'L. PORTUGUESA');
  n = n.replace(/^LINGUA PORTUGUESA$/i, 'L. PORTUGUESA');
  n = n.replace(/^IDENT\. E PROJ\. NAÇÃO$/i, 'IDENT./PROJ. NAÇÃO');
  n = n.replace(/^MUNDO E NÚMEROS$/i, 'MUNDO E NÚMEROS');
  n = n.replace(/^CULTURA POPULAR$/i, 'CULT. POPULAR');
  // Final length cap with ellipsis
  if (n.length > 18) n = n.slice(0, 17) + '…';
  return n;
}

/* ============================================================
   DRAWER
============================================================ */
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");

function openDrawer() {
  drawer.classList.add("open");
  backdrop.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  switchTab("edit");
  fillEditPane();
}
function closeDrawer() {
  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  resetImportPane();
}
function switchTab(name) {
  document.querySelectorAll(".drawer-tabs button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === name);
  });
  document.querySelectorAll(".drawer-pane").forEach(p => {
    p.classList.toggle("active", p.dataset.pane === name);
  });
  document.getElementById("drawer-foot-edit").style.display = name === "edit" ? "" : "none";
  document.getElementById("drawer-foot-import").style.display = name === "import" ? "" : "none";
}

document.getElementById("open-drawer").addEventListener("click", openDrawer);
document.getElementById("close-drawer").addEventListener("click", closeDrawer);
backdrop.addEventListener("click", closeDrawer);
document.querySelectorAll(".drawer-tabs button").forEach(b => {
  b.addEventListener("click", () => switchTab(b.dataset.tab));
});

/* ============================================================
   EDIT PANE
============================================================ */
function fillEditPane() {
  const t = currentTurma();
  document.getElementById("in-turma-l1").value = t.label || "";
  document.getElementById("in-turma-l2").value = t.sub || "";
  document.getElementById("in-school-name").value = state.schoolName;
  document.getElementById("in-school-city").value = state.schoolCity;
  document.getElementById("in-nte").value = state.nte;
  document.getElementById("in-total").value = t.total || 0;

  const list = document.getElementById("disc-list");
  list.innerHTML = "";
  (t.disciplinas || []).forEach(d => list.appendChild(buildDiscRow(d)));
}

function buildDiscRow(d) {
  const row = document.createElement("div");
  row.className = "disc-row" + (d.hidden ? " is-hidden" : "");
  row.innerHTML = `
    <input type="text" data-k="nome" value="${escapeAttr(d.nome || '')}" placeholder="Disciplina" />
    <input class="apF" type="number" min="0" data-k="apF" value="${d.apF || 0}" title="Mulher — Aprovadas"/>
    <input class="rpF" type="number" min="0" data-k="rpF" value="${d.rpF || 0}" title="Mulher — Reprovadas"/>
    <input class="apM" type="number" min="0" data-k="apM" value="${d.apM || 0}" title="Homem — Aprovados"/>
    <input class="rpM" type="number" min="0" data-k="rpM" value="${d.rpM || 0}" title="Homem — Reprovados"/>
    <button class="del" title="Remover disciplina">✕</button>
    <button class="eye${d.hidden ? ' oculto' : ''}" title="${d.hidden ? 'Exibir no gráfico' : 'Ocultar do gráfico'}">👁</button>
  `;
  row.querySelector(".del").addEventListener("click", () => row.remove());
  row.querySelector(".eye").addEventListener("click", () => {
    const btn = row.querySelector(".eye");
    const oculto = btn.classList.toggle("oculto");
    row.classList.toggle("is-hidden", oculto);
    btn.title = oculto ? "Exibir no gráfico" : "Ocultar do gráfico";
  });
  return row;
}

document.getElementById("add-disc").addEventListener("click", () => {
  document.getElementById("disc-list").appendChild(
    buildDiscRow({ nome: "", apF:0, rpF:0, apM:0, rpM:0 })
  );
});

document.getElementById("apply-data").addEventListener("click", () => {
  const t = currentTurma();
  t.label = document.getElementById("in-turma-l1").value.trim() || "—";
  t.sub   = document.getElementById("in-turma-l2").value.trim();
  state.schoolName = document.getElementById("in-school-name").value.trim() || "ESCOLA";
  state.schoolCity = document.getElementById("in-school-city").value.trim();
  state.nte        = document.getElementById("in-nte").value.trim() || "NTE";
  t.total = parseInt(document.getElementById("in-total").value, 10) || 0;

  const rows = [...document.querySelectorAll("#disc-list .disc-row")];
  t.disciplinas = rows.map(r => {
    const apF = parseInt(r.querySelector('[data-k="apF"]').value, 10) || 0;
    const rpF = parseInt(r.querySelector('[data-k="rpF"]').value, 10) || 0;
    const apM = parseInt(r.querySelector('[data-k="apM"]').value, 10) || 0;
    const rpM = parseInt(r.querySelector('[data-k="rpM"]').value, 10) || 0;
    const hidden = r.querySelector('.eye')?.classList.contains('oculto') || false;
    return {
      nome: r.querySelector('[data-k="nome"]').value.trim() || "—",
      ap: apF + apM, rp: rpF + rpM,
      apF, rpF, apM, rpM,
      hidden
    };
  }).filter(d => d.nome !== "—" || d.ap || d.rp);

  // Recompute gender totals from disciplinas (use student-level if available, otherwise approximate)
  // Since we may not have student-level data after manual edit, infer from max per category:
  // For totalF/totalM: use the max of (apF + rpF) across all disciplinas (the "everyone in some disc" count)
  // Better: keep prior totals untouched if no PDF basis. Allow manual override below in future.
  // For now, recompute approved/failed totals as: a student is approved if apF/apM in ALL disciplines (we can't tell from aggregates) — fall back to max.
  // Practical: keep g.totalF/totalM from prior state, and set apF/rpF as max per-discipline (sum of all unique counted)
  // Actually the simplest correct approach: leave gender summary as-is and let user re-import or edit separately.
  // For an editable view, just sum the highest per-row totals.
  const maxF = t.disciplinas.reduce((m, d) => Math.max(m, d.apF + d.rpF), 0);
  const maxM = t.disciplinas.reduce((m, d) => Math.max(m, d.apM + d.rpM), 0);
  // Approve overall: minF/M = students who are approved in ALL disciplines they're enrolled in. Best estimate = min(apF) across disciplines with data.
  const apsF = t.disciplinas.filter(d => (d.apF + d.rpF) > 0).map(d => d.apF);
  const apsM = t.disciplinas.filter(d => (d.apM + d.rpM) > 0).map(d => d.apM);
  const minApF = apsF.length ? Math.min(...apsF) : 0;
  const minApM = apsM.length ? Math.min(...apsM) : 0;
  t.gender = {
    totalF: maxF, totalM: maxM,
    apF: minApF, rpF: Math.max(maxF - minApF, 0),
    apM: minApM, rpM: Math.max(maxM - minApM, 0)
  };

  saveState();
  renderAll();
  closeDrawer();
});

document.getElementById("reset-data").addEventListener("click", () => {
  if (!confirm("Restaurar todos os dados das turmas para os PDFs originais?")) return;
  state = buildDefaultState();
  saveState();
  renderAll();
  fillEditPane();
});

document.getElementById("delete-turma").addEventListener("click", () => {
  if (Object.keys(state.turmas).length <= 1) {
    alert("Não é possível excluir a única turma.");
    return;
  }
  const t = currentTurma();
  if (!confirm(`Excluir a turma "${t.label} ${t.sub}"?`)) return;
  delete state.turmas[state.currentKey];
  state.currentKey = Object.keys(state.turmas)[0];
  saveState();
  renderAll();
  closeDrawer();
});

/* ============================================================
   IMPORT PANE — PDF parsing
============================================================ */
let importPdfResult = null; // holds { disciplines, students }

function resetImportPane() {
  importPdfResult = null;
  document.getElementById("pdf-preview").classList.remove("open");
  document.getElementById("import-status").style.display = "none";
  document.getElementById("save-import").disabled = true;
}

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const f = e.dataTransfer.files?.[0];
  if (f) handlePdfFile(f);
});
fileInput.addEventListener("change", e => {
  const f = e.target.files?.[0];
  if (f) handlePdfFile(f);
});

function setStatus(kind, msg) {
  const el = document.getElementById("import-status");
  el.className = "import-status " + kind;
  el.textContent = msg;
  el.style.display = "block";
}

/* ---- Gender heuristic (Brazilian PT) ---- */
const F_NAMES = new Set(['ANA','MARIA','TAINA','THAINA','HANNAH','HELOISE','SAMIRE','SOFIA','EDNA','MILENA','LARA','LARYSSE','LAUANY','MARIANA','VITORIA','YELMARIA','KAILANY','NAIARA','AMANDA','ARIANE','ELAYNE','JULIANA','FRANCIELLY','ENNY','JECIVANIA','IVAIUMA','BEATRIZ','LAYLA','JENIFER','EMILY','RAQUEL','LETICIA','LARISSA','CAMILA','GABRIELA','BIANCA','SARAH','EDUARDA','AYSLA','YASMIN','HELOISA','ALESSANDRA','ALEXSANDRA','ANALENE','DANILA','EMILIANY','ELOISE','FRANCIELLE','NATIELLE','YNGRED','CAROLINE','CLECIONE','JOICE','JOILMA','LAILA','MARLIENE','MIRELE','TAINARA','RAYANE','RAYSSA','LIVIA','EVELYN','EVA','LUANA','LUIZA','LAYS','MAYRA','TAYNARA','TAYNA','JOANA','GIULIA','GIOVANNA','VIVIANE','DEISE','DAIANE','DAYANE','PRISCILA','POLIANA','TATIANE','SUELLEN','SAMARA','GLAUCIA','TALITA','ALICE','LAIS','LARISSE','JADE','MAITE','REGINA','ELISA','ELENA','VANESSA','SIMONE','PATRICIA','VALERIA']);
const M_NAMES = new Set(['ADENILTON','ADILIO','ADILSO','ANDERSON','ANTONIEL','DANIEL','DIEGO','EMERSON','GUILHERME','HENRIQUE','LEVI','LUIZ','MATEUS','MATHEUS','VITOR','VICTOR','WESLLEY','WILDINEY','JOAO','PEDRO','GABRIEL','RAFAEL','LUCAS','BRENO','BRUNO','MARCOS','GERONIMO','JHONATAS','JORDON','EDUARDO','EDSON','FELIPE','CARLOS','THIAGO','TIAGO','DEAN','ANDRE','ELIAS','ISAQUE','SAMUEL','DAVI','GUSTAVO','VINICIUS','YURI','ALAN','KAYKE','KAUE','KAUAN','OTAVIO','LEONARDO','RODRIGO','RANIERE','KAIQUE','KENNEDY','DANILO','ALEX','CAIQUE','CLEVERTON','ERISVALDO','FERNANDO','FREDSON','IGOR','JADSON','KELVEN','LEANDRO','PAULO','RICARDO','EVERTON','EUDES','JACKSON','WALLACE','EZEQUIEL','ELIEL','ROBERT','RAIMUNDO','JOAQUIM','EZEQUIAS','ALEXANDRE','HEITOR','ARTHUR','MURILO','MIGUEL','EMANUEL','BENJAMIN','BENICIO','LOURENCO','TIAGO','EMANUEL','EZEQUIEL','MARCELO','ROBERTO','RONALDO','SIDNEY','ROGERIO','HERMES','HUGO','RAUL']);

function detectGender(name) {
  const first = (name || '').trim().split(/\s+/)[0].toUpperCase();
  if (F_NAMES.has(first)) return 'F';
  if (M_NAMES.has(first)) return 'M';
  if (/(?:A|AH|CE|NE|LY|IA|YA|RA)$/.test(first)) return 'F';
  return 'M';
}

async function handlePdfFile(file) {
  setStatus("info", `Lendo "${file.name}"…`);
  resetImportPane();
  try {
    const { PDFParse } = await import('https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/web/pdf-parse.es.js');
    PDFParse.setWorker('https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/web/pdf.worker.min.mjs');
    const buf = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const { text } = await parser.getText();
    const parsed = parseMapaNotas(text);
    if (!parsed.students.length) {
      setStatus("error", "Nenhum estudante encontrado. Verifique se o PDF é um \"Mapa Geral de Notas\" do SIGEduc.");
      return;
    }
    importPdfResult = parsed;
    renderImportPreview();
    setStatus("success", `PDF lido com sucesso · ${parsed.students.length} estudantes · ${parsed.disciplines.length} disciplinas`);
  } catch (e) {
    console.error(e);
    setStatus("error", "Erro ao ler o PDF: " + (e.message || e));
  }
}

function parseMapaNotas(text) {
  const tCode = (text.match(/turma\s+([A-Z0-9\-]+)\./) || [])[1] || 'IMPORTADA';
  const serie = (text.match(/Ano\/Série\/Outros:\s*\t([^\t\n]+)/) || [])[1] || '';

  const hStart = text.indexOf('Nº Estudante');
  const hEnd   = text.indexOf('1° 2° 3° MA EF MF');
  if (hStart < 0 || hEnd < 0) {
    throw new Error('Formato não reconhecido (cabeçalho "Nº Estudante" ou "1° 2° 3° MA EF MF" não encontrado).');
  }
  const headerSlice = text.slice(hStart + 'Nº Estudante'.length, hEnd);

  const lines = headerSlice.split('\n');
  const disciplines = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const startsWithTab = raw.startsWith('\t');
    const parts = raw.split('\t').map(s => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    for (let i = 0; i < parts.length; i++) {
      if (i === 0 && startsWithTab && disciplines.length) {
        disciplines[disciplines.length - 1] += ' ' + parts[0];
      } else {
        disciplines.push(parts[i]);
      }
    }
  }

  const shortLabels = disciplines.map(name => {
    if (name.startsWith('ESTACAO DO SABER')) {
      const m = name.match(/^ESTACAO DO SABER\s+([IVX]+)/);
      const mapR = { I:'01', II:'02', III:'03', IV:'04', V:'05', VI:'06', VII:'07', VIII:'08', IX:'09', X:'10' };
      return 'ESTAÇÃO DO SABER ' + (mapR[m?.[1]] || m?.[1] || '');
    }
    if (/^EDUCACAO AMBIENTAL/.test(name)) return 'EDUC. AMBIENTAL';
    if (/^EDUCACAO SOCIOCIENTIFICA/.test(name)) return 'EDUC. SOCIOCIENT.';
    if (/^SOCIEDADE,? PENSAMENTO/.test(name)) return 'SOC. PENS. GEOPOL.';
    if (/^LINGUAGENS E CULTURAS/.test(name)) return 'LING. E CULTURAS';
    return name
      .replace(/^EDUCACAO FISICA$/, 'EDUCAÇÃO FÍSICA')
      .replace(/^ETNOMATEMATICA$/, 'ETNOMATEMÁTICA')
      .replace(/^HISTORIA$/, 'HISTÓRIA')
      .replace(/^INGLES$/, 'INGLÊS')
      .replace(/^LINGUA INGLESA$/, 'LÍNGUA INGLESA')
      .replace(/^LINGUA PORT.*$/, 'LÍNGUA PORTUGUESA')
      .replace(/^MATEMATICA$/, 'MATEMÁTICA')
      .replace(/^QUIMICA$/, 'QUÍMICA')
      .replace(/^FISICA$/, 'FÍSICA')
      .replace(/^ARTE$/, 'ARTES')
      .replace(/CULTURA POPULAR E.*$/, 'CULTURA POPULAR')
      .replace(/IDENTIDADES E.*$/, 'IDENT. E PROJ. NAÇÃO')
      .replace(/MEIO AMBIENTE.*$/, 'MEIO AMBIENTE')
      .replace(/O MUNDO OS.*$/, 'MUNDO E NÚMEROS')
      .replace(/PROJETO DE VIDA.*$/, 'PROJETO DE VIDA')
      .substring(0, 30);
  });

  const dataRaw = text.slice(hEnd);
  const firstNL = dataRaw.indexOf('\n');
  let data = dataRaw.slice(firstNL + 1);
  let norm = data.replace(/[\t]+/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const footer = norm.search(/MA - Média/);
  if (footer >= 0) norm = norm.slice(0, footer);
  norm = norm.replace(/(?<![\d,])0(?![\d,])/g, '0,0');

  const tokens = norm.match(/\d+,\d+|\d{1,3}|[A-ZÀ-ÚÇ'][A-ZÀ-ÚÇ'-]*/g) || [];
  const studentsRaw = [];
  let cur = null;
  let mode = 'init';
  for (const tok of tokens) {
    const isGrade = /^\d+,\d+$/.test(tok);
    const isNum = !isGrade && /^\d+$/.test(tok);
    const isWord = !isGrade && !isNum;
    if (isGrade) {
      if (!cur) cur = { idx: 0, nameParts: [], grades: [] };
      cur.grades.push(parseFloat(tok.replace(',', '.')));
      mode = 'grade';
    } else if (isWord) {
      if (mode === 'grade' || !cur) {
        if (cur) studentsRaw.push(cur);
        cur = { idx: 0, nameParts: [tok], grades: [] };
        mode = 'name';
      } else {
        cur.nameParts.push(tok);
      }
    } else {
      const n = parseInt(tok, 10);
      if (mode === 'grade' || !cur) {
        if (cur) studentsRaw.push(cur);
        cur = { idx: n, nameParts: [], grades: [] };
        mode = 'name';
      }
    }
  }
  if (cur) studentsRaw.push(cur);

  const students = studentsRaw
    .filter(s => s.grades.length > 0 && s.nameParts.length > 0)
    .map(s => ({ idx: s.idx, name: s.nameParts.join(' '), grades: s.grades, gender: detectGender(s.nameParts.join(' ')) }));

  const expectedLen = disciplines.length * 4;
  for (const s of students) {
    while (s.grades.length < expectedLen) s.grades.push(0);
    if (s.grades.length > expectedLen) s.grades = s.grades.slice(0, expectedLen);
  }

  return { turmaCode: tCode, serie, disciplines: shortLabels, fullDisciplines: disciplines, students };
}

function computeFromImport(threshold) {
  const { disciplines, students } = importPdfResult;
  // Effective grade per 4-col block [1°,2°,3°,MA]: prefer MA, then last filled bimester
  const effG = (b) => { const [a,b2,c,ma]=b; if(ma>0)return ma; if(c>0)return c; if(b2>0)return b2; if(a>0)return a; return 0; };
  // Attach computed effective grade array to each student (used when saving)
  for (const s of students) {
    s.g = [];
    for (let di = 0; di < disciplines.length; di++) s.g.push(Math.round(effG(s.grades.slice(di*4, di*4+4)) * 10) / 10);
  }
  const perDisc = disciplines.map(label => ({ nome: label, ap:0, rp:0, apF:0, apM:0, rpF:0, rpM:0 }));
  for (const s of students) {
    for (let di = 0; di < disciplines.length; di++) {
      const g = s.g[di];
      if (g === 0) continue; // sem nota
      if (g >= threshold) {
        perDisc[di].ap++;
        if (s.gender === 'F') perDisc[di].apF++; else perDisc[di].apM++;
      } else {
        perDisc[di].rp++;
        if (s.gender === 'F') perDisc[di].rpF++; else perDisc[di].rpM++;
      }
    }
  }
  let totalF=0,totalM=0,apF=0,rpF=0,apM=0,rpM=0;
  for (const s of students) {
    let anyFail=false, anyData=false;
    for (let di = 0; di < disciplines.length; di++) {
      const g = s.g[di];
      if (g === 0) continue;
      anyData = true;
      if (g < threshold) { anyFail = true; break; }
    }
    const approved = anyData && !anyFail;
    if (s.gender === 'F') { totalF++; approved?apF++:rpF++; }
    else { totalM++; approved?apM++:rpM++; }
  }
  return { perDisc, gender: { totalF, totalM, apF, rpF, apM, rpM } };
}

function renderImportPreview() {
  const preview = document.getElementById("pdf-preview");
  preview.classList.add("open");

  const threshInput = document.getElementById("pass-threshold");
  threshInput.oninput = updateImportSummary;

  // Default labels
  const code = importPdfResult.turmaCode || 'IMPORTADA';
  document.getElementById("imp-label").value = code;
  document.getElementById("imp-sub").value = importPdfResult.serie.trim().slice(0, 40);

  // Render student list
  const list = document.getElementById("student-list");
  list.innerHTML = "";
  importPdfResult.students.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "student-row " + (s.gender === 'F' ? 'fem' : 'mas');
    row.innerHTML = `
      <div class="sr-idx">${s.idx || i+1}</div>
      <div class="sr-name">${escapeHtml(s.name)}</div>
      <select data-i="${i}">
        <option value="F" ${s.gender==='F'?'selected':''}>♀ F</option>
        <option value="M" ${s.gender==='M'?'selected':''}>♂ M</option>
      </select>
    `;
    row.querySelector("select").addEventListener("change", e => {
      importPdfResult.students[i].gender = e.target.value;
      row.className = "student-row " + (e.target.value === 'F' ? 'fem' : 'mas');
      updateImportSummary();
    });
    list.appendChild(row);
  });

  document.getElementById("save-import").disabled = false;
  updateImportSummary();
}

function updateImportSummary() {
  if (!importPdfResult) return;
  const thresh = parseFloat(document.getElementById("pass-threshold").value) || 5.0;
  const calc = computeFromImport(thresh);
  const g = calc.gender;
  const critCount = calc.perDisc.filter(d => d.rp > d.ap).length;
  document.getElementById("pp-summary").innerHTML = `
    <b>${importPdfResult.students.length}</b> estudantes ·
    <b>${importPdfResult.disciplines.length}</b> disciplinas ·
    <b>${critCount}</b> crítica${critCount===1?'':'s'}
    <br/>
    ♀ Mulheres: <b>${g.totalF}</b> (${g.apF} ap / ${g.rpF} rp) ·
    ♂ Homens: <b>${g.totalM}</b> (${g.apM} ap / ${g.rpM} rp)
  `;
}

document.getElementById("bulk-f").addEventListener("click", () => {
  if (!importPdfResult) return;
  importPdfResult.students.forEach(s => s.gender = 'F');
  renderImportPreview();
});
document.getElementById("bulk-m").addEventListener("click", () => {
  if (!importPdfResult) return;
  importPdfResult.students.forEach(s => s.gender = 'M');
  renderImportPreview();
});

document.getElementById("cancel-import").addEventListener("click", () => {
  resetImportPane();
  switchTab("edit");
});

document.getElementById("save-import").addEventListener("click", () => {
  if (!importPdfResult) return;
  const thresh = parseFloat(document.getElementById("pass-threshold").value) || 5.0;
  const calc = computeFromImport(thresh);
  const label = document.getElementById("imp-label").value.trim() || "NOVA TURMA";
  const sub = document.getElementById("imp-sub").value.trim();

  const id = "imp-" + Date.now();
  state.turmas[id] = {
    label, sub,
    total: importPdfResult.students.length,
    disciplinas: calc.perDisc.map(d => ({
      nome: d.nome, ap: d.ap, rp: d.rp,
      apF: d.apF, apM: d.apM, rpF: d.rpF, rpM: d.rpM
    })),
    gender: calc.gender,
    students: importPdfResult.students.map((s, i) => ({
      idx: i + 1, name: s.name, gender: s.gender, g: s.g || []
    }))
  };
  state.currentKey = id;
  saveState();
  renderAll();
  closeDrawer();
});

/* ============================================================
   RENDER ALL
============================================================ */
function renderAll() {
  renderHeader();
  renderBars();
  renderDonut();
}
renderAll();
