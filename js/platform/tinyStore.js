// Store mínimo para um laboratório: um estado, mutações com tags e assinantes.
// É o mesmo contrato do store do Laboratório de Markov (js/store.js), sem nada específico de cadeias:
// cada componente escuta só as tags que o afetam, e ninguém guarda cópia do estado.

/**
 * derive(state, tags) recalcula o que depende do estado editável antes de avisar os assinantes.
 * Pode acrescentar tags (por exemplo 'derived') para quem só se interessa pelo resultado.
 */
export function createStore(initial, derive) {
  const state = initial;
  const subscribers = new Set();
  derive?.(state, new Set(['init']));

  return {
    get: () => state,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    update(mutator, ...tags) {
      if (mutator) mutator(state);
      const t = new Set(tags);
      derive?.(state, t);
      for (const fn of subscribers) fn(state, t);
    },
  };
}
