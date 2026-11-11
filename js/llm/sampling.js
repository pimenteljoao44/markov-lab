// Do que o modelo contou até o token sorteado: temperatura, top-k, top-p e o sorteio em si.
// São os mesmos botões de qualquer LLM comercial; aqui eles agem sobre uma tabela pequena o bastante para conferir à mão.
import { nextCounts, EOS } from './ngram.js';

export const MAX_TEMPERATURE = 2;

/**
 * Contagens → distribuição do próximo token, na ordem do mais para o menos provável.
 * Cada item: { token, base, p, kept }
 *   base  chance pela contagem pura (o que o texto diz)
 *   p     chance depois dos ajustes (de onde o sorteio realmente sai)
 *   kept  false se top-k ou top-p tirou o token do sorteio
 *
 * Temperatura T reescala assim: p ∝ base^(1/T). É a mesma conta do softmax(logits / T) dos LLMs,
 * com logit = ln(base). T = 0 é o caso-limite: sobra só o mais provável.
 */
export function distribution(counts, { temperature = 1, topK = 0, topP = 1 } = {}) {
  const total = counts.reduce((sum, [, c]) => sum + c, 0);
  if (!total) return [];
  const items = counts.map(([token, c]) => ({ token, base: c / total, p: 0, kept: true }));

  if (temperature <= 0) {
    items.forEach((item, i) => {
      item.p = i === 0 ? 1 : 0;
      item.kept = i === 0;
    });
    return items;
  }

  // Em log para não estourar: base^(1/T) com T pequeno gera números fora do alcance do ponto flutuante.
  const logs = items.map((item) => Math.log(item.base) / temperature);
  const top = Math.max(...logs);
  const weights = logs.map((l) => Math.exp(l - top));
  const sum = weights.reduce((a, b) => a + b, 0);
  items.forEach((item, i) => (item.p = weights[i] / sum));

  // As contagens já vêm em ordem; a temperatura não muda a ordem, só a distância entre os tokens.
  if (topK > 0) items.forEach((item, i) => (item.kept = i < topK));
  const renormalize = () => {
    const keptSum = items.reduce((s, item) => s + (item.kept ? item.p : 0), 0);
    items.forEach((item) => (item.p = item.kept ? item.p / keptSum : 0));
  };
  renormalize();
  if (topP < 1) {
    let cumulative = 0;
    for (const item of items) {
      if (!item.kept) continue;
      // O token que cruza o limite ainda entra: o núcleo é o menor conjunto que soma pelo menos top-p.
      if (cumulative >= topP - 1e-12) item.kept = false;
      cumulative += item.p;
    }
    renormalize();
  }
  return items;
}

/** Entropia em bits: 0 quando só há uma escolha possível; log₂(n) quando n escolhas são igualmente prováveis. */
export function entropy(dist) {
  return dist.reduce((h, { p }) => (p > 0 ? h - p * Math.log2(p) : h), 0);
}

/** "Escolhas efetivas": entre quantas opções igualmente prováveis o modelo parece estar escolhendo. */
export const effectiveChoices = (dist) => 2 ** entropy(dist);

/** Sorteia um item da distribuição com um gerador entre 0 e 1. */
export function sample(dist, rand) {
  let r = rand();
  let last = null;
  for (const item of dist) {
    if (!item.kept || item.p <= 0) continue;
    last = item;
    r -= item.p;
    if (r < 0) return item;
  }
  return last; // erro de arredondamento na última casa: fica com o último candidato válido
}

/** Um passo de geração: o que o modelo viu, a distribuição ajustada e o token sorteado. */
export function step(model, text, settings, rand) {
  const seen = nextCounts(model, text);
  const dist = distribution(seen.counts, settings);
  const pick = sample(dist, rand);
  return pick ? { token: pick.token, p: pick.p, base: pick.base, used: seen.used, backedOff: seen.backedOff } : null;
}

/** Gera até `max` tokens ou até o modelo sortear o fim da frase. Devolve só os passos novos. */
export function generate(model, text, settings, rand, max = 30) {
  const steps = [];
  const current = text.slice();
  for (let i = 0; i < max; i++) {
    const next = step(model, current, settings, rand);
    if (!next) break;
    steps.push(next);
    if (next.token === EOS) break;
    current.push(next.token);
  }
  return steps;
}
