// Do dado para o modelo: estima a matriz contando transições observadas,
// ou lê uma tabela colada de uma planilha.
import { normalizeRow, parseProb, MAX_STATES } from '../util.js';

const ARROW = /->|→|>/;
const stripQuotes = (c) => c.trim().replace(/^"(.*)"$/, '$1').trim();

/** Divide por um separador de um caractere, sem cortar o que está entre aspas. */
function splitQuoted(line, sep) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted;
      cur += ch;
    } else if (ch === sep && !quoted) {
      out.push(stripQuotes(cur));
      cur = '';
    } else cur += ch;
  }
  out.push(stripQuotes(cur));
  return out;
}

/** Células de uma linha, preservando as vazias. */
function splitLine(line) {
  if (ARROW.test(line)) return line.split(ARROW).map(stripQuotes);
  const sep = ['\t', ';', '|', ','].find((c) => line.includes(c));
  return sep ? splitQuoted(line, sep) : [stripQuotes(line)];
}

/**
 * Trechos contínuos de uma linha. Uma célula vazia no meio é um período sem observação:
 * ligar as pontas criaria uma transição que ninguém viu.
 */
function runsOf(cells) {
  const runs = [];
  let cur = [];
  for (const c of cells) {
    if (c) cur.push(c);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs;
}

function sequencesOf(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { sequences: [], gaps: 0 };
  const hasSep = lines.some((l) => ARROW.test(l) || /[,;\t|]/.test(l));
  if (hasSep) {
    const perLine = lines.map((l) => runsOf(splitLine(l)));
    return { sequences: perLine.flat(), gaps: perLine.reduce((n, runs) => n + Math.max(0, runs.length - 1), 0) };
  }
  const clean = (arr) => arr.map((t) => t.trim()).filter(Boolean);
  if (lines.some((l) => /\s/.test(l))) {
    // Linhas de uma palavra misturadas com linhas de várias: é uma coluna com nomes compostos ("Em dia").
    const words = lines.map((l) => l.split(/\s+/).length);
    if (words.includes(1)) return { sequences: [lines], gaps: 0 };
    return { sequences: lines.map((l) => clean(l.split(/\s+/))), gaps: 0 };
  }
  if (lines.length > 1) return { sequences: [lines], gaps: 0 };
  return { sequences: [[...lines[0]]], gaps: 0 };
}

/**
 * Entende vários formatos de histórico:
 *  - uma sequência por linha, com separador: "Ativo, Ativo, Pausado" ou "A -> B -> C"
 *  - uma coluna de planilha: um estado por linha (vira uma sequência só)
 *  - sequência compacta numa linha: "AABBAC"
 *  - uma lista de pares "De, Para" (cada linha é uma sequência de 2)
 * Para CSV com colunas (cliente, mês, estado), use readHistory.
 */
export const parseSequences = (text) => sequencesOf(text).sequences;

// ── Tabelas de histórico: cabeçalho, colunas e ordem

const NAME_END = '([ _-].*)?$';
const ID_NAME = new RegExp(`^(id|ids|cod|codigo|código|code|cliente|customer|user|usuario|usuário|aluno|paciente|pessoa|conta|matricula|matrícula|cpf|cnpj|nome|name|item|peca|peça|maquina|máquina|contrato|pedido)${NAME_END}|[ _-]id$`, 'i');
const TIME_NAME = new RegExp(`^(data|date|dt|mes|mês|month|ano|year|dia|day|semana|week|trimestre|semestre|periodo|período|period|tempo|time|timestamp|ordem|order|passo|step|rodada|round|seq|sequencia|sequência|t)${NAME_END}`, 'i');
const STATE_NAME = new RegExp(`^(estado|state|status|situacao|situação|fase|etapa|stage|categoria|category|classe|class|condicao|condição)${NAME_END}`, 'i');

// A palavra inteira precisa ser um mês: "Novo" e "Outros" são estados, não novembro e outubro.
const MONTHS = [
  ['jan', 'janeiro', 'january'], ['fev', 'feb', 'fevereiro', 'february'], ['mar', 'marco', 'março', 'march'],
  ['abr', 'apr', 'abril', 'april'], ['mai', 'may', 'maio'], ['jun', 'junho', 'june'], ['jul', 'julho', 'july'],
  ['ago', 'aug', 'agosto', 'august'], ['set', 'sep', 'setembro', 'september'], ['out', 'oct', 'outubro', 'october'],
  ['nov', 'novembro', 'november'], ['dez', 'dec', 'dezembro', 'december'],
];
const monthIndex = (word) => MONTHS.findIndex((names) => names.includes(word));
const fullYear = (y) => (y.length === 2 ? 2000 + +y : +y);
const isPlainNumber = (v) => /^-?\d+([.,]\d+)?$/.test(v.trim());
const isMonthName = (v) => monthIndex(v.trim().toLowerCase()) >= 0;

/** Valor numérico para ordenar uma célula de tempo. Sem ano ("jan") não dá para ordenar: dezembro vem antes de janeiro? */
export function timeKey(raw) {
  const v = raw.trim().toLowerCase();
  if (isPlainNumber(v)) return parseFloat(v.replace(',', '.'));
  let m;
  if ((m = v.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/))) {
    const full = Date.parse(raw.trim().replace(' ', 'T'));
    return Number.isFinite(full) ? full : Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1));
  }
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})/))) return Date.UTC(fullYear(m[3]), +m[2] - 1, +m[1]);
  if ((m = v.match(/^(\d{1,2})\/(\d{4})$/))) return Date.UTC(+m[2], +m[1] - 1, 1);
  if ((m = v.match(/^([a-zç]{3,9})[\s/.-]*(\d{2}|\d{4})$/)) && monthIndex(m[1]) >= 0) return Date.UTC(fullYear(m[2]), monthIndex(m[1]), 1);
  return null;
}

