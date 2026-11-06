// Orquestra todas as análises a partir de chain.matrix (valores como o usuário digitou).
// Decisão de projeto: linhas que não somam 1 são tratadas como PESOS e normalizadas.
import { tarjan, classPeriod, reachability } from './graph.js';
import { stationaryOfClass, inverse } from './linalg.js';

export const EPS = 1e-9;
export const SUM_TOL = 1e-6;

export function rowStatusOf(sum) {
  if (Math.abs(sum - 1) <= SUM_TOL) return 'ok';
  return sum < 1 ? 'under' : 'over';
}

export function analyze(chain) {
  const M = chain.matrix;
  const n = M.length;

  const rowSums = M.map((r) => r.reduce((a, b) => a + (+b || 0), 0));
  const rowStatus = rowSums.map(rowStatusOf);

  // Matriz efetiva: linha / Σ. Linha toda zero → "estado sem saída" (self-loop implícito).
  const deadEnds = [];
  const P = M.map((r, i) => {
    const s = rowSums[i];
    if (s <= EPS) {
      deadEnds.push(i);
      return r.map((_, j) => (i === j ? 1 : 0));
    }
    return r.map((v) => (+v || 0) / s);
  });

  const adj = P.map((r) => {
    const a = [];
    r.forEach((v, j) => {
      if (v > EPS) a.push(j);
    });
    return a;
  });

  const sccs = tarjan(n, adj);
  const classOf = new Array(n);
  sccs.forEach((c, ci) => c.forEach((u) => (classOf[u] = ci)));
  const classes = sccs.map((members, ci) => ({
    index: ci,
    members,
    closed: members.every((u) => adj[u].every((v) => classOf[v] === ci)),
    period: classPeriod(members, adj),
  }));
  const closed = classes.filter((c) => c.closed);

  const absorbing = [];
  for (let i = 0; i < n; i++) if (P[i][i] >= 1 - EPS) absorbing.push(i);

  const isIrreducible = classes.length === 1;
  const period = isIrreducible ? classes[0].period : null;
  const isAperiodic = closed.every((c) => c.period === 1);
  const isErgodic = isIrreducible && period === 1;

  // Uma π por classe fechada; π global única ⇔ exatamente uma classe fechada.
  const closedStationary = closed.map((c) => {
    const local = stationaryOfClass(P, c.members);
    const pi = new Array(n).fill(0);
    if (local) c.members.forEach((u, k) => (pi[u] = Math.max(0, local[k])));
    return { classIndex: c.index, pi };
  });
  const stationary = closed.length === 1 ? closedStationary[0].pi : null;

  // Absorção: estados transitórios → classes fechadas. N = (I − Q)⁻¹, B = N·R, t = N·1.
  let absorption = null;
  const transient = classes
    .filter((c) => !c.closed)
    .flatMap((c) => c.members)
    .sort((a, b) => a - b);
  if (transient.length && closed.length) {
    const IQ = transient.map((u, r) => transient.map((v, c) => (r === c ? 1 : 0) - P[u][v]));
    const N = inverse(IQ);
    if (N) {
      const R = transient.map((u) => closed.map((c) => c.members.reduce((s, m) => s + P[u][m], 0)));
      const B = N.map((row) => closed.map((_, k) => row.reduce((s, v, j) => s + v * R[j][k], 0)));
      const expectedSteps = N.map((row) => row.reduce((a, b) => a + b, 0));
      absorption = { transient, targets: closed.map((c) => c.index), N, B, expectedSteps };
    }
  }

  const colSums = new Array(n).fill(0);
  P.forEach((r) => r.forEach((v, j) => (colSums[j] += v)));
  const isDoublyStochastic = colSums.every((s) => Math.abs(s - 1) < 1e-6);
  let isSymmetric = true;
  for (let i = 0; i < n && isSymmetric; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.abs(P[i][j] - P[j][i]) > 1e-6) {
        isSymmetric = false;
        break;
      }

  const edges = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (P[i][j] > EPS) edges.push({ i, j, p: P[i][j], raw: +M[i][j] || 0 });

  return {
    n,
    rowSums,
    rowStatus,
    allRowsOk: rowStatus.every((s) => s === 'ok'),
    deadEnds,
    effective: P,
    adj,
    classes,
    classOf,
    absorbing,
    isIrreducible,
    period,
    isAperiodic,
    isErgodic,
    stationary,
    closedStationary,
    absorption,
    colSums,
    isDoublyStochastic,
    isSymmetric,
    reach: reachability(n, adj),
    edges,
  };
}
