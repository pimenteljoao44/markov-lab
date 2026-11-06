// Álgebra linear mínima para matrizes pequenas (N ≤ 10).

/** Resolve A·x = b por Gauss-Jordan com pivoteamento parcial. Retorna null se singular. */
export function solve(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Inversa por Gauss-Jordan. Retorna null se singular. */
export function inverse(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    for (let k = 0; k < 2 * n; k++) M[c][k] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f !== 0) for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row) => row.slice(n));
}

/**
 * Distribuição estacionária de uma classe FECHADA (as linhas restritas à classe somam 1).
 * Resolve π(P_C − I) = 0 trocando a última equação por Σπ = 1.
 */
export function stationaryOfClass(P, members) {
  const k = members.length;
  if (k === 1) return [1];
  const A = [];
  for (let r = 0; r < k; r++) {
    A.push(members.map((_, c) => P[members[c]][members[r]] - (r === c ? 1 : 0)));
  }
  A[k - 1] = new Array(k).fill(1);
  const b = new Array(k).fill(0);
  b[k - 1] = 1;
  return solve(A, b);
}

/** μ_{t+1} = μ_t · P */
export function evolve(mu, P) {
  const n = mu.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const m = mu[i];
    if (!m) continue;
    const row = P[i];
    for (let j = 0; j < n; j++) out[j] += m * row[j];
  }
  return out;
}

/** Distância de variação total ½·Σ|a − b| */
export const tvDistance = (a, b) => 0.5 * a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
