// Caderno de teoria do laboratório de vetores: cada conceito explicado com os números que estão na tela.
// body(ctx) e math(ctx) devolvem HTML; ctx = { s, d } e tudo que vem de fora passa por escapeHtml.
import { num, texNum, escapeHtml } from '../util.js';
import { DOCS } from './engine.js';

const tex = (t, display = true) => `<span class="tex" data-tex="${t}"${display ? ' data-display' : ''}></span>`;
const vec = (v) => `(${num(v[0], 1)}; ${num(v[1], 1)})`;
const text = (doc) => `“${escapeHtml(doc.text)}”`;

export const VEC_TOPICS = ['Setas e números', 'Parecido ou diferente', 'Do brinquedo ao embedding', 'No trabalho'];

export const VEC_TIPS = {
  // ───────── Setas e números ─────────
  vetor: {
    topic: 'Setas e números',
    title: 'Vetor',
    body: ({ s }) => `<p><mark>Vetor</mark> é uma lista de números. Com dois números, ele é uma seta no plano: o primeiro diz quanto ela anda para o lado, o segundo quanto anda para cima.</p>
      <p>Neste laboratório A é ${vec(s.a)} e B é ${vec(s.b)}. Um vetor tem duas características que importam: <b>para onde aponta</b> e <b>quão comprido é</b>.</p>`,
  },
  norma: {
    topic: 'Setas e números',
    title: 'Tamanho (norma)',
    body: ({ s, d }) => `<p>O <mark>tamanho</mark> de uma seta, ou norma, é o comprimento dela, pelo teorema de Pitágoras. A mede <b>${num(d.pair.na, 2)}</b> e B mede <b>${num(d.pair.nb, 2)}</b>.</p>
      <p>Em texto, o tamanho costuma refletir coisas como o comprimento do documento ou quantas vezes ele repete o assunto, e não o quanto ele é relevante. Por isso nem sempre se quer que ele pese na comparação.</p>`,
    math: ({ s }) => tex(`|A| = \\sqrt{(${texNum(s.a[0], 1)})^2 + (${texNum(s.a[1], 1)})^2}`),
  },
  produto: {
    topic: 'Setas e números',
    title: 'Produto escalar',
    body: ({ s, d }) => `<p>O <mark>produto escalar</mark> multiplica as coordenadas correspondentes e soma: ${num(s.a[0], 1)} × ${num(s.b[0], 1)} + ${num(s.a[1], 1)} × ${num(s.b[1], 1)} = <b>${num(d.pair.dot, 2)}</b>.</p>
      <p>Ele é grande quando as setas apontam para o mesmo lado <em>e</em> são compridas; é zero quando são perpendiculares; e é negativo quando apontam para lados contrários. Mistura direção com tamanho, e isso tem consequência prática (veja “Cosseno”).</p>`,
    math: () => tex('A \\cdot B = a_1 b_1 + a_2 b_2 + \\dots + a_n b_n'),
  },

  // ───────── Parecido ou diferente ─────────
  cosseno: {
    topic: 'Parecido ou diferente',
    title: 'Cosseno',
    body: ({ d }) => `<p>O <mark>cosseno</mark> é o produto escalar dividido pelos dois tamanhos. Isso tira o tamanho da conta e deixa só a direção. Agora ele vale <b>${num(d.pair.cos, 2)}</b>, o que corresponde a um ângulo de <b>${num(d.pair.angle, 0)}°</b>.</p>
      <p>1 quer dizer “mesma direção”, 0 quer dizer “nada em comum” (perpendiculares) e −1 quer dizer “lados opostos”. É por isso que o cosseno é a medida de semelhança mais usada entre textos: um documento longo e um curto sobre o mesmo assunto dão 1.</p>`,
    math: () => tex('\\cos\\theta = \\dfrac{A \\cdot B}{|A|\\,|B|}'),
  },
  distancia: {
    topic: 'Parecido ou diferente',
    title: 'Distância em linha reta',
    body: ({ s }) => `<p>A <mark>distância</mark> mede quão longe estão as pontas das duas setas. Quanto menor, mais parecidos, ao contrário do cosseno, em que maior é melhor.</p>
      <p>Ela enxerga o tamanho: duas setas na mesma direção, uma curta e uma comprida, ficam <em>longe</em>. Veja no modo “Busca”: ${text(DOCS[0])} e ${text(DOCS[1])} apontam para o mesmo lado, mas a distância entre eles é de ${num(Math.hypot(DOCS[0].v[0] - DOCS[1].v[0], DOCS[0].v[1] - DOCS[1].v[1]), 1)}. ${s.mode === 'search' ? 'Compare as três medidas no seletor.' : ''}</p>`,
  },
  normalizar: {
    topic: 'Parecido ou diferente',
    title: 'Normalizar',
    body: () => `<p><mark>Normalizar</mark> é encolher ou esticar cada vetor até o tamanho 1, mantendo a direção. Depois disso, o produto escalar vira o cosseno e a distância deixa de depender do tamanho.</p>
      <p>É o que muitos sistemas de busca fazem ao guardar os vetores: assim podem usar a conta mais rápida, o produto escalar, sem cair na armadilha de premiar o texto mais comprido.</p>`,
    math: () => tex('\\hat{A} = \\dfrac{A}{|A|}'),
  },

  // ───────── Do brinquedo ao embedding ─────────
  embedding: {
    topic: 'Do brinquedo ao embedding',
    title: 'Embedding',
    body: () => `<p><mark>Embedding</mark> é um texto transformado em vetor, de modo que textos com significado parecido virem setas parecidas. Aqui cada um dos ${DOCS.length} textos virou 2 números.</p>
      <p>Um modelo de embeddings de verdade usa de algumas centenas a alguns milhares de números por texto, e ninguém dá nome às dimensões: elas surgem do treino. O que você viu aqui continua valendo; muda só o número de termos nas contas.</p>`,
  },
  busca: {
    topic: 'Do brinquedo ao embedding',
    title: 'Busca por significado',
    body: ({ s, d }) => `<p>Na <mark>busca por significado</mark>, a pergunta vira um vetor, é comparada com o vetor de cada documento, e voltam os mais parecidos. Sua consulta é ${vec(s.q)}; pelo cosseno, vence ${text(d.tops.cosine)}.</p>
      <p>Isso acha textos que falam da mesma coisa <em>sem ter nenhuma palavra em comum</em>, o que uma busca por palavras não faz. É a primeira metade de um RAG: recuperar os trechos certos para entregar ao modelo.</p>`,
  },
  limite: {
    topic: 'Do brinquedo ao embedding',
    title: 'Parecido não é verdadeiro',
    body: () => `<p>A busca devolve sempre o <em>mais parecido</em>, mesmo quando nada é parecido o bastante. Com um cosseno de 0,2 no primeiro lugar, o sistema ainda devolve alguma coisa, com a mesma cara de certeza.</p>
      <p>Por isso uma busca de verdade tem um limiar mínimo, e quem a usa mede o acerto com perguntas de resposta conhecida: o primeiro resultado é o esperado? Semelhança de significado também não garante que o texto esteja correto ou atualizado.</p>`,
  },

  // ───────── No trabalho ─────────
  trabalho: {
    topic: 'No trabalho',
    title: 'Onde isso aparece',
    body: () => `<p>Busca de chamados ou documentos parecidos, detecção de cadastros duplicados, agrupamento de reclamações por assunto e a recuperação de trechos num RAG usam a mesma conta que você acabou de mexer.</p>
      <p>Ao avaliar um fornecedor que promete “busca inteligente”, pergunte: qual medida de semelhança ele usa, os vetores são normalizados, qual o limiar mínimo e como ele mede o acerto?</p>`,
  },
};
