// Tintas chapadas, legíveis sobre papel claro. Vermelho fica reservado para a "caneta" de correção.
export const PALETTE = [
  '#2F6BFF', '#F29E1F', '#13A87B', '#E8467C', '#7A5AF8',
  '#00A6C8', '#5B8C00', '#B5179E', '#FF7A00', '#3D5A80',
];

export const MAX_STATES = 10;

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Número com vírgula decimal (pt-BR). */
export const num = (v, digits = 3) => (Number.isFinite(v) ? v.toFixed(digits).replace('.', ',') : '—');

/** Probabilidade em decimal ("0,25") ou percentual ("25%"), sem zeros à direita. */
export function fmtP(v, mode = 'decimal') {
  if (!Number.isFinite(v)) return '—';
  if (mode === 'percent') return `${String(+(v * 100).toFixed(1)).replace('.', ',')}%`;
  return String(+v.toFixed(3)).replace('.', ',');
}

export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits).replace('.', ',')}%`;

/** Decimal para KaTeX com vírgula sem espaço extra: 0{,}8 */
export const texNum = (v, digits = 2) => String(+v.toFixed(digits)).replace('.', '{,}');

/** Aceita "0.5", "0,5", "50%", "1/3". Retorna null se inválido. */
export function parseProb(str) {
  const s = String(str).trim().replace(',', '.');
  if (s === '') return 0;
  let v;
  if (s.endsWith('%')) v = parseFloat(s) / 100;
  else if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    v = b ? a / b : NaN;
  } else v = Number(s);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

/** Normaliza uma linha para somar exatamente 1 (4 casas), resíduo de arredondamento no maior valor. */
export function normalizeRow(row, i) {
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum <= 1e-12) return row.map((_, j) => (j === i ? 1 : 0));
  const out = row.map((v) => Math.round((v / sum) * 1e4) / 1e4);
  const diff = 1 - out.reduce((a, b) => a + b, 0);
  const k = out.indexOf(Math.max(...out));
  out[k] = Math.round((out[k] + diff) * 1e4) / 1e4;
  return out;
}

/** Posições normalizadas (0..1): dupla lado a lado, trio em triângulo, o resto em círculo. */
export function autoLayout(n) {
  if (n === 2) return [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }];
  if (n === 3) return [{ x: 0.5, y: 0.04 }, { x: 0.14, y: 0.92 }, { x: 0.86, y: 0.92 }];
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 0.5 + 0.44 * Math.cos(a), y: 0.5 + 0.46 * Math.sin(a) };
  });
}

/** Renderiza todo [data-tex] dentro de root com KaTeX (fallback: texto puro). */
export function renderTex(root) {
  const k = window.katex;
  root.querySelectorAll('[data-tex]').forEach((n) => {
    if (!k) {
      n.textContent = n.dataset.tex;
      return;
    }
    try {
      k.render(n.dataset.tex, n, { throwOnError: false, displayMode: n.hasAttribute('data-display') });
    } catch {
      n.textContent = n.dataset.tex;
    }
  });
}

export const deepClone = (o) => JSON.parse(JSON.stringify(o));
