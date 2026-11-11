// Modelo de linguagem por contagem: para cada contexto visto no texto, quantas vezes cada token veio depois.
// Com contexto de 1 token, é exatamente uma cadeia de Markov em que cada token é um estado.
// Sem dependências de interface: tudo aqui é função pura, coberta em tests/platform.test.html.

export const BOS = '⟨início⟩';
export const EOS = '⟨fim⟩';
export const MAX_ORDER = 3;
export const MAX_TEXT = 20000;
const SEP = '\u0001';

const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*|[,;:]/gu;

/**
 * Texto → frases → tokens. Cada frase vira uma sequência independente: o modelo aprende
 * onde uma frase começa e onde termina.
 * mode 'word': palavras em minúsculas (vírgula e afins contam como token).
 * mode 'char': cada letra é um token; o espaço aparece como ␣.
 */
export function tokenize(text, mode = 'word') {
  const clean = String(text ?? '').slice(0, MAX_TEXT).toLowerCase();
  const sentences = clean.split(/[.!?…\n\r]+/);
  const out = [];
  for (const sentence of sentences) {
    const tokens = mode === 'char' ? [...sentence.trim().replace(/\s+/g, ' ')].map((c) => (c === ' ' ? '␣' : c)) : sentence.match(WORD) || [];
    if (tokens.length) out.push(tokens);
  }
  return out;
}

const keyOf = (context) => context.join(SEP);

/** Do mais visto para o menos visto. No empate, o fim da frase perde: sem isso, com temperatura 0 a frase acabaria antes de dizer algo. */
const byCount = (a, b) => b[1] - a[1] || (a[0] === EOS) - (b[0] === EOS) || a[0].localeCompare(b[0], 'pt');

/**
 * Conta, para cada contexto de 0 a `order` tokens, o que veio depois.
 * Guardar os contextos mais curtos é o que permite recuar quando o contexto inteiro nunca foi visto.
 */
export function train(sequences, order = 1) {
  const n = Math.max(1, Math.min(MAX_ORDER, Math.round(order) || 1));
  const tables = Array.from({ length: n + 1 }, () => new Map());
  const vocab = new Map();
  let tokens = 0;
  for (const sequence of sequences) {
    const padded = [...new Array(n).fill(BOS), ...sequence, EOS];
    for (let i = n; i < padded.length; i++) {
      const next = padded[i];
      if (next !== EOS) {
        vocab.set(next, (vocab.get(next) || 0) + 1);
        tokens++;
      }
      for (let k = 0; k <= n; k++) {
        const key = keyOf(padded.slice(i - k, i));
        let row = tables[k].get(key);
        if (!row) tables[k].set(key, (row = new Map()));
        row.set(next, (row.get(next) || 0) + 1);
      }
    }
  }
  return {
    order: n,
    tables,
    tokens,
    sentences: sequences.length,
    // Do mais frequente para o mais raro; empate em ordem alfabética, para o resultado não depender da ordem do texto.
    vocab: [...vocab.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt')).map(([token]) => token),
  };
}

/** Os últimos `order` tokens que o modelo consegue enxergar, completando com o marcador de início. */
export function windowOf(model, text) {
  const padded = [...new Array(model.order).fill(BOS), ...text];
  return padded.slice(padded.length - model.order);
}

/**
 * O que o modelo viu depois deste contexto.
 * Devolve { counts: [[token, vezes]], total, used, wanted, context, backedOff }.
 * Se o contexto inteiro nunca apareceu, recua para um contexto mais curto; com `used` 0, o modelo
 * não reconheceu nada e responde só com a frequência geral dos tokens. É aí que ele inventa.
 */
export function nextCounts(model, text) {
  const window = windowOf(model, text);
  for (let k = model.order; k >= 0; k--) {
    const context = window.slice(window.length - k);
    const row = model.tables[k].get(keyOf(context));
    if (!row) continue;
    const counts = [...row.entries()].sort(byCount);
    return {
      counts,
      total: counts.reduce((sum, [, c]) => sum + c, 0),
      used: k,
      wanted: model.order,
      context,
      backedOff: k < model.order,
    };
  }
  return { counts: [], total: 0, used: 0, wanted: model.order, context: [], backedOff: true };
}

/** Quantos contextos diferentes o modelo guardou no tamanho pedido: é o número de "estados" da cadeia. */
export const contextsSeen = (model) => model.tables[model.order].size;

/**
 * Fração do texto gerado que é cópia do texto de treino: de cada janela de `size` tokens que
 * inclui algo gerado, quantas aparecem iguais no original. Perto de 1, o modelo está recitando;
 * perto de 0, combinando. `from` é onde termina o que a pessoa escreveu: janelas só com o começo
 * digitado não entram, porque não foi o modelo que as escreveu.
 */
export function copiedFraction(written, sequences, size = 4, from = 0) {
  const seen = new Set();
  for (const sequence of sequences) {
    for (let i = 0; i + size <= sequence.length; i++) seen.add(keyOf(sequence.slice(i, i + size)));
  }
  let windows = 0;
  let copied = 0;
  for (let i = Math.max(0, from - size + 1); i + size <= written.length; i++) {
    windows++;
    if (seen.has(keyOf(written.slice(i, i + size)))) copied++;
  }
  return windows ? copied / windows : null;
}
