// Vocabulário do modelo: a interface fala a língua do problema de quem está usando.
// "1 bolinha = 1 cliente" e "1 passo = 1 mês" deixam de ser jargão e viram o assunto da pessoa.
import { escapeHtml } from './util.js';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Palavras em -ão que não fazem o plural em -ões. A lista cobre o que costuma virar unidade de um modelo.
const AO_ENDINGS = { mão: 'ãos', irmão: 'ãos', cidadão: 'ãos', órgão: 'ãos', grão: 'ãos', pão: 'ães', cão: 'ães', alemão: 'ães', capitão: 'ães' };
// Palavras de ligação: em "ordem de produção", só o que vem antes delas vai para o plural.
const LINKING = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'por', 'para', 'com', 'sem', 'a', 'ao', 'à']);
const ACCENT = /[áéíóúâêô]/;

function pluralWord(w) {
  const lower = w.toLowerCase();
  const stem = (cut, ending) => `${w.slice(0, -cut)}${ending}`;
  if (lower.endsWith('ês')) return stem(2, 'eses');
  if (lower.endsWith('ás')) return stem(2, 'ases');
  if (lower.endsWith('ís')) return `${w}es`;
  if (lower.endsWith('ão')) return stem(2, AO_ENDINGS[lower] || 'ões');
  if (lower.endsWith('m')) return stem(1, 'ns');
  // Com acento em outra sílaba ("nível", "útil"), a terminação não leva acento; sem ele, leva ("papel" → "papéis").
  const stressedElsewhere = ACCENT.test(lower.slice(0, -2));
  if (lower.endsWith('el')) return stem(2, stressedElsewhere ? 'eis' : 'éis');
  if (lower.endsWith('ol')) return stem(2, stressedElsewhere ? 'ois' : 'óis');
  if (lower.endsWith('il')) return stem(2, stressedElsewhere ? 'eis' : 'is');
  if (lower.endsWith('al') || lower.endsWith('ul')) return stem(1, 'is');
  if (/[rz]$/.test(lower)) return `${w}es`;
  if (/[sx]$/.test(lower)) return w;
  return `${w}s`;
}

/**
 * Plural em português para substantivos comuns e nomes compostos:
 * "mês" → "meses", "cliente ativo" → "clientes ativos", "ordem de produção" → "ordens de produção".
 */
export function pluralPt(word) {
  const words = String(word).trim().split(/\s+/).filter(Boolean);
  const stop = words.findIndex((w) => LINKING.has(w.toLowerCase()));
  const upTo = stop < 0 ? words.length : stop;
  return words.map((w, i) => (i < upTo ? pluralWord(w) : w)).join(' ');
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Valida os metadados vindos de arquivo ou link; nunca confia na origem. */
export function sanitizeMeta(m = {}) {
  const unit = text(m.unit, 24);
  const step = text(m.step, 24);
  return {
    title: text(m.title, 60) || 'Modelo sem nome',
    about: text(m.about, 240),
    question: text(m.question, 160),
    unit: unit || 'bolinha',
    units: text(m.units, 26) || (unit ? pluralPt(unit) : 'bolinhas'),
    step: step || 'passo',
    steps: text(m.steps, 26) || (step ? pluralPt(step) : 'passos'),
    custom: m.custom === true,
  };
}

/** Vocabulário em texto puro (quem renderiza escapa). */
export function vocab(chain) {
  const m = sanitizeMeta(chain.meta);
  return {
    ...m,
    Unit: cap(m.unit),
    Units: cap(m.units),
    Step: cap(m.step),
    lab: (i) => chain.states[i]?.label ?? '?',
  };
}

/** Vocabulário já escapado, para montar HTML dos balões e painéis. */
export function htmlVocab(chain) {
  const v = vocab(chain);
  const out = {};
  for (const k of ['title', 'about', 'question', 'unit', 'units', 'step', 'steps', 'Unit', 'Units', 'Step']) out[k] = escapeHtml(v[k]);
  out.lab = (i) => escapeHtml(v.lab(i));
  out.b = (i) => `<b>${escapeHtml(v.lab(i))}</b>`;
  return out;
}
