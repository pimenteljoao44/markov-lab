// Construção e validação de cadeias. Tudo que entra por arquivo, link ou colagem passa por aqui.
import { PALETTE, MAX_STATES, autoLayout } from '../util.js';
import { sanitizeMeta } from '../vocab.js';

let seq = 0;

/** Monta uma cadeia a partir de nomes e matriz. */
export function makeChain(labels, matrix, { meta = {}, colors, pos } = {}) {
  const layout = pos || autoLayout(labels.length);
  const prefix = `m${Date.now().toString(36)}${seq++}`;
  return {
    meta: sanitizeMeta(meta),
    states: labels.map((label, i) => ({
      id: `${prefix}_${i}`,
      label,
      color: colors?.[i] || PALETTE[i % PALETTE.length],
      x: layout[i].x,
      y: layout[i].y,
    })),
    matrix: matrix.map((r) => r.slice()),
  };
}

/** Valida uma cadeia importada (JSON/URL). Lança erro com mensagem que diz como corrigir. */
export function sanitizeChain(obj) {
  if (!obj || !Array.isArray(obj.states) || !Array.isArray(obj.matrix)) {
    throw new Error('O arquivo precisa ter os campos "states" e "matrix".');
  }
  const n = obj.states.length;
  if (n < 2 || n > MAX_STATES) throw new Error(`O modelo precisa ter de 2 a ${MAX_STATES} estados; este tem ${n}.`);
  if (obj.matrix.length !== n || obj.matrix.some((r) => !Array.isArray(r) || r.length !== n)) {
    throw new Error(`A matriz precisa ter ${n} linhas e ${n} colunas, uma para cada estado.`);
  }
  const layout = autoLayout(n);
  const used = new Set();
  const ok01 = (v) => Number.isFinite(v) && v >= 0 && v <= 1;
  const states = obj.states.map((s, i) => {
    let id = String(s?.id ?? `s${i}`).slice(0, 32);
    while (used.has(id)) id += '_';
    used.add(id);
    return {
      id,
      label: String(s?.label ?? `Estado ${i + 1}`).slice(0, 24) || `Estado ${i + 1}`,
      color: /^#[0-9a-f]{6}$/i.test(s?.color) ? s.color : PALETTE[i % PALETTE.length],
      x: ok01(s?.x) ? s.x : layout[i].x,
      y: ok01(s?.y) ? s.y : layout[i].y,
    };
  });
  const matrix = obj.matrix.map((r) => r.map((v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0)));
  return { meta: sanitizeMeta(obj.meta), states, matrix };
}