const isDateLike = (v) => isMonthName(v) || (timeKey(v) !== null && !isPlainNumber(v));

/** Adivinha como ler a tabela. Sempre devolve um palpite completo: a pessoa pode trocar qualquer parte. */
function detectColumns(rows) {
  const k = rows[0].length;
  const low = (c) => c.trim().toLowerCase();
  const [first, ...rest] = rows;
  const seenBelow = new Set(rest.flat().map(low));
  const distinct = first.every((c) => c) && new Set(first.map(low)).size === k;
  const named = first.some((c) => ID_NAME.test(c) || TIME_NAME.test(c) || STATE_NAME.test(c) || isDateLike(c));
  // Data ou número em cima de datas ou números é a primeira linha de dados, não um título.
  const looksLikeData = first.some((c, i) => [isDateLike, isPlainNumber].some((test) => test(c) && rest.every((r) => !r[i] || test(r[i]))));
  const header = distinct && !looksLikeData && !first.some((c) => seenBelow.has(low(c))) && (named || rest.length >= 2);

  const body = header ? rest : rows;
  const names = header ? first : first.map(() => '');
  const values = names.map((_, c) => body.map((r) => r[c]).filter(Boolean));
  const sets = values.map((vals) => new Set(vals.map(low)));
  const every = (c, test) => values[c].length > 0 && values[c].every(test);
  const shares = (a, b) => [...sets[a]].filter((x) => sets[b].has(x)).length / Math.max(1, Math.min(sets[a].size, sets[b].size)) >= 0.3;
  const all = names.map((_, c) => c);

  const byName = (re) => all.findIndex((c) => re.test(names[c]));
  const dated = all.filter((c) => every(c, isDateLike));
  const numeric = all.filter((c) => every(c, isPlainNumber));
  const textual = all.filter((c) => !dated.includes(c) && !numeric.includes(c));

  // Palpite para "uma observação por linha": estado é o último texto, quem é vem antes, quando é a data.
  let state = byName(STATE_NAME);
  if (state < 0) state = textual.length ? textual[textual.length - 1] : k - 1;
  let time = byName(TIME_NAME);
  if (time < 0) time = dated[0] ?? -1;
  let id = byName(ID_NAME);
  if (id < 0) id = all.find((c) => c !== state && c !== time) ?? -1;
  if (time < 0) time = numeric.find((c) => c !== id && c !== state) ?? -1;
  // Número sem repetição não identifica ninguém: é a ordem das observações de um item só.
  if (time < 0 && byName(ID_NAME) < 0 && numeric.includes(id) && sets[id].size === values[id].length) [time, id] = [id, -1];

  // Palpite para "uma sequência por linha": a primeira coluna pode ser só identificação.
  const linked = (c) => all.some((o) => o !== c && shares(c, o));
  const skip = k >= 3 && !linked(0) && all.slice(1).every(linked) ? 0 : -1;

  // Colunas de estados compartilham o vocabulário; id, data e estado não têm nada em comum.
  const textLinked = textual.some((c) => textual.some((o) => o !== c && shares(c, o)));
  const hasEvidence = dated.length > 0 || numeric.length > 0;
  const long = byName(STATE_NAME) >= 0 || (!textLinked && textual.length > 0 && hasEvidence);

  return { header, format: long ? 'long' : 'sequences', id, time, state, skip };
}

const DAY = 86400000;

/**
 * Datas viram contagem de períodos, para dois meses seguidos estarem a 1 de distância
 * (e não a 28, 30 ou 31 dias). Números e datas com hora ficam como estão.
 */
