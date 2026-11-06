// Perguntas que qualquer modelo responde: "onde estarei?" e "quanto tempo até chegar?".
import { solve, evolve } from './linalg.js';
import { reachability } from './graph.js';

const ONE = 1 - 1e-9;

/** Distribuição depois de n passos saindo de `start`: a linha `start` de Pⁿ. */
export function distributionAfter(P, start, n) {
  let mu = P.map((_, i) => (i === start ? 1 : 0));
  for (let k = 0; k < n; k++) mu = evolve(mu, P);
  return mu;
}

/**
 * Chance de um dia chegar em `target` e tempo médio até a primeira chegada.
 * prob[i]: chance de alcançar target partindo de i.
 * mean[i]: passos médios; Infinity quando existe chance de nunca chegar.
 * returnProb/returnMean: o mesmo para sair de target e voltar a ele.
 */
export function hittingStats(P, target) {
  const n = P.length;
  const adj = P.map((r) => r.flatMap((v, j) => (v > 1e-12 ? [j] : [])));
  const reach = reachability(n, adj);

  const prob = new Array(n).fill(0);
  prob[target] = 1;
  const T = [];
  for (let i = 0; i < n; i++) if (i !== target && reach[i][target]) T.push(i);
  if (T.length) {
    const A = T.map((u, r) => T.map((w, c) => (r === c ? 1 : 0) - P[u][w]));
    const x = solve(A, T.map((u) => P[u][target]));
    if (x) T.forEach((u, k) => (prob[u] = Math.min(1, Math.max(0, x[k]))));
  }

  // A média só é finita onde a chegada é certa; desses estados não há como escapar.
  const mean = new Array(n).fill(Infinity);
  mean[target] = 0;
  const S = T.filter((u) => prob[u] >= ONE);
  if (S.length) {
    const A = S.map((u, r) => S.map((w, c) => (r === c ? 1 : 0) - P[u][w]));
    const h = solve(A, S.map(() => 1));
    if (h) S.forEach((u, k) => (mean[u] = h[k]));
  }

  let returnProb = 0;
  for (let k = 0; k < n; k++) returnProb += P[target][k] * prob[k];
  let returnMean = Infinity;
  if (returnProb >= ONE) {
    returnMean = 1;
    for (let k = 0; k < n; k++) if (k !== target && P[target][k] > 0) returnMean += P[target][k] * mean[k];
  }
  return { prob, mean, returnProb: Math.min(1, returnProb), returnMean };
}
