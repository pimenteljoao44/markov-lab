// Teoria dos grafos aplicada à cadeia: classes comunicantes, período, alcançabilidade.

/** Componentes fortemente conexas (Tarjan). Cada componente = uma classe comunicante. */
export function tarjan(n, adj) {
  let index = 0;
  const idx = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const onStack = new Array(n).fill(false);
  const stack = [];
  const out = [];

  function strong(v) {
    idx[v] = low[v] = index++;
    stack.push(v);
    onStack[v] = true;
    for (const w of adj[v]) {
      if (idx[w] === -1) {
        strong(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], idx[w]);
      }
    }
    if (low[v] === idx[v]) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        comp.push(w);
      } while (w !== v);
      out.push(comp.sort((a, b) => a - b));
    }
  }

  for (let v = 0; v < n; v++) if (idx[v] === -1) strong(v);
  return out.sort((a, b) => a[0] - b[0]);
}

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

/**
 * Período de uma classe: mdc de (nível[u] + 1 − nível[v]) para toda aresta u→v interna,
 * onde nível = distância BFS a partir de um representante.
 * Retorna null quando a classe não tem ciclo (estado transitório isolado, sem self-loop).
 */
export function classPeriod(members, adj) {
  const inClass = new Set(members);
  const level = new Map([[members[0], 0]]);
  const queue = [members[0]];
  while (queue.length) {
    const u = queue.shift();
    for (const v of adj[u]) {
      if (inClass.has(v) && !level.has(v)) {
        level.set(v, level.get(u) + 1);
        queue.push(v);
      }
    }
  }
  let g = 0;
  for (const u of members) {
    for (const v of adj[u]) if (inClass.has(v)) g = gcd(g, level.get(u) + 1 - level.get(v));
  }
  return g || null;
}

/** reach[i][j] = existe caminho (≥ 0 passos) de i até j. */
export function reachability(n, adj) {
  const R = [];
  for (let s = 0; s < n; s++) {
    const seen = new Array(n).fill(false);
    seen[s] = true;
    const stack = [s];
    while (stack.length) {
      const u = stack.pop();
      for (const v of adj[u]) {
        if (!seen[v]) {
          seen[v] = true;
          stack.push(v);
        }
      }
    }
    R.push(seen);
  }
  return R;
}
