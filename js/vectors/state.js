// Estado do laboratório "Vetores e similaridade": o que a pessoa edita, o que é calculado e o salvamento.
import { createStore } from '../platform/tinyStore.js';
import { clamp } from '../util.js';
import { DOCS, METRICS, dot, norm, cosine, angleDegrees, isZero, rank, topOf } from './engine.js';

export const VEC_KEY = 'vectorlab:v1';
/** O plano vai de −LIMIT a +LIMIT nos dois eixos. */
export const LIMIT = 5;
export const MODES = ['pair', 'search'];
// A consulta padrão fala de manutenção: cosseno e produto escalar concordam nela, então os desafios de
// "quando os métodos discordam" e de "achar o boleto" não nascem resolvidos.
export const DEFAULTS = { mode: 'pair', a: [3, 1], b: [1, 3], q: [-3, 0.5], metric: 'cosine' };

/** Uma casa decimal e dentro do plano: números redondos para conferir de cabeça. */
export const snap = (v) => Math.round(clamp(v, -LIMIT, LIMIT) * 10) / 10;

/** Aceita só uma lista de dois números: salvamento antigo ou editado à mão não pode quebrar a página. */
export function sanitizeVector(raw, fallback) {
  const ok = Array.isArray(raw) && raw.length === 2 && raw.every((v) => typeof v === 'number' && Number.isFinite(v));
  return ok ? raw.map(snap) : fallback.slice();
}

function loadSaved(storage) {
  try {
    return JSON.parse(storage.getItem(VEC_KEY)) || {};
  } catch {
    return {};
  }
}

function derive(s, tags) {
  const d = s.derived;
  d.pair = { dot: dot(s.a, s.b), na: norm(s.a), nb: norm(s.b), cos: cosine(s.a, s.b), angle: angleDegrees(s.a, s.b), zero: isZero(s.a) || isZero(s.b) };
  d.rank = rank(s.q, DOCS, s.metric);
  d.tops = Object.fromEntries(Object.keys(METRICS).map((m) => [m, topOf(s.q, DOCS, m)]));
  d.disagree = d.tops.cosine.id !== d.tops.dot.id;
  d.queryZero = isZero(s.q);
  tags.add('derived');
}

export function createVectorStore(storage = localStorage) {
  const saved = loadSaved(storage);
  const initial = {
    mode: MODES.includes(saved.mode) ? saved.mode : DEFAULTS.mode,
    a: sanitizeVector(saved.a, DEFAULTS.a),
    b: sanitizeVector(saved.b, DEFAULTS.b),
    q: sanitizeVector(saved.q, DEFAULTS.q),
    metric: METRICS[saved.metric] ? saved.metric : DEFAULTS.metric,
    challenges: {
      completed: Array.isArray(saved.completed) ? saved.completed.filter((x) => typeof x === 'string') : [],
      active: typeof saved.active === 'string' ? saved.active : null,
      hints: {},
    },
    derived: {},
  };
  const store = createStore(initial, derive);
  store.save = () => {
    const s = store.get();
    try {
      storage.setItem(VEC_KEY, JSON.stringify({ mode: s.mode, a: s.a, b: s.b, q: s.q, metric: s.metric, completed: s.challenges.completed, active: s.challenges.active }));
    } catch {
      /* armazenamento indisponível */
    }
  };
  return store;
}