function toPeriods(keys, dated) {
  const known = keys.filter((k) => k !== null);
  if (!dated || !known.length || !known.every((k) => k % DAY === 0)) return keys;
  const monthly = known.every((k) => new Date(k).getUTCDate() === 1);
  return keys.map((k) => {
    if (k === null) return null;
    if (!monthly) return k / DAY;
    const d = new Date(k);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  });
}

/** O passo mais comum entre observações seguidas de um mesmo item. É "regular" quando quase todos são ele. */
function cadenceOf(groups) {
  const counts = new Map();
  let total = 0;
  for (const g of groups) {
    for (let i = 1; i < g.length; i++) {
      const step = g[i].key - g[i - 1].key;
      if (step > 0) {
        counts.set(step, (counts.get(step) || 0) + 1);
        total++;
      }
    }
  }
  let step = 0;
  let best = 0;
  for (const [s, n] of counts) {
    if (n > best || (n === best && s < step)) [step, best] = [s, n];
  }
  return { step, regular: total >= 3 && best / total >= 0.6 };
}

function longToSequences(body, { id, time, state, splitGaps }) {
  const groups = new Map();
  const raw = time >= 0 ? body.map((row) => row[time]) : [];
  const dated = time >= 0 && raw.every((c) => !c || (timeKey(c) !== null && !isPlainNumber(c)));
  const periods = time >= 0 ? toPeriods(raw.map((c) => (c ? timeKey(c) : null)), dated) : [];
  body.forEach((row, order) => {
    const key = id >= 0 ? row[id] : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ state: row[state], key: time >= 0 ? periods[order] : null, order });
  });
  const list = [...groups.values()];
  const sortable = time >= 0 && list.every((g) => g.every((o) => o.key !== null));
  if (sortable) for (const g of list) g.sort((a, b) => a.key - b.key || a.order - b.order);
  const cadence = sortable ? cadenceOf(list) : { step: 0, regular: false };
  // Sem ritmo regular não há como saber o que é "um período a menos": só corta quando a pessoa pede.
  const canSplit = sortable && cadence.step > 0;
  const split = canSplit && (splitGaps ?? cadence.regular);

  let gaps = 0; // células de estado vazias
  let skipped = 0; // períodos inteiros sem nenhuma linha
  const sequences = list.flatMap((g) => {
    const runs = [];
    let cur = [];
    let last = null;
    let cuts = 0;
    const flush = () => {
      if (cur.length) runs.push(cur);
      cur = [];
    };
    for (const o of g) {
      if (!o.state) {
        flush();
        last = null;
        continue;
      }
      if (split && last !== null && o.key - last > cadence.step * 1.5) {
        flush();
        cuts++;
      }
      cur.push(o.state);
      last = o.key;
    }
    flush();
    skipped += cuts;
    gaps += Math.max(0, runs.length - 1 - cuts);
    return runs;
  });
  return { sequences, gaps, skipped, sortable, canSplit, split };
}

const plural = (n, one, many) => (n === 1 ? one : many);

/**
 * Lê um histórico colado ou aberto de arquivo. `opts` corrige o que foi detectado:
 * { header, format: 'sequences'|'long', id, time, state, skip }, com índices de coluna (-1 = nenhuma).
 */
