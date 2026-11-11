// Ponte para o Laboratório de Markov: o modelo de 1 token de contexto, reescrito como cadeia de estados.
import { estimateChain } from '../math/estimate.js';
import { makeChain } from '../models/chain.js';
import { encodeShare } from '../models/share.js';

export const END_STATE = 'fim da frase';
/** O diagrama fica legível com poucos potes: os tokens mais raros se juntam em "Outros". */
export const BRIDGE_STATES = 8;

/** Cada token frequente vira um estado; o fim da frase vira um estado sem saída. */
export function chainFromSequences(sequences, title) {
  const { labels, matrix } = estimateChain(sequences.map((seq) => [...seq, END_STATE]), { maxStates: BRIDGE_STATES });
  return makeChain(labels, matrix, {
    meta: {
      title: `Tokens de “${title}”`.slice(0, 60),
      about: 'Modelo de linguagem com contexto de 1 token, visto como cadeia de Markov. Cada pote é um token.',
      unit: 'frase',
      step: 'token',
      custom: true,
    },
  });
}

/** Endereço que abre a cadeia no Sandbox do Laboratório de Markov. */
export function bridgeUrl(sequences, title) {
  const { meta, states, matrix } = chainFromSequences(sequences, title);
  return `markov.html${encodeShare({ meta, states: states.map(({ label }) => ({ label })), matrix: matrix.map((row) => row.map((v) => +v.toPrecision(6))) })}`;
}
