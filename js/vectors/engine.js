// Motor do laboratório de vetores: funções puras sobre listas de números.
// Sem tela, sem sorteio, sem armazenamento: é o que permite confiar nos números que aparecem.

export const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const norm = (a) => Math.sqrt(dot(a, a));
export const distance = (a, b) => norm(a.map((v, i) => v - b[i]));
export const isZero = (a) => norm(a) < 1e-12;

/** Mesma direção com tamanho 1. Um vetor nulo não tem direção: continua nulo. */
export const normalize = (a) => (isZero(a) ? a.map(() => 0) : a.map((v) => v / norm(a)));

/**
 * Cosseno do ângulo entre dois vetores. Com um vetor nulo não existe direção para comparar:
 * devolve 0 e a tela avisa. O limite em ±1 existe porque arredondamento pode dar 1,0000000000002.
 */
export function cosine(a, b) {
  if (isZero(a) || isZero(b)) return 0;
  return Math.max(-1, Math.min(1, dot(a, b) / (norm(a) * norm(b))));
}

export const angleDegrees = (a, b) => (Math.acos(cosine(a, b)) * 180) / Math.PI;

/** Cada medida diz se o melhor é o maior valor ou o menor: na distância, perto é melhor. */
export const METRICS = {
  cosine: { label: 'Cosseno', best: 'max', score: cosine },
  dot: { label: 'Produto escalar', best: 'max', score: dot },
  distance: { label: 'Distância', best: 'min', score: distance },
};

/**
 * Textos de brinquedo com duas dimensões. O eixo horizontal puxa para o lado fiscal (nota, imposto),
 * o vertical para o lado de cobrança (boleto, título). Textos de outros assuntos apontam para outros lados.
 * Dois deles, o 1 e o 2, falam do mesmo assunto e apontam para o mesmo lado; só o tamanho difere.
 * Em embeddings reais as dimensões não têm nome: aqui elas têm só para dar para enxergar.
 */
export const DOCS = [
  { id: 'nf-rejeitada', text: 'Nota fiscal rejeitada pela Sefaz', v: [4.2, 0.8] },
  { id: 'nfe-erro', text: 'NF-e com erro de validação', v: [2, 0.4] },
  { id: 'imposto', text: 'Imposto calculado errado na nota', v: [3, 1.6] },
  { id: 'boleto', text: 'Boleto vencido há trinta dias', v: [0.6, 3.8] },
  { id: 'titulo', text: 'Título em aberto do cliente', v: [1, 2.2] },
  { id: 'cobranca', text: 'Cobrança enviada por e-mail', v: [1.6, 1.8] },
  { id: 'estoque', text: 'Estoque abaixo do mínimo', v: [-1.8, 2.6] },
  { id: 'manutencao', text: 'Manutenção preventiva da máquina', v: [-3.4, 0.6] },
  { id: 'ferias', text: 'Escala de férias da equipe', v: [-2.6, -2] },
  { id: 'treino', text: 'Treinamento de integração', v: [-0.8, -3.2] },
];

/** Documentos do melhor ao pior para a consulta. Em empate, vem primeiro quem está antes na lista. */
export function rank(query, docs, metric) {
  const { score, best } = METRICS[metric];
  return docs
    .map((doc, index) => ({ ...doc, index, score: score(query, doc.v) }))
    .sort((x, y) => (best === 'max' ? y.score - x.score : x.score - y.score) || x.index - y.index)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export const topOf = (query, docs, metric) => rank(query, docs, metric)[0];
