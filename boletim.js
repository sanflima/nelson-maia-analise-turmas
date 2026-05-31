/* ===========================================================
   Boletim Bimestral · Nelson Maia
   Importa Excel por bimestre e exibe notas individuais dos alunos
=========================================================== */

const BIMESTRE_STORE_KEY = 'nelson-maia-bimestres-v1';

const BIMESTRE_LABELS = {
  '1':   '1° Bimestre',
  '2':   '2° Bimestre',
  '3':   '3° Bimestre',
  'rec': 'Recuperação',
  'mf':  'Média Final',
};

const BIMESTRE_ORDER = ['1', '2', '3', 'rec', 'mf'];

// Mapeamento: nome normalizado da aba Excel → chave da turma
const SHEET_TO_KEY = {
  '1 a integral':      '1a-int',
  '1 b integral':      '1b-int',
  '1 c integral':      '1c-int',
  '1 d integral':      '1d-int',
  '1 e integral':      '1e-int',
  '1 adm':             '1-adm',
  '1 tec administracao': '1-adm',
  '1 tec adm':         '1-adm',
  '1 tecnico administracao': '1-adm',
  '1 anexo a':         '1-anx-a',
  '1 anexo b':         '1-anx-b',
  '2 ano':             '2-ano',
  '2 ano anexo a':     '2-ano',
  '2 anexo a':         '2-ano',
  '3 a integral':      '3a-int',
  '3 b integral':      '3b-int',
  '3 c integral':      '3c-int',
  '3 vespertino':      '3-vesp',
  '3 ano vespertino':  '3-vesp',
  '3 anexo a':         '3-anx-a',
};

const TURMA_LABELS = {
  '1a-int':  '1°A Integral',
  '1b-int':  '1°B Integral',
  '1c-int':  '1°C Integral',
  '1d-int':  '1°D Integral',
  '1e-int':  '1°E Integral',
  '1-adm':   '1° ADM',
  '1-anx-a': '1° Anexo A',
  '1-anx-b': '1° Anexo B',
  '2-ano':   '2° Ano',
  '3a-int':  '3°A Integral',
  '3b-int':  '3°B Integral',
  '3c-int':  '3°C Integral',
  '3-vesp':  '3° Vespertino',
  '3-anx-a': '3° Anexo A',
};

const TURMA_ORDER = [
  '1a-int','1b-int','1c-int','1d-int','1e-int',
  '1-adm','1-anx-a','1-anx-b',
  '2-ano',
  '3a-int','3b-int','3c-int','3-vesp','3-anx-a',
];

// Estado global
let bState = { bimestres: {} };

function loadBState() {
  try {
    const raw = localStorage.getItem(BIMESTRE_STORE_KEY);
    if (raw) bState = JSON.parse(raw);
  } catch (e) {}
}

function saveBState() {
  try { localStorage.setItem(BIMESTRE_STORE_KEY, JSON.stringify(bState)); } catch (e) {}
}

function clearBState() {
  bState = { bimestres: {} };
  saveBState();
}

// Turmas que possuem dados em algum bimestre
function getAvailableTurmas() {
  const found = new Set();
  for (const bim of Object.values(bState.bimestres)) {
    for (const k of Object.keys(bim)) found.add(k);
  }
  return TURMA_ORDER.filter(k => found.has(k));
}

// Disciplinas da turma (primeiro bimestre disponível)
function getDisciplinas(turmaKey) {
  for (const bKey of BIMESTRE_ORDER) {
    const d = bState.bimestres[bKey]?.[turmaKey];
    if (d?.disciplinas?.length) return d.disciplinas;
  }
  return [];
}

// Lista de alunos da turma (base: primeiro bimestre disponível com dados)
function getStudentBase(turmaKey) {
  for (const bKey of BIMESTRE_ORDER) {
    const d = bState.bimestres[bKey]?.[turmaKey];
    if (d?.students?.length) return d.students;
  }
  return [];
}

// Nota de um aluno em um bimestre/disciplina específicos
function getGrade(bimKey, turmaKey, studentNum, discIdx) {
  const d = bState.bimestres[bimKey]?.[turmaKey];
  if (!d) return null;
  const st = d.students.find(s => s.num === studentNum);
  if (!st) return null;
  const v = st.grades[discIdx];
  return (v != null && v !== '') ? Number(v) : null;
}

