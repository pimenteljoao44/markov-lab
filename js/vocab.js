// Vocabulário do modelo: a interface fala a língua do problema de quem está usando.
// "1 bolinha = 1 cliente" e "1 passo = 1 mês" deixam de ser jargão e viram o assunto da pessoa.
import { escapeHtml } from './util.js';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Plural simples em português, suficiente para substantivos comuns ("mês" → "meses"). */
export function pluralPt(word) {
  const w = String(word).trim();
  if (!w) return w;
  const lower = w.toLowerCase();
  if (lower.endsWith('ês')) return `${w.slice(0, -2)}eses`;
  if (lower.endsWith('ão')) return `${w.slice(0, -2)}ões`;
  if (lower.endsWith('m')) return `${w.slice(0, -1)}ns`;
  if (lower.endsWith('al') || lower.endsWith('el') || lower.endsWith('ol') || lower.endsWith('ul')) return `${w.slice(0, -1)}is`;
  if (lower.endsWith('il')) return `${w.slice(0, -1)}s`;
  if (/[rz]$/.test(lower)) return `${w}es`;
  if (lower.endsWith('s')) return w;
  return `${w}s`;
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
