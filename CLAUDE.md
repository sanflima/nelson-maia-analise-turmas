# Projeto: Análise das Turmas — Colégio Estadual Nelson Maia

## Visão Geral

Sistema de dashboard educacional para o **Colégio Estadual Nelson Maia** (Ponto Novo - BA, NTE-25).
Permite visualizar, analisar e comparar o desempenho das turmas por disciplina, gênero e faixas de nota.
Totalmente client-side (HTML + JS puro, sem backend), roda direto no navegador.

---

## Estrutura de Arquivos

```
Analise das turmas/
├── index.html                     # Página principal — dashboard por turma
├── Comparação entre Turmas.html   # Página de comparação entre turmas / anos
├── dashboard.js                   # Lógica do dashboard (state, render, PDF import)
├── comparison.js                  # Lógica da comparação (bandas, heatmap, ranking)
├── preset-turmas.js               # Dados pré-carregados de todas as turmas (PRESET_TURMAS)
├── assets/
│   └── logo-nm.png                # Logotipo do colégio
├── data/
│   ├── turmas-parsed.json         # JSON bruto das turmas parseadas dos PDFs
│   ├── 1a-int.pdf … 1e-int.pdf   # Boletins 1º ano A–E (Integral)
│   ├── 1-adm.pdf                  # 1º ano ADM
│   ├── 1-anx-a.pdf / 1-anx-b.pdf # 1º ano Anexo A e B
│   ├── 2-ano.pdf                  # 2º ano
│   ├── 3a-integral.pdf … 3c-integral.pdf  # 3º ano A–C (Integral)
│   ├── 3-vespertino.pdf           # 3º ano Vespertino
│   └── 3-anexo-a.pdf              # 3º ano Anexo A
├── uploads/                       # Cópias dos PDFs com nomes legíveis + imagens enviadas
└── screenshots/                   # Prints das telas do dashboard para referência
```

---

## Turmas Cadastradas (`PRESET_TURMAS`)

| Chave        | Label        | Modalidade    |
|-------------|--------------|---------------|
| `1a-int`    | 1°ANO A      | INTEGRAL      |
| `1b-int`    | 1°ANO B      | INTEGRAL      |
| `1c-int`    | 1°ANO C      | INTEGRAL      |
| `1d-int`    | 1°ANO D      | INTEGRAL      |
| `1e-int`    | 1°ANO E      | INTEGRAL      |
| `1-adm`     | 1°ANO        | ADM           |
| `1-anx-a`   | 1°ANO        | ANEXO A       |
| `1-anx-b`   | 1°ANO        | ANEXO B       |
| `2-ano`     | 2°ANO        | (vespertino?) |
| `3a-int`    | 3°ANO A      | INTEGRAL      |
| `3b-int`    | 3°ANO B      | INTEGRAL      |
| `3c-int`    | 3°ANO C      | INTEGRAL      |
| `3-vesp`    | 3°ANO        | VESPERTINO    |
| `3-anx-a`   | 3°ANO        | ANEXO A       |

---

## Arquitetura Técnica

### `preset-turmas.js`
- Define `window.PRESET_TURMAS` — objeto com todas as turmas parseadas dos PDFs.
- Cada turma contém: `label`, `sub`, `nte`, `total`, `serie`, `turmaCode`, `disciplinas[]`, `gender{}`, `students[]`.
- `disciplinas[i]`: `{ nome, ap, rp, apF, apM, rpF, rpM }` — aprovados/reprovados por gênero.
- `students[i]`: `{ idx, name, gender, g[] }` — array de notas por disciplina.

### `dashboard.js`
- `STORE_KEY = "nelson-maia-dashboard-v6"` — chave do localStorage.
- `buildDefaultState()` — inicializa o estado a partir de `PRESET_TURMAS`.
- `loadState()` / `saveState()` — persistência no localStorage; merge automático de novas turmas.
- Suporte a import de PDF (extração de dados diretamente no browser).
- Filtros: por disciplina, por gênero (F/M/todos).
- Gráficos de barras (aprovados × reprovados), cards de percentual, tabela de alunos com notas individuais.

### `comparison.js`
- Agrupa turmas por ano (`groupTurmasByYear()`).
- Bandas de desempenho: **CRÍTICO** (< 3), **PODE MELHORAR** (3–5), **ESPERADO** (5–7), **SUPEROU** (≥ 7).
- `computeBands(turma, discIndex)` — calcula distribuição de faixas por turma/disciplina ou por média do aluno (`discIndex = null` → TODAS).
- Visualizações: heatmap de disciplinas, ranking de turmas, comparativo por faixa, filtro por ano.

---

## Identidade Visual

- Cores principais: verde escuro (`#2f5d27`), azul (`#1d4fa3`), vermelho (`#e21f25`), laranja (`#d96b1f`).
- Fonte: Inter / Segoe UI; títulos: Arial Black / Impact.
- Fundo: `#ebebeb`; cartões com borda `3px solid #1a1a1a` e sombra.

---

## Notas Operacionais

- Não há servidor: tudo roda abrindo os `.html` diretamente no navegador.
- Os dados persistem no `localStorage` do browser (chave `nelson-maia-dashboard-v6`).
- Para adicionar uma nova turma: parsear o PDF → adicionar entrada em `preset-turmas.js`.
- O `data/turmas-parsed.json` é o JSON intermediário gerado pelo parser de PDFs antes de ser inserido no preset.