// Calcula MF = média de B1, B2 e B3 (somente se os 3 estiverem disponíveis)
function computeMF(turmaKey, studentNum, discIdx) {
  // Se há dados importados de MF, usa eles
  const mfData = bState.bimestres['mf']?.[turmaKey];
  if (mfData) {
    const st = mfData.students.find(s => s.num === studentNum);
    if (st) return st.grades[discIdx] ?? null;
  }
  // Caso contrário, calcula média dos 3 bimestres
  const vals = ['1','2','3'].map(b => getGrade(b, turmaKey, studentNum, discIdx))
    .filter(v => v != null);
  if (vals.length < 3) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
}

// Normaliza nome de aba do Excel para lookup no mapa
function normalizeSheet(name) {
  return name.toLowerCase()
    .replace(/[ºª°]/g, '')
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function sheetToKey(name) {
  return SHEET_TO_KEY[normalizeSheet(name)] || null;
}

// Detecta a linha de cabeçalho da aba (onde Nº aparece na col A)
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const c = String(rows[i]?.[0] ?? '').trim();
    if (c === 'Nº' || c === 'N°' || c === 'Nº' || /^n[°º]/i.test(c)) return i;
  }
  return -1;
}

// Parseia uma aba do workbook → { disciplinas, students, warning }
function parseSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (!rows.length) return null;

  const hIdx = findHeaderRow(rows);
  if (hIdx === -1) return null;

  const headers = rows[hIdx];
  const disciplinas = headers.slice(3)
    .map(h => h ? String(h).replace(/\n/g, ' ').trim() : null)
    .filter(Boolean);

  // Aviso na linha acima do cabeçalho (quando há nota de observação)
  const warning = hIdx >= 2
    ? String(rows[hIdx - 1]?.[0] || '').replace(/^⚠\s*/, '').trim() || null
    : null;

  const students = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] == null || row[1] == null) continue;
    if (typeof row[0] !== 'number') continue;

    const grades = disciplinas.map((_, j) => {
      const v = row[3 + j];
      return (v != null && v !== '') ? Number(v) : null;
    });

    students.push({
      num: row[0],
      name: String(row[1]).trim(),
      gender: String(row[2] || '').trim(),
      grades,
    });
  }

  return { disciplinas, students, warning };
}

// Importa um arquivo Excel para um bimestre específico
async function importExcel(bimestre, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });

        if (!bState.bimestres[bimestre]) bState.bimestres[bimestre] = {};

        let imported = 0, skipped = 0;
        const details = [];

        for (const sheetName of wb.SheetNames) {
          const key = sheetToKey(sheetName);
          if (!key) { skipped++; continue; }

          const parsed = parseSheet(wb.Sheets[sheetName]);
          if (!parsed || !parsed.students.length) { skipped++; continue; }

          bState.bimestres[bimestre][key] = {
            disciplinas: parsed.disciplinas,
            students:    parsed.students,
            warning:     parsed.warning || null,
            fileName:    file.name,
            importedAt:  new Date().toISOString(),
          };
          imported++;
          details.push(`${sheetName} → ${TURMA_LABELS[key] || key}`);
        }

        saveBState();
        resolve({ imported, skipped, details });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Helpers de exibição ──────────────────────────────────────────────────────

function fmtGrade(v) {
  if (v == null) return '—';
  return v.toFixed(1);
}

function gradeClass(v) {
  if (v == null) return 'g-null';
  if (v >= 7)   return 'g-green';
  if (v >= 5)   return 'g-orange';
  if (v >= 3)   return 'g-yellow';
  return 'g-red';
}

function situacao(mf, rec) {
  if (mf == null) return { label: '—', cls: '' };
  if (mf >= 5)    return { label: 'Aprovado', cls: 'sit-ok' };
  // MF < 5: verificar recuperação
  if (rec != null) {
    const mfFinal = (mf + rec) / 2;
    if (mfFinal >= 5) return { label: 'Ap. Rec.', cls: 'sit-rec-ok' };
    return { label: 'Reprovado', cls: 'sit-rp' };
  }
  return { label: 'Em Rec.', cls: 'sit-rec' };
}
