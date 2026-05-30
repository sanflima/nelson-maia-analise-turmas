/* ===========================================================
   Comparação entre Turmas — Colégio Nelson Maia
=========================================================== */

const BANDS = [
  { key: 'critico',  label: 'CRÍTICO (< 3)',     test: g => g > 0 && g < 3 },
  { key: 'melhorar', label: 'PODE MELHORAR (3–5)', test: g => g >= 3 && g < 5 },
  { key: 'esperado', label: 'ESPERADO (5–7)',    test: g => g >= 5 && g < 7 },
  { key: 'superou',  label: 'SUPEROU (≥ 7)',     test: g => g >= 7 }
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[c]);
}

/* Group turmas by year (parses the label prefix "1°ANO", "2°ANO", "3°ANO") */
function groupTurmasByYear() {
  const groups = { 1: [], 2: [], 3: [] };
  for (const [key, t] of Object.entries(window.PRESET_TURMAS || {})) {
    const m = (t.label || '').match(/^(\d)°/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    if (year >= 1 && year <= 3) groups[year].push({ key, ...t });
  }
  return groups;
}

/* Compute grade band counts for a turma.
   discIndex: a number → restrict to that discipline column (count each grade).
              null → "TODAS": band each STUDENT by their average across disciplines
              (so the data points = number of students, not grades). */
function computeBands(turma, discIndex = null) {
  const counts = { critico:0, melhorar:0, esperado:0, superou:0, semNota:0 };
  let totalGrades = 0;
  let aprov = 0, reprov = 0; // aprovado = nota ≥ 5, reprovado = nota < 5
  for (const s of (turma.students || [])) {
    const gs = s.g || [];
    if (discIndex !== null) {
      const g = gs[discIndex];
      if (g === undefined) continue;
      if (g === 0) { counts.semNota++; continue; }
      totalGrades++;
      for (const b of BANDS) { if (b.test(g)) { counts[b.key]++; break; } }
      if (g >= 5) aprov++; else reprov++;
    } else {
      // TODAS — média do aluno entre as disciplinas com nota
      const vals = gs.filter(g => g > 0);
      if (vals.length === 0) { counts.semNota++; continue; }
      const avg = vals.reduce((a,b) => a + b, 0) / vals.length;
      totalGrades++;
      for (const b of BANDS) { if (b.test(avg)) { counts[b.key]++; break; } }
      if (avg >= 5) aprov++; else reprov++;
    }
  }
  return { counts, totalGrades, aprov, reprov, totalWithSemNota: totalGrades + counts.semNota };
}

/* Find the index of a discipline by name within a turma (or -1) */
function discIndexByName(turma, name) {
  return (turma.disciplinas || []).findIndex(d => d.nome === name);
}

/* Compute overall approval rate for a turma (% of grades ≥ 6) */
function computeApprovalRate(turma) {
  let approved = 0, total = 0;
  for (const s of (turma.students || [])) {
    for (const g of (s.g || [])) {
      if (g === 0) continue; // sem nota
      total++;
      if (g >= 5) approved++;
    }
  }
  return total > 0 ? (approved / total) : 0;
}

/* Compute per-discipline approval rate */
function computeDiscApproval(turma) {
  const result = [];
  const disc = turma.disciplinas || [];
  for (let di = 0; di < disc.length; di++) {
    let ap = 0, total = 0;
    for (const s of (turma.students || [])) {
      const g = (s.g || [])[di];
      if (g === undefined || g === 0) continue;
      total++;
      if (g >= 5) ap++;
    }
    result.push({ nome: disc[di].nome, ap, total, rate: total > 0 ? ap / total : 0 });
  }
  return result;
}

/* ===================== RENDER ===================== */

function render() {
  const groups = groupTurmasByYear();
  const tabsEl = document.getElementById('year-tabs');
  let html = '';
  for (const y of [1,2,3]) {
    const n = groups[y].length;
    html += `<button data-year="${y}" ${y===1?'class="active"':''}>${y}° ANO <span class="count">${n}</span></button>`;
  }
  tabsEl.innerHTML = html;
  tabsEl.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      tabsEl.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderYear(parseInt(b.dataset.year, 10), groups[parseInt(b.dataset.year, 10)]);
    });
  });
  renderYear(1, groups[1]);
}