export function readHistory(text, opts = {}) {
  const clean = String(text).replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  const anySep = lines.some((l) => ARROW.test(l) || /[,;\t|]/.test(l));
  const rows = anySep ? lines.map(splitLine) : lines.map((l) => l.trim().split(/\s+/));
  const k = rows[0]?.length ?? 0;
  const isTable = rows.length >= 2 && k >= 2 && rows.every((r) => r.length === k) && !lines.some((l) => ARROW.test(l));
  const gapNote = (n) => (n ? [`${n} ${plural(n, 'célula vazia', 'células vazias')} no meio das sequências: não contei transição através delas.`] : []);

  if (!isTable) {
    const { sequences, gaps } = sequencesOf(clean);
    return { sequences, table: false, gaps, notes: gapNote(gaps) };
  }

  const o = { ...detectColumns(rows), ...opts };
  const body = o.header ? rows.slice(1) : rows;
  const columns = rows[0].map((c, i) => (o.header ? c || `Coluna ${i + 1}` : `Coluna ${i + 1} (${c || 'vazia'})`));
  const notes = o.header ? [`Usei a primeira linha como cabeçalho: ${rows[0].join(', ')}.`] : [];

  let sequences;
  let gaps;
  let canSplit = false;
  let splitGaps = false;
  if (o.format === 'long') {
    const res = longToSequences(body, o);
    ({ sequences, gaps, canSplit } = res);
    splitGaps = res.split;
    if (res.skipped) notes.push(`${res.skipped} ${plural(res.skipped, 'período sem registro', 'períodos sem registro')} no meio do histórico de algum item: não contei transição ${res.skipped === 1 ? 'através dele' : 'através deles'}.`);
    const who = o.id >= 0 ? `“${columns[o.id]}”` : 'um item só';
    const when = o.time >= 0 ? `“${columns[o.time]}”` : 'a ordem das linhas';
    notes.push(`Li uma observação por linha. Quem é: ${who}. Quando: ${when}. Estado: “${columns[o.state]}”.`);
    if (o.time >= 0 && !res.sortable) notes.push(`Não dá para ordenar por “${columns[o.time]}” (falta o ano ou o formato é desconhecido): mantive a ordem das linhas.`);
    const ignored = columns.filter((_, c) => c !== o.id && c !== o.time && c !== o.state);
    if (ignored.length) notes.push(`Ignorei ${plural(ignored.length, 'a coluna', 'as colunas')}: ${ignored.join(', ')}.`);
  } else {
    const perRow = body.map((r) => runsOf(r.filter((_, c) => c !== o.skip)));
    sequences = perRow.flat();
    gaps = perRow.reduce((n, runs) => n + Math.max(0, runs.length - 1), 0);
    if (o.skip >= 0) notes.push(`Ignorei a coluna “${columns[o.skip]}”: ela identifica a linha, não é um estado.`);
  }
  notes.push(...gapNote(gaps));
  return { sequences, table: true, format: o.format, header: o.header, columns, id: o.id, time: o.time, state: o.state, skip: o.skip, gaps, canSplit, splitGaps, notes };
}

/** "ativo", "Ativo" e "ATIVO" são o mesmo estado: fica a grafia mais comum (na dúvida, a primeira). */
function unifySpellings(sequences) {
  const spellings = new Map();
  const keyOf = (t) => String(t).trim().replace(/\s+/g, ' ').toLowerCase();
  for (const seq of sequences) {
    for (const t of seq) {
      const key = keyOf(t);
      if (!spellings.has(key)) spellings.set(key, new Map());
      const seen = spellings.get(key);
      seen.set(t, (seen.get(t) || 0) + 1);
    }
  }
  const best = new Map();
  const respelled = [];
  for (const [key, seen] of spellings) {
    const label = [...seen.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    best.set(key, label);
    if (seen.size > 1) respelled.push({ label, variants: [...seen.keys()] });
  }
  return { sequences: sequences.map((seq) => seq.map((t) => best.get(keyOf(t)))), respelled };
}

/** Conta transições e estima P̂ᵢⱼ = nᵢⱼ / Σₖ nᵢₖ (máxima verossimilhança). */
export function estimateChain(rawSequences, { maxStates = MAX_STATES } = {}) {
  const { sequences, respelled } = unifySpellings(rawSequences);
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
  return { labels: labels.map((l) => String(l).slice(0, 24)), counts, matrix, transitions, merged, noExit, respelled };
}

// Um valor negativo também é número: ele vira erro explicado, nunca nome de coluna.
const isNumber = (c) => c !== '' && (parseProb(c) !== null || /^-\s*[\d.,]/.test(c));

/** Decide como separar as colunas. A vírgula pode ser separador ou decimal: "0,5 0,5" é diferente de "0.5,0.5". */
function tableSplitter(lines) {
  const all = lines.join('\n');
  if (all.includes('\t')) return (l) => splitQuoted(l, '\t');
  if (all.includes(';')) return (l) => splitQuoted(l, ';');
  const bare = all.replace(/"[^"]*"/g, 'x'); // vírgula dentro de aspas é conteúdo
  if (!bare.includes(',')) return (l) => l.trim().split(/\s+/).map(stripQuotes);
  if (lines.every((l) => /,\s/.test(l))) return (l) => l.trim().split(/,\s+/).map((c) => stripQuotes(c.replace(/,$/, '')));
  const decimalOnly = !/(^|[^\d]),|,([^\d]|$)/m.test(bare) && lines.every((l) => /\s/.test(l.trim()));
  return decimalOnly ? (l) => l.trim().split(/\s+/).map(stripQuotes) : (l) => splitQuoted(l, ',');
}

/** Lê uma tabela colada: com ou sem nomes na primeira linha e na primeira coluna. */
export function parseTable(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('Cole pelo menos 2 linhas: uma para cada estado.');
  const split = tableSplitter(lines);
  let rows = lines.map(split);

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
      if (v === null && isNumber(c)) throw new Error(`O valor "${c}" na linha ${i + 1}, coluna ${j + 1} é negativo: chances e contagens não podem ser negativas.`);
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
