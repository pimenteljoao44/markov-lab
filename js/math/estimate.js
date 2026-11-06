// Do dado para o modelo: estima a matriz contando transições observadas,
// ou lê uma tabela colada de uma planilha.
import { normalizeRow, parseProb, MAX_STATES } from '../util.js';

/**
 * Entende vários formatos de histórico:
 *  - uma sequência por linha, com separador: "Ativo, Ativo, Pausado" ou "A -> B -> C"
 *  - uma coluna de planilha: um estado por linha (vira uma sequência só)
 *  - sequência compacta numa linha: "AABBAC"
 *  - uma lista de pares "De, Para" (cada linha é uma sequência de 2)
 */
export function parseSequences(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sep = /\s*(?:->|→|[,;\t|>])\s*/;
  const hasSep = lines.some((l) => sep.test(l));
  const clean = (arr) => arr.map((t) => t.trim()).filter(Boolean);
  if (hasSep) return lines.map((l) => clean(l.split(sep))).filter((s) => s.length);
  if (lines.some((l) => /\s/.test(l))) {
    // Linhas de uma palavra misturadas com linhas de várias: é uma coluna com nomes compostos ("Em dia").
    const words = lines.map((l) => l.split(/\s+/).length);
    if (words.includes(1)) return [lines];
    return lines.map((l) => clean(l.split(/\s+/)));
  }
  if (lines.length > 1) return [lines];
  return [[...lines[0]]];
}

/** Conta transições e estima P̂ᵢⱼ = nᵢⱼ / Σₖ nᵢₖ (máxima verossimilhança). */
export function estimateChain(sequences, { maxStates = MAX_STATES } = {}) {
  const freq = new Map();
  for (const seq of sequences) for (const t of seq) freq.set(t, (freq.get(t) || 0) + 1);

  // Estados demais: mantém os mais frequentes e junta o resto em "Outros".
  let merged = [];
  const keep = new Set(freq.keys());
  if (freq.size > maxStates) {
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    merged = sorted.slice(maxStates - 1).map(([t]) => t);
    merged.forEach((t) => keep.delete(t));
  }
  const nameOf = (t) => (keep.has(t) ? t : 'Outros');

  const labels = [];
  const index = new Map();
  const ensure = (name) => {
    if (!index.has(name)) {
      index.set(name, labels.length);
      labels.push(name);
    }
    return index.get(name);
  };
  for (const seq of sequences) for (const t of seq) ensure(nameOf(t));

  const n = labels.length;
  const counts = Array.from({ length: n }, () => new Array(n).fill(0));
  let transitions = 0;
  for (const seq of sequences) {
    for (let k = 0; k + 1 < seq.length; k++) {
      counts[index.get(nameOf(seq[k]))][index.get(nameOf(seq[k + 1]))]++;
      transitions++;
    }
  }

  const noExit = [];
  const matrix = counts.map((row, i) => {
    if (row.reduce((a, b) => a + b, 0) === 0) noExit.push(labels[i]);
    return normalizeRow(row, i);
  });
  return { labels: labels.map((l) => String(l).slice(0, 24)), counts, matrix, transitions, merged, noExit };
}

const isNumber = (c) => c !== '' && parseProb(c) !== null;

function splitter(lines) {
  const all = lines.join('\n');
  if (all.includes('\t')) return /\t/;
  if (all.includes(';')) return /;/;
  if (all.includes(',') && !lines.every((l) => l.trim().split(/\s+/).length >= 2)) return /,/;
  return /\s+/;
}

/** Lê uma tabela colada: com ou sem nomes na primeira linha e na primeira coluna. */
export function parseTable(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('Cole pelo menos 2 linhas: uma para cada estado.');
  const sep = splitter(lines);
  let rows = lines.map((l) => l.trim().split(sep).map((c) => c.trim().replace(/,$/, '')));

  let header = null;
  if (rows[0].some((c) => c !== '' && !isNumber(c))) {
    header = rows[0];
    rows = rows.slice(1);
  }
  let rowNames = null;
  if (rows.length && rows.every((r) => r.length > 0 && !isNumber(r[0]))) {
    rowNames = rows.map((r) => r[0]);
    rows = rows.map((r) => r.slice(1));
  }

  const n = rows.length;
  if (n < 2) throw new Error('A tabela precisa ter pelo menos 2 estados.');
  if (n > MAX_STATES) throw new Error(`A tabela tem ${n} estados; o limite é ${MAX_STATES}.`);
  rows.forEach((r, i) => {
    if (r.length !== n) throw new Error(`A linha ${i + 1} tem ${r.length} valores, mas a tabela tem ${n} estados. Ela precisa ser quadrada.`);
  });
  const raw = rows.map((r, i) =>
    r.map((c, j) => {
      const v = parseProb(c);
      if (v === null) throw new Error(`Não entendi o valor "${c}" na linha ${i + 1}, coluna ${j + 1}.`);
      return v;
    })
  );

  const names = rowNames || (header ? header.slice(-n) : null) || Array.from({ length: n }, (_, i) => `Estado ${i + 1}`);
  return {
    labels: names.map((l, i) => String(l).slice(0, 24) || `Estado ${i + 1}`),
    matrix: raw.map((r, i) => normalizeRow(r, i)),
    wasNormalized: raw.some((r) => Math.abs(r.reduce((a, b) => a + b, 0) - 1) > 1e-6),
  };
}