function renderYear(year, turmas) {
  const view = document.getElementById('year-view');
  if (!turmas.length) {
    view.innerHTML = `<div class="empty">Nenhuma turma do ${year}° ano carregada.</div>`;
    return;
  }

  // OVERVIEW
  let totalStudents = 0, totalF = 0, totalM = 0;
  let totalGrades = 0, totalApproved = 0;
  for (const t of turmas) {
    totalStudents += (t.total || (t.students||[]).length);
    totalF += (t.gender?.totalF || 0);
    totalM += (t.gender?.totalM || 0);
    for (const s of (t.students||[])) {
      for (const g of (s.g || [])) {
        if (g === 0) continue;
        totalGrades++;
        if (g >= 5) totalApproved++;
      }
    }
  }
  const approvalRate = totalGrades > 0 ? (totalApproved / totalGrades) * 100 : 0;

  let html = `
    <div class="section-title">RESUMO DO ${year}° ANO</div>
    <div class="overview">
      <div class="ov-card"><div class="ov-label">TURMAS</div><div class="ov-num">${turmas.length}</div></div>
      <div class="ov-card"><div class="ov-label">ALUNOS</div><div class="ov-num">${totalStudents}</div></div>
      <div class="ov-card fem"><div class="ov-label">♀ MULHERES</div><div class="ov-num">${totalF}</div><div class="ov-sub">${totalStudents>0?Math.round(totalF/totalStudents*100):0}%</div></div>
      <div class="ov-card mas"><div class="ov-label">♂ HOMENS</div><div class="ov-num">${totalM}</div><div class="ov-sub">${totalStudents>0?Math.round(totalM/totalStudents*100):0}%</div></div>
      <div class="ov-card aprov"><div class="ov-label">APROVAÇÃO ATUAL</div><div class="ov-num">${approvalRate.toFixed(0)}<small>%</small></div><div class="ov-sub">${totalApproved} de ${totalGrades} notas ≥ 5</div></div>
    </div>
  `;

  // CRITICAL ANALYSIS PER TURMA (with discipline filter)
  // Build union of disciplines for the filter dropdown
  const critDiscOptions = [];
  const critSeen = new Set();
  for (const t of turmas) {
    for (const d of (t.disciplinas || [])) {
      if (!critSeen.has(d.nome)) { critSeen.add(d.nome); critDiscOptions.push(d.nome); }
    }
  }
  let critFilterHtml = `<div class="crit-filter">
    <label>FILTRAR POR DISCIPLINA</label>
    <select id="crit-disc-filter">
      <option value="__all__">TODAS AS DISCIPLINAS</option>
      ${critDiscOptions.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
    </select>
    <span class="crit-filter-hint" id="crit-filter-hint"></span>
  </div>`;

  html += `<div class="section-title section-title-flex">
    <span>ANÁLISE CRÍTICA POR TURMA</span>
  </div>`;
  html += critFilterHtml;
  html += `<div class="crit-grid" id="crit-grid"></div>`;

  // DISCIPLINE HEATMAP — only if there are multiple turmas
  if (turmas.length > 1) {
    // Union of disciplines (preserve insertion order across turmas)
    const allDisc = [];
    const seen = new Set();
    for (const t of turmas) {
      for (const d of (t.disciplinas || [])) {
        if (!seen.has(d.nome)) { seen.add(d.nome); allDisc.push(d.nome); }
      }
    }
    const discApproval = turmas.map(t => ({
      key: t.key, label: t.label, sub: t.sub,
      perDisc: computeDiscApproval(t)
    }));

    html += `<div class="section-title">DISCIPLINAS × TURMAS (% APROVAÇÃO ATUAL)</div>`;
    html += `<div class="heatmap"><table>`;
    html += `<thead><tr><th style="text-align:left">DISCIPLINA</th>`;
    for (const t of turmas) {
      html += `<th>${escapeHtml(shortTurmaLabel(t))}</th>`;
    }
    html += `</tr></thead><tbody>`;
    for (const dname of allDisc) {
      html += `<tr><td class="disc-name">${escapeHtml(dname)}</td>`;
      for (let i = 0; i < turmas.length; i++) {
        const rec = discApproval[i].perDisc.find(d => d.nome === dname);
        if (!rec || rec.total === 0) {
          html += `<td class="na">—</td>`;
        } else {
          const pct = Math.round(rec.rate * 100);
          const color = pct >= 70 ? '#3f8a2f' : pct >= 50 ? '#a3a629' : pct >= 30 ? '#d96b1f' : '#e21f25';
          html += `<td><span class="hm" style="background:${color}">${pct}%</span></td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
  }

  // RANKING
  const ranked = turmas.map(t => ({
    key: t.key, label: t.label, sub: t.sub,
    rate: computeApprovalRate(t)
  })).sort((a,b) => b.rate - a.rate);

  html += `<div class="section-title">RANKING DE APROVAÇÃO</div>`;
  html += `<div class="ranking">`;
  html += `<div class="rank-card best"><h3>MELHORES ÍNDICES</h3><div class="rank-list">`;
  ranked.slice(0, 5).forEach((r, i) => {
    const pct = Math.round(r.rate * 100);
    const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    html += `<div class="rank-item">
      <div class="pos ${posClass}">${i+1}°</div>
      <div class="name">${escapeHtml(r.label)} <small style="color:#888">${escapeHtml(r.sub||'')}</small></div>
      <div class="pct" style="color: var(--green-dark)">${pct}%</div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  });
  html += `</div></div>`;

  html += `<div class="rank-card worst"><h3>PRECISAM DE ATENÇÃO</h3><div class="rank-list">`;
  ranked.slice().reverse().slice(0, 5).forEach((r, i) => {
    const pct = Math.round(r.rate * 100);
    html += `<div class="rank-item">
      <div class="pos">${i+1}°</div>
      <div class="name">${escapeHtml(r.label)} <small style="color:#888">${escapeHtml(r.sub||'')}</small></div>
      <div class="pct" style="color: var(--red-dark)">${pct}%</div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  });
  html += `</div></div>`;
  html += `</div>`;

  view.innerHTML = html;

  // Wire the critical-analysis discipline filter
  const critFilter = document.getElementById('crit-disc-filter');
  if (critFilter) {
    critFilter.addEventListener('change', () => renderCritCards(turmas, critFilter.value));
  }
  renderCritCards(turmas, '__all__');
}

/* Render the critical-analysis cards, optionally restricted to one discipline */
function renderCritCards(turmas, discName) {
  const grid = document.getElementById('crit-grid');
  const hint = document.getElementById('crit-filter-hint');
  if (!grid) return;
  const filtered = discName && discName !== '__all__';

  let html = '';
  for (const t of turmas) {
    const di = filtered ? discIndexByName(t, discName) : null;
    // Turma doesn't have this discipline
    if (filtered && di < 0) {
      html += `
        <div class="crit-card na-card">
          <div class="crit-head">
            <div>
              <div class="name">${escapeHtml(t.label)}</div>
              <div class="sub">${escapeHtml(t.sub || '')}</div>
            </div>
          </div>
          <div class="na-msg">Disciplina não ofertada nesta turma</div>
        </div>`;
      continue;
    }

    const { counts, totalGrades, totalWithSemNota, aprov, reprov } = computeBands(t, filtered ? di : null);
    const semNota = (totalWithSemNota - totalGrades);

    const seg = (k) => {
      const val = counts[k] || 0;
      if (totalGrades === 0) return `<div class="crit-seg ${k} zero"></div>`;
      const pct = (val / totalGrades) * 100;
      return val > 0
        ? `<div class="crit-seg ${k}" style="flex: ${pct}" title="${val} (${pct.toFixed(1)}%)">${pct >= 8 ? val : ''}</div>`
        : `<div class="crit-seg ${k} zero"></div>`;
    };
    const legItem = (k, lbl) => {
      const val = counts[k] || 0;
      const pct = totalGrades > 0 ? (val / totalGrades) * 100 : 0;
      return `<div class="crit-leg-item ${k}">
        <div class="dot"></div>
        <div class="lab">${lbl}</div>
        <div class="num">${val}</div>
        <div class="pct">${pct.toFixed(0)}%</div>
      </div>`;
    };

    const apPct = totalGrades > 0 ? (aprov / totalGrades) * 100 : 0;
    const rpPct = totalGrades > 0 ? (reprov / totalGrades) * 100 : 0;

    const countLabel = filtered
      ? `${totalGrades} C/ NOTA`
      : `${t.total || (t.students||[]).length} ALUNOS`;

    html += `
      <div class="crit-card">
        <div class="crit-head">
          <div>
            <div class="name">${escapeHtml(t.label)}</div>
            <div class="sub">${escapeHtml(t.sub || '')}</div>
          </div>
          <div class="count">${countLabel}</div>
        </div>
        <div class="ap-rp">
          <div class="ap-rp-item ap">
            <div class="arl">APROVADOS <span>(≥5)</span></div>
            <div class="arv">${apPct.toFixed(0)}<small>%</small></div>
            <div class="arn">${aprov} ${filtered ? 'c/ nota' : 'alunos'}</div>
          </div>
          <div class="ap-rp-item rp">
            <div class="arl">REPROVADOS <span>(&lt;5)</span></div>
            <div class="arv">${rpPct.toFixed(0)}<small>%</small></div>
            <div class="arn">${reprov} ${filtered ? 'c/ nota' : 'alunos'}</div>
          </div>
        </div>
        <div class="crit-bar">
          ${seg('critico')}${seg('melhorar')}${seg('esperado')}${seg('superou')}
        </div>
        <div class="crit-legend">
          ${legItem('critico', 'Crítico (<3)')}
          ${legItem('melhorar', 'Pode Melhorar (3–5)')}
          ${legItem('esperado', 'Esperado (5–7)')}
          ${legItem('superou', 'Superou (≥7)')}
        </div>
        ${semNota > 0 ? `<div class="crit-semnota">${semNota} sem nota lançada</div>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;

  if (hint) {
    hint.textContent = filtered ? `Faróis recalculados só para ${discName}` : 'Faróis somando todas as disciplinas';
  }
}

function shortTurmaLabel(t) {
  // "1°ANO A INTEGRAL" → "1°A"
  const m = (t.label || '').match(/^(\d°)\s*ANO\s*([A-Z]?)/);
  if (!m) return t.label;
  let s = m[1] + (m[2] || '');
  if (/ADM/i.test(t.sub) || /ADM/i.test(t.label)) s += ' ADM';
  else if (/ANEXO/i.test(t.sub)) s += ' ANX';
  else if (/VESP/i.test(t.sub)) s += ' VESP';
  return s;
}

render();
